// Initialize map variables
let map;
let markers = [];
let pathLayer;
let routeLine;
let mapInitialized = false;
let tspPath = null;

// Predefined locations with latitude & longitude
const predefinedLocations = {
    "Academic Block": [13.263018, 80.027427],
    "Library": [13.262621, 80.026525],
    "Canteen": [13.262856, 80.028401],
    "Pond": [13.262198, 80.027673],
    "AVV Gym for Girls": [13.262141, 80.026830],
    "Chennai": [13.080917019874969, 80.26358605588356],
    "Delhi": [28.675015901626473, 77.21675859763418],
    "Mumbai": [19.07598369140625, 72.877685546875],
    "Kolkata": [22.5726455078125, 88.3638671875],
    "Hyderabad": [17.432607421875, 78.4736328125],
    "Bengaluru": [12.971593933105469, 77.5945263671875],
    "Junior Girls Hostel": [13.261993, 80.026421],
    "Junior Boys Hostel": [13.261805, 80.028076],
    "Lab Block": [13.262768, 80.028147],
    "Mechanical Lab": [13.261205, 80.027488],
    "Volley Ball Court": [13.261009, 80.027530],
    "Basket Ball Court": [13.260909, 80.027256],
    "Senior Girls Hostel": [13.260658, 80.028184],
    "Senior Boys Hostel": [13.260550, 80.027272],
    "2nd Year Boys Hostel": [13.259570, 80.026694],
    "Amrita Indoor Stadium": [13.259880, 80.025990],
    "AVV Gym for Boys": [13.260146, 80.026143],
    "AVV Ground": [13.259708, 80.025416],
    "Amrita Vishwa Vidyapeetham": [13.2630, 80.0274]
};

// Initialize the map when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Initialize AOS animation library
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
    }
});

// Initialize the Leaflet map
function initMap() {
    if (mapInitialized) return;
    
    try {
        // Create map centered at Amrita Vishwa Vidyapeetham
        map = L.map('map').setView([13.2630, 80.0274], 17);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Create a layer group for the path
        pathLayer = L.layerGroup().addTo(map);
        
        // Add markers for all predefined locations
        addMarkersToMap();
        
        // Try to get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    
                    // Add a marker for user's location
                    const userMarker = L.marker([userLocation.latitude, userLocation.longitude], {
                        icon: L.divIcon({
                            className: 'custom-marker user-marker',
                            html: '<i class="fas fa-user-circle"></i>',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    }).addTo(map);
                    
                    userMarker.bindPopup('<b>Your Location</b>').openPopup();
                },
                (error) => {
                    console.error('Error getting user location:', error);
                }
            );
        }
        
        mapInitialized = true;
        console.log("Map initialized successfully");
    } catch (error) {
        console.error("Error initializing map:", error);
        showNotification("Error initializing map. Please try again.", "error");
    }
}

// Add markers to the map for each location
function addMarkersToMap() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Add markers for all predefined locations
    Object.entries(predefinedLocations).forEach(([name, coords]) => {
        const marker = L.marker(coords).addTo(map);
        marker.bindPopup(`<b>${name}</b>`);
        markers.push(marker);
    });
}

// Calculate distance between two coordinates in kilometers
function calculateDistance(coord1, coord2) {
    const lat1 = coord1[0];
    const lon1 = coord1[1];
    const lat2 = coord2[0];
    const lon2 = coord2[1];
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Solve Traveling Salesman Problem using Nearest Neighbor algorithm
function solveTSP() {
    // Clear any existing TSP path
    if (tspPath) {
        map.removeLayer(tspPath);
    }
    
    // Get campus locations only (exclude cities)
    const campusLocations = {};
    const citiesToExclude = ["Chennai", "Delhi", "Mumbai", "Kolkata", "Hyderabad", "Bengaluru"];
    
    Object.entries(predefinedLocations).forEach(([name, coords]) => {
        if (!citiesToExclude.includes(name)) {
            campusLocations[name] = coords;
        }
    });
    
    // Convert locations to array for easier processing
    const locations = Object.entries(campusLocations).map(([name, coords]) => ({
        name,
        coords
    }));
    
    // Start from Amrita Vishwa Vidyapeetham
    const startLocation = locations.find(loc => loc.name === "Amrita Vishwa Vidyapeetham");
    const startIndex = locations.indexOf(startLocation);
    
    // Initialize variables for TSP
    const visited = new Array(locations.length).fill(false);
    const tour = [startIndex];
    visited[startIndex] = true;
    
    // Nearest neighbor algorithm
    while (tour.length < locations.length) {
        let lastIndex = tour[tour.length - 1];
        let lastLocation = locations[lastIndex];
        let minDistance = Infinity;
        let nearestIndex = -1;
        
        // Find nearest unvisited location
        for (let i = 0; i < locations.length; i++) {
            if (!visited[i]) {
                const distance = calculateDistance(lastLocation.coords, locations[i].coords);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestIndex = i;
                }
            }
        }
        
        // Add nearest location to tour
        if (nearestIndex !== -1) {
            tour.push(nearestIndex);
            visited[nearestIndex] = true;
        }
    }
    
    // Add starting point to complete the tour
    tour.push(startIndex);
    
    // Create polylines for the tour
    const pathCoordinates = tour.map(index => locations[index].coords);
    
    tspPath = L.polyline(pathCoordinates, {
        color: 'var(--primary-color)',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 10',
        lineJoin: 'round'
    }).addTo(map);
    
    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < tour.length - 1; i++) {
        const from = locations[tour[i]].coords;
        const to = locations[tour[i + 1]].coords;
        totalDistance += calculateDistance(from, to);
    }
    
    // Show notification with total distance
    showNotification(`TSP route created! Total distance: ${totalDistance.toFixed(2)} km`, "success");
    
    // Fit map to show the entire path
    map.fitBounds(tspPath.getBounds().pad(0.1));
}

// Populate location dropdowns
function populateLocationDropdowns() {
    const startSelect = document.getElementById('start-location');
    const endSelect = document.getElementById('end-location');
    
    if (!startSelect || !endSelect) return;
    
    // Clear existing options
    startSelect.innerHTML = '<option value="">Select start location</option>';
    endSelect.innerHTML = '<option value="">Select destination</option>';
    
    // Add options for each location
    Object.keys(predefinedLocations).forEach((name, index) => {
        const startOption = document.createElement('option');
        startOption.value = name;
        startOption.textContent = name;
        startSelect.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = name;
        endOption.textContent = name;
        endSelect.appendChild(endOption);
    });
}

// Set up event listeners
function setupEventListeners() {
    // Find path button
    const findPathBtn = document.getElementById('find-path-btn');
    if (findPathBtn) {
        findPathBtn.addEventListener('click', findShortestPath);
    }
    
    // Explore button
    const exploreBtn = document.getElementById('explore-btn');
    const locateBtn = document.getElementById('locate-btn');
    const mapElement = document.getElementById('map');

    if (exploreBtn && mapElement) {
        exploreBtn.addEventListener('click', function() {
            console.log("Explore button clicked");
            
            // Make sure the map is visible
            mapElement.style.display = 'block';
            
            // Initialize map if it doesn't exist
            if (!mapInitialized) {
                console.log("Initializing map...");
                initMap();
                
                // Force map to refresh
                setTimeout(() => {
                    if (map) {
                        map.invalidateSize();
                        // Solve TSP and show connections
                        solveTSP();
                    }
                }, 300);
            } else {
                // If map already exists, just make sure it's visible and refreshed
                console.log("Map already initialized, refreshing...");
                if (map) {
                    map.invalidateSize();
                    // Clear any existing route
                    if (routeLine) {
                        map.removeLayer(routeLine);
                    }
                    // Solve TSP and show connections
                    solveTSP();
                }
            }
        });
    } else {
        console.error("Explore button or map element not found");
    }

    if (locateBtn) {
        locateBtn.addEventListener('click', function() {
            console.log("Locate button clicked");
            
            // Make sure the map is visible
            if (mapElement) {
                mapElement.style.display = 'block';
            } else {
                console.error("Map element not found");
                return;
            }
            
            // Initialize map if it doesn't exist
            if (!mapInitialized) {
                console.log("Initializing map for locate...");
                initMap();
                
                // Wait for map to initialize before focusing
                setTimeout(() => {
                    console.log("Focusing on Amrita Vishwa Vidyapeetham...");
                    focusOnLocation("Amrita Vishwa Vidyapeetham");
                    // Force map to refresh
                    if (map) map.invalidateSize();
                    
                    // Remove any TSP path if it exists
                    if (tspPath) {
                        map.removeLayer(tspPath);
                    }
                }, 500);
            } else {
                // If map already exists, just focus on the location
                console.log("Map already initialized, focusing on location...");
                if (map) {
                    map.invalidateSize();
                    focusOnLocation("Amrita Vishwa Vidyapeetham");
                    
                    // Remove any TSP path if it exists
                    if (tspPath) {
                        map.removeLayer(tspPath);
                    }
                }
            }
        });
    } else {
        console.error("Locate button not found");
    }
    
    // Add event listeners to navigate buttons in event cards
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('navigate-btn')) {
            const venueName = e.target.getAttribute('data-venue-name');
            navigateToVenue(venueName);
        }
    });
    
    // Add route finding form if it exists
    const routeForm = document.getElementById('route-form');
    if (routeForm) {
        populateLocationDropdowns();
        
        const findRouteBtn = document.getElementById('findRouteBtn');
        if (findRouteBtn) {
            findRouteBtn.addEventListener('click', function() {
                const startLocation = document.getElementById('start-location').value;
                const endLocation = document.getElementById('end-location').value;
                
                if (!startLocation || !endLocation) {
                    showNotification("Please select both start and destination locations.", "error");
                    return;
                }
                
                if (startLocation === endLocation) {
                    showNotification("Start and destination cannot be the same.", "error");
                    return;
                }
                
                fetchRouteFromAPI(startLocation, endLocation);
            });
        }
    }
}

// Find the shortest path between two locations
function findShortestPath() {
    const startLocation = document.getElementById('start-location').value;
    const endLocation = document.getElementById('end-location').value;
    
    if (!startLocation || !endLocation) {
        showNotification('Please select both start and destination locations.', 'error');
        return;
    }
    
    if (startLocation === endLocation) {
        showNotification('Start and destination cannot be the same.', 'error');
        return;
    }
    
    fetchRouteFromAPI(startLocation, endLocation);
}

// Fetch route from OpenRouteService API
function fetchRouteFromAPI(start, end) {
    console.log(`Fetching route from ${start} to ${end}`);
    
    // Make sure the map is initialized
    if (!mapInitialized) {
        initMap();
        setTimeout(() => fetchRouteFromAPI(start, end), 500);
        return;
    }
    
    // Get coordinates for start and end locations
    const startCoords = predefinedLocations[start];
    const endCoords = predefinedLocations[end];
    
    if (!startCoords || !endCoords) {
        showNotification("Invalid locations. Please select valid locations.", "error");
        return;
    }
    
    // Show loading notification
    showNotification("Finding the best route...", "info");
    
    // Format coordinates for API request
    const startCoordsFormatted = [startCoords[1], startCoords[0]].join(",");
    const endCoordsFormatted = [endCoords[1], endCoords[0]].join(",");
    
    // API key for OpenRouteService
    const apiKey = "5b3ce3597851110001cf6248c0943ad6dce547e59c20450a5741cbaa";
    
    // Construct API URL
    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${startCoordsFormatted}&end=${endCoordsFormatted}`;
    
    // Fetch route from API
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Clear existing route
            if (routeLine && map) {
                map.removeLayer(routeLine);
            }
            
            // Clear TSP path if it exists
            if (tspPath) {
                map.removeLayer(tspPath);
            }
            
            // Extract route coordinates
            const routeCoords = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            
            // Create polyline for route
            routeLine = L.polyline(routeCoords, { 
                color: 'var(--primary-color)',
                weight: 5,
                opacity: 0.7,
                lineJoin: 'round',
                className: 'path-line'
            }).addTo(map);
            
            // Fit map to show the entire route
            map.fitBounds(routeLine.getBounds().pad(0.1));
            
            // Extract distance and duration
            const distance = (data.features[0].properties.summary.distance / 1000).toFixed(2);
            const duration = (data.features[0].properties.summary.duration / 60).toFixed(1);
            
            // Show route info
            const routeInfo = document.getElementById('route-info');
            if (routeInfo) {
                routeInfo.innerHTML = `
                    <div class="route-summary">
                        <p><strong>Distance:</strong> ${distance} km</p>
                        <p><strong>Duration:</strong> ${duration} minutes walking</p>
                    </div>
                `;
                routeInfo.style.display = 'block';
            }
            
            // Extract step-by-step directions
            const steps = data.features[0].properties.segments[0].steps;
            const routeDirections = document.getElementById('route-directions');
            
            if (routeDirections) {
                let directionsList = "<h3>Directions:</h3><ul class='directions-list'>";
                
                steps.forEach((step, index) => {
                    directionsList += `
                        <li>
                            <strong>Step ${index + 1}:</strong> 
                            ${step.instruction} 
                            <span class="step-distance">(${(step.distance / 1000).toFixed(2)} km)</span>
                        </li>
                    `;
                });
                
                directionsList += "</ul>";
                routeDirections.innerHTML = directionsList;
                routeDirections.style.display = 'block';
            }
            
            // Show success notification
            showNotification(`Route found from ${start} to ${end}!`, "success");
        })
        .catch(error => {
            console.error("Error fetching route:", error);
            showNotification("Error fetching route. Please try again.", "error");
        });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="close-btn"><i class="fas fa-times"></i></button>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Add event listener to close button
    notification.querySelector('.close-btn').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Navigate to venue
function navigateToVenue(venueName) {
    console.log("Navigate to venue called for:", venueName);
    
    // Make sure the map is visible
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error("Map element not found");
        return;
    }
    
    mapElement.style.display = 'block';
    
    // Initialize map if needed
    if (!mapInitialized) {
        console.log("Initializing map for navigation...");
        initMap();
        
        // Wait for map to initialize before navigating
        setTimeout(() => {
            console.log("Navigating to venue...");
            focusOnLocation(venueName);
            // Force map to refresh
            if (map) map.invalidateSize();
            
            // Remove any TSP path if it exists
            if (tspPath) {
                map.removeLayer(tspPath);
            }
        }, 500);
    } else {
        console.log("Map already initialized, navigating to venue...");
        if (map) {
            map.invalidateSize();
            focusOnLocation(venueName);
            
            // Remove any TSP path if it exists
            if (tspPath) {
                map.removeLayer(tspPath);
            }
        }
    }
    
    // Scroll to map section
    setTimeout(() => {
        try {
            const mapSection = document.getElementById('map-section');
            if (mapSection) {
                console.log("Scrolling to map section...");
                mapSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        } catch (error) {
            console.error("Error scrolling to map section:", error);
        }
    }, 300);
}

// Make navigateToVenue function globally accessible
window.navigateToVenue = navigateToVenue;

// Focus on a specific location by name
function focusOnLocation(locationName) {
    console.log("Focus on location called for:", locationName);
    
    // Get coordinates for the location
    const coords = predefinedLocations[locationName];
    
    if (!coords) {
        console.error("Location not found:", locationName);
        showNotification("Location not found. Please try another name.", "error");
        return;
    }
    
    console.log("Found location coordinates:", coords);
    
    // Center map on the location
    map.setView(coords, 18);
    
    // Create a temporary marker
    const marker = L.marker(coords).addTo(map);
    marker.bindPopup(`<b>${locationName}</b>`).openPopup();
    
    // Remove the marker after a delay
    setTimeout(() => {
        map.removeLayer(marker);
    }, 5000);
} 
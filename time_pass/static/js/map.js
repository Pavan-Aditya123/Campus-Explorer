// Initialize map variables
let map;
let markers = [];
let pathLayer;
let routeLine;
let mapInitialized = false;
let tspPath = null;
let currentRouteRequest = null; // To cancel previous requests

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
    if (mapInitialized) {
        console.log("Map already initialized");
        return;
    }
    
    try {
        // Create map centered at Amrita Vishwa Vidyapeetham
        map = L.map('map', {
            preferCanvas: true, // Use Canvas renderer for better performance
            maxZoom: 19,
            minZoom: 15
        }).setView([13.2630, 80.0274], 17);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Create a layer group for the path
        pathLayer = L.layerGroup().addTo(map);
        
        // Add markers for all predefined locations
        addMarkersToMap();
        
        // Try to get user's location with better accuracy options
        if (navigator.geolocation) {
            const geoOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0 // Don't use cached position
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Log accuracy for debugging
                    console.log("Location accuracy:", position.coords.accuracy, "meters");
                    
                    const userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    
                    // Add a marker for user's location with accuracy indicator
                    const userMarker = L.marker([userLocation.latitude, userLocation.longitude], {
                        icon: L.divIcon({
                            className: 'custom-marker user-marker',
                            html: '<div class="user-location-marker"><i class="fas fa-user-circle"></i></div>',
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        })
                    }).addTo(map);
                    
                    // Show accuracy information in popup
                    let accuracyText = "High accuracy";
                    if (userLocation.accuracy > 100) {
                        accuracyText = "Low accuracy (±" + Math.round(userLocation.accuracy) + "m)";
                    } else if (userLocation.accuracy > 30) {
                        accuracyText = "Medium accuracy (±" + Math.round(userLocation.accuracy) + "m)";
                    } else {
                        accuracyText = "High accuracy (±" + Math.round(userLocation.accuracy) + "m)";
                    }
                    
                    userMarker.bindPopup(`<b>Your Location</b><br>${accuracyText}`).openPopup();
                    
                    // Optional: draw accuracy circle
                    if (userLocation.accuracy > 10) {
                        const accuracyCircle = L.circle([userLocation.latitude, userLocation.longitude], {
                            radius: userLocation.accuracy,
                            color: '#4285f4',
                            fillColor: '#4285f4',
                            fillOpacity: 0.1,
                            weight: 1
                        }).addTo(map);
                    }
                    
                    // Pan to user location with appropriate zoom based on accuracy
                    let zoomLevel = 17;
                    if (userLocation.accuracy > 500) zoomLevel = 15;
                    else if (userLocation.accuracy > 100) zoomLevel = 16;
                    
                    map.setView([userLocation.latitude, userLocation.longitude], zoomLevel);
                },
                (error) => {
                    console.error('Error getting user location:', error);
                    let errorMsg = "Unable to get your location.";
                    
                    if (error.code === 1) {
                        errorMsg = "Location access denied. Please enable location services.";
                    } else if (error.code === 2) {
                        errorMsg = "Unable to determine your location. Check your device settings.";
                    } else if (error.code === 3) {
                        errorMsg = "Location request timed out. Please try again.";
                    }
                    
                    showNotification(errorMsg, "error");
                },
                geoOptions
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
    // Show a loading overlay on the map
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    
    console.log("Starting TSP calculation...");
    
    const loadingOverlay = L.DomUtil.create('div', 'map-loading-overlay tsp-loading');
    loadingOverlay.innerHTML = '<div class="loading-spinner"></div><p>Calculating optimal TSP route...</p>';
    mapElement.appendChild(loadingOverlay);
    
    // Clear any existing TSP path
    if (tspPath) {
        map.removeLayer(tspPath);
    }
    
    // Remove any existing TSP side panel
    const existingPanel = document.getElementById('tsp-side-panel');
    if (existingPanel) {
        existingPanel.remove();
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
    
    // Create the side panel that will show the progress
    const sidePanel = document.createElement('div');
    sidePanel.id = 'tsp-side-panel';
    sidePanel.className = 'tsp-side-panel';
    sidePanel.innerHTML = `
        <div class="tsp-side-panel-header">
            <div class="tsp-panel-title">
                <i class="fas fa-route"></i>
                <h3>TSP Route Calculator</h3>
            </div>
            <button id="close-tsp-panel" class="tsp-close-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="tsp-side-panel-body">
            <div class="tsp-calculation-status">
                <div class="tsp-progress-container">
                    <div class="tsp-progress-bar"></div>
                </div>
                <p class="tsp-status-text">Finding optimal route...</p>
                <div class="tsp-counting-stats">
                    <div class="tsp-counting-stat">
                        <div class="tsp-stat-label">Locations</div>
                        <div class="tsp-stat-value" id="tsp-location-count">0/${locations.length}</div>
                    </div>
                    <div class="tsp-counting-stat">
                        <div class="tsp-stat-label">Distance</div>
                        <div class="tsp-stat-value" id="tsp-current-distance">0.00 km</div>
                    </div>
                </div>
            </div>
            <div class="tsp-result-container" style="display: none;">
                <div class="tsp-distance-display">
                    <div class="tsp-distance-circle">
                        <svg viewBox="0 0 100 100">
                            <circle class="tsp-progress-bg" cx="50" cy="50" r="40"></circle>
                            <circle class="tsp-progress" cx="50" cy="50" r="40"></circle>
                            <text x="50" y="45" text-anchor="middle" dominant-baseline="middle" class="tsp-distance-value">0</text>
                            <text x="50" y="62" text-anchor="middle" dominant-baseline="middle" class="tsp-distance-unit">km</text>
                        </svg>
                    </div>
                </div>
                <div class="tsp-summary-stats">
                    <div class="tsp-summary-stat">
                        <div class="tsp-stat-icon"><i class="fas fa-map-marker-alt"></i></div>
                        <div class="tsp-stat-info">
                            <div class="tsp-stat-label">Locations</div>
                            <div class="tsp-stat-value tsp-locations-value">0</div>
                        </div>
                    </div>
                    <div class="tsp-summary-stat">
                        <div class="tsp-stat-icon"><i class="fas fa-walking"></i></div>
                        <div class="tsp-stat-info">
                            <div class="tsp-stat-label">Walking Time</div>
                            <div class="tsp-stat-value tsp-time-value">0 min</div>
                        </div>
                    </div>
                </div>
                <div class="tsp-locations-list">
                    <h4><i class="fas fa-list-ol"></i> Route Order</h4>
                    <ul class="tsp-route-list" id="tsp-route-list"></ul>
                </div>
                <div class="tsp-actions">
                    <button id="tsp-recalculate" class="tsp-action-btn">
                        <i class="fas fa-redo-alt"></i> Recalculate
                    </button>
                    <button id="tsp-download" class="tsp-action-btn">
                        <i class="fas fa-download"></i> Save Route
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add the panel to the document
    document.body.appendChild(sidePanel);
    
    // Debug log
    console.log("TSP Side panel created:", sidePanel);
    
    // Add animation to show the panel - important: forced layout to ensure visibility
    console.log("Adding visible class to side panel");
    // Force browser to process the DOM changes before applying the visible class
    void sidePanel.offsetWidth;
    sidePanel.classList.add('visible');
    
    // Add event listener to close button
    document.getElementById('close-tsp-panel').addEventListener('click', () => {
        sidePanel.classList.remove('visible');
        setTimeout(() => {
            sidePanel.remove();
        }, 300);
    });
    
    // Delay the actual calculation to allow the panel animation to complete
    setTimeout(() => {
        // Start the TSP calculation with a visual step-by-step approach
        const progressBar = document.querySelector('.tsp-progress-bar');
        const locationCounter = document.getElementById('tsp-location-count');
        const distanceCounter = document.getElementById('tsp-current-distance');
        
        // Function to update progress UI
        function updateProgress(completedSteps, totalSteps, currentDistance) {
            const progress = (completedSteps / totalSteps) * 100;
            progressBar.style.width = `${progress}%`;
            locationCounter.textContent = `${completedSteps}/${totalSteps}`;
            distanceCounter.textContent = `${currentDistance.toFixed(2)} km`;
        }
        
        // Initialize progress
        updateProgress(1, locations.length, 0);
        
        // Use setTimeout to create a visual delay between steps
        function findNextLocation(currentIndex) {
            if (tour.length >= locations.length) {
                // All locations visited, complete the tour
                finalizeTSPRoute();
                return;
            }
            
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
                // Calculate total distance so far
                let currentTotalDistance = 0;
                for (let i = 0; i < tour.length; i++) {
                    if (i > 0) {
                        const from = locations[tour[i-1]].coords;
                        const to = locations[tour[i]].coords;
                        currentTotalDistance += calculateDistance(from, to);
                    }
                }
                
                // Add the new step distance
                currentTotalDistance += minDistance;
                
                // Add to tour and mark as visited
                tour.push(nearestIndex);
                visited[nearestIndex] = true;
                
                // Update UI
                updateProgress(tour.length, locations.length, currentTotalDistance);
                
                // Continue with next location after a delay
                setTimeout(() => findNextLocation(currentIndex + 1), 200);
            } else {
                finalizeTSPRoute();
            }
        }
        
        // Start the visual step-by-step process
        setTimeout(() => findNextLocation(1), 500);
        
        // Function to finalize the TSP route calculation
        function finalizeTSPRoute() {
            // Add starting point to complete the tour
            tour.push(startIndex);
            
            // Create path coordinates
            const pathCoordinates = tour.map(index => locations[index].coords);
            
            // Calculate total distance
            let totalDistance = 0;
            for (let i = 0; i < tour.length - 1; i++) {
                const from = locations[tour[i]].coords;
                const to = locations[tour[i + 1]].coords;
                totalDistance += calculateDistance(from, to);
            }
            
            // Generate tour details for display
            const tourDetails = [];
            for (let i = 0; i < tour.length; i++) {
                tourDetails.push(locations[tour[i]].name);
            }
            
            // Remove loading overlay
            if (loadingOverlay.parentNode) {
                loadingOverlay.parentNode.removeChild(loadingOverlay);
            }
            
            // Switch to results view
            document.querySelector('.tsp-calculation-status').style.display = 'none';
            document.querySelector('.tsp-result-container').style.display = 'block';
            
            // Create the TSP path with animated drawing
            tspPath = L.polyline([], {
                color: '#34a853',
                weight: 5,
                opacity: 0.9,
                dashArray: '10, 10',
                lineJoin: 'round',
                lineCap: 'round',
                className: 'tsp-path'
            }).addTo(map);
            
            // Add click handler to the TSP path
            tspPath.on('click', function(e) {
                // Calculate walking time (assume 5km/h walking speed)
                const walkingSpeed = 5; // km/h
                const walkingTime = Math.ceil((totalDistance / walkingSpeed) * 60); // minutes
                
                // Create popup content
                const popupContent = `
                <div class="enhanced-tsp-popup-content">
                    <div class="tsp-popup-header">
                        <i class="fas fa-route"></i>
                        <h4>TSP Route Details</h4>
                    </div>
                    <div class="tsp-popup-body">
                        <div class="tsp-stat">
                            <div class="tsp-stat-icon">
                                <i class="fas fa-map-marked-alt"></i>
                            </div>
                            <div class="tsp-stat-info">
                                <div class="tsp-stat-label">Total Distance</div>
                                <div class="tsp-stat-value">${totalDistance.toFixed(2)} km</div>
                            </div>
                        </div>
                        <div class="tsp-stat">
                            <div class="tsp-stat-icon">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <div class="tsp-stat-info">
                                <div class="tsp-stat-label">Locations</div>
                                <div class="tsp-stat-value">${tour.length - 1} places</div>
                            </div>
                        </div>
                        <div class="tsp-stat">
                            <div class="tsp-stat-icon">
                                <i class="fas fa-walking"></i>
                            </div>
                            <div class="tsp-stat-info">
                                <div class="tsp-stat-label">Walking Time</div>
                                <div class="tsp-stat-value">${walkingTime} min</div>
                            </div>
                        </div>
                    </div>
                    <div class="tsp-popup-actions">
                        <button id="show-tsp-details" class="tsp-popup-btn">
                            <i class="fas fa-info-circle"></i> Show Details
                        </button>
                        <button id="recalc-tsp-btn" class="tsp-popup-btn">
                            <i class="fas fa-redo-alt"></i> Recalculate
                        </button>
                    </div>
                </div>
                `;
                
                // Create popup
                const popup = L.popup({
                    className: 'enhanced-tsp-popup',
                    maxWidth: 300,
                    minWidth: 240
                })
                .setLatLng(e.latlng)
                .setContent(popupContent)
                .openOn(map);
                
                // Add event listeners for buttons
                setTimeout(() => {
                    document.getElementById('show-tsp-details').addEventListener('click', function() {
                        // Find the TSP side panel and make it visible
                        const sidePanel = document.getElementById('tsp-side-panel');
                        if (sidePanel) {
                            sidePanel.classList.add('visible');
                            map.closePopup(popup);
                        } else {
                            showNotification("TSP details not available. Please recalculate the route.", "error");
                        }
                    });
                    
                    document.getElementById('recalc-tsp-btn').addEventListener('click', function() {
                        map.closePopup(popup);
                        // Re-run TSP calculation
                        solveTSP();
                    });
                }, 100);
            });
            
            // Set initial dashOffset for animation
            const pathElement = tspPath.getElement();
            if (pathElement) {
                pathElement.style.strokeDasharray = '10, 10';
                pathElement.style.strokeDashoffset = '1000';
                pathElement.style.animation = 'dash 5s linear forwards';
            }
            
            // Add only start and end markers
            const startLocation = locations[startIndex];
            const startMarker = L.marker(startLocation.coords, {
                icon: L.divIcon({
                    html: '<div class="tsp-endpoint start-point"><i class="fas fa-flag-checkered"></i></div>',
                    className: 'tsp-marker',
                    iconSize: [40, 40]
                })
            }).addTo(map);
            
            startMarker.bindTooltip(`Start/End: ${startLocation.name}`, {
                permanent: false,
                direction: 'top',
                className: 'tsp-endpoint-tooltip'
            });
            
            // Calculate walking time (assume 5km/h walking speed)
            const walkingSpeed = 5; // km/h
            const walkingTime = Math.ceil((totalDistance / walkingSpeed) * 60); // minutes
            
            // Update the final stats
            document.querySelector('.tsp-locations-value').textContent = `${tour.length - 1} places`;
            document.querySelector('.tsp-time-value').textContent = `${walkingTime} min`;
            
            // Populate route list
            const routeList = document.getElementById('tsp-route-list');
            routeList.innerHTML = tourDetails.map((name, index) => `
                <li class="tsp-route-item" style="animation-delay: ${index * 0.05}s">
                    <span class="tsp-location-number">${index + 1}</span>
                    <span class="tsp-location-name">${name}</span>
                    ${index < tourDetails.length - 1 ? 
                        `<span class="tsp-path-indicator">
                            <i class="fas fa-long-arrow-alt-down"></i>
                        </span>` : ''}
                </li>
            `).join('');
            
            // Animate the TSP path
            let pathIndex = 0;
            const animateTsp = setInterval(() => {
                if (pathIndex < pathCoordinates.length) {
                    const currentPath = pathCoordinates.slice(0, pathIndex + 1);
                    tspPath.setLatLngs(currentPath);
                    pathIndex++;
                    
                    // Adjust map view to follow the path
                    if (pathIndex % 3 === 0 && pathIndex < pathCoordinates.length - 5) {
                        map.panTo(pathCoordinates[pathIndex]);
                    }
                } else {
                    clearInterval(animateTsp);
                    
                    // Fit bounds to show the entire path
                    map.fitBounds(L.latLngBounds(pathCoordinates).pad(0.1));
                    
                    // Animate the distance counter
                    const distanceValue = document.querySelector('.tsp-distance-value');
                    const tspProgress = document.querySelector('.tsp-progress');
                    const circumference = 2 * Math.PI * 40;
                    
                    tspProgress.style.strokeDasharray = `${circumference} ${circumference}`;
                    tspProgress.style.strokeDashoffset = circumference;
                    
                    let currentDistance = 0;
                    const targetDistance = parseFloat(totalDistance.toFixed(2));
                    const duration = 1500; // ms
                    const startTime = performance.now();
                    
                    function animateDistance(timestamp) {
                        const elapsed = timestamp - startTime;
                        if (elapsed < duration) {
                            currentDistance = Math.min(targetDistance * (elapsed / duration), targetDistance);
                            distanceValue.textContent = currentDistance.toFixed(1);
                            
                            // Animate progress circle
                            const progress = currentDistance / targetDistance;
                            const progressOffset = circumference - (progress * circumference);
                            tspProgress.style.strokeDashoffset = progressOffset;
                            
                            requestAnimationFrame(animateDistance);
                        } else {
                            distanceValue.textContent = targetDistance.toFixed(1);
                            tspProgress.style.strokeDashoffset = 0;
                        }
                    }
                    
                    requestAnimationFrame(animateDistance);
                }
            }, 50);
            
            // Set up event listeners for action buttons
            document.getElementById('tsp-recalculate').addEventListener('click', function() {
                sidePanel.classList.remove('visible');
                setTimeout(() => {
                    sidePanel.remove();
                    // Re-run TSP calculation
                    solveTSP();
                }, 300);
            });
            
            document.getElementById('tsp-download').addEventListener('click', function() {
                // Create route info text
                let routeInfo = "TSP ROUTE INFORMATION\n";
                routeInfo += "======================\n\n";
                routeInfo += `Total Distance: ${totalDistance.toFixed(2)} km\n`;
                routeInfo += `Estimated Walking Time: ${walkingTime} minutes\n`;
                routeInfo += `Locations: ${tour.length - 1}\n\n`;
                routeInfo += "Route Order:\n";
                
                tourDetails.forEach((name, index) => {
                    routeInfo += `${index + 1}. ${name}\n`;
                });
                
                // Create downloadable file
                const blob = new Blob([routeInfo], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tsp_route_info.txt';
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 0);
                
                showNotification("TSP route information downloaded!", "success");
            });
            
            // Show success notification
            showNotification(`TSP route created! Total distance: ${totalDistance.toFixed(2)} km`, "success");
        }
    }, 400);
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
            
            // Scroll to map section
            const mapSection = document.getElementById('map-section');
            if (mapSection) {
                mapSection.scrollIntoView({ behavior: 'smooth' });
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

// Clear all map layers except the base tile layer
function clearMapLayers() {
    if (!map) return;
    
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }
    
    if (tspPath) {
        map.removeLayer(tspPath);
        tspPath = null;
    }
}

// Navigate to venue with optimized performance
function navigateToVenue(venueName) {
    console.log("Navigate to venue called for:", venueName);
    
    // Cancel any ongoing route request
    if (currentRouteRequest) {
        currentRouteRequest.abort();
    }
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        showNotification("Map element not found", "error");
        return;
    }
    
    mapElement.style.display = 'block';
    
    if (!predefinedLocations[venueName]) {
        showNotification(`Location not found: ${venueName}`, "error");
        return;
    }
    
    const venueCoords = predefinedLocations[venueName];
    
    if (!mapInitialized) {
        initMap();
        // Wait for map to initialize before continuing
        setTimeout(() => navigateToVenue(venueName), 1000);
        return;
    }
    
    // Scroll to map section immediately
    const mapSection = document.getElementById('map-section');
    if (mapSection) {
        mapSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Clear existing layers before adding new ones
    clearMapLayers();
    
    // Show loading animation on map
    const loadingOverlay = L.DomUtil.create('div', 'map-loading-overlay');
    loadingOverlay.innerHTML = '<div class="loading-spinner"></div><p>Finding the best route to ' + venueName + '...</p>';
    mapElement.appendChild(loadingOverlay);
    
    // Always use a point on campus for testing purposes
    // This ensures the application works even if geolocation fails
    const defaultUserCoords = predefinedLocations["Academic Block"];
    
    // Add marker for venue immediately for better UX
    const venueMarker = L.marker(venueCoords, {
        icon: L.divIcon({
            html: '<div class="venue-location-marker"><i class="fas fa-map-marker-alt"></i></div>',
            className: 'venue-marker-container',
            iconSize: [40, 40]
        })
    }).addTo(map);
    
    venueMarker.bindTooltip(venueName, {
        permanent: true,
        direction: 'top',
        className: 'venue-location-tooltip'
    });
    
    // Fit map to venue immediately
    map.setView(venueCoords, 17);
    
    if (navigator.geolocation) {
        // Show "Getting your location" notification
        showNotification("Getting your current location...", "info");
        
        // Use more accurate geolocation options
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0  // Don't use cached position
        };
        
        // Try to get the user's actual location with a shorter timeout
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    // Get precise user location
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    const userCoords = [userLat, userLng];
                    
                    console.log("Detected user location:", userCoords);
                    
                    // IMPORTANT: For the Amrita campus demo, we'll use either:
                    // 1. The user's actual location if it's within ~1km of campus
                    // 2. A default location on campus otherwise
                    let effectiveUserCoords;
                    
                    // Check if user is close to campus (within 1km of Amrita Vishwa Vidyapeetham)
                    const campusMainCoords = predefinedLocations["Amrita Vishwa Vidyapeetham"];
                    const distanceToCampus = calculateDistance(
                        userCoords, 
                        campusMainCoords
                    );
                    
                    console.log("Distance to campus:", distanceToCampus, "km");
                    
                    // If user is within ~2km of campus, use their actual location
                    // Otherwise, use Academic Block as the starting point
                    if (distanceToCampus <= 2) {
                        effectiveUserCoords = userCoords;
                        console.log("Using actual user location (close to campus)");
                    } else {
                        // For demo: If not on campus, use Academic Block as starting location
                        effectiveUserCoords = predefinedLocations["Academic Block"];
                        console.log("Using campus location (user is far from campus)");
                        showNotification("For demo purposes: Using campus location as starting point.", "info");
                    }
                    
                    // Add marker for user's location
                    const userMarker = L.marker(effectiveUserCoords, {
                        icon: L.divIcon({
                            html: '<div class="user-location-marker"><i class="fas fa-user-circle"></i></div>',
                            className: 'user-marker-container',
                            iconSize: [40, 40]
                        })
                    }).addTo(map);
                    
                    userMarker.bindTooltip('Your Location', {
                        permanent: true,
                        direction: 'top',
                        className: 'user-location-tooltip'
                    });
                    
                    // Show temporary direct line between points while loading the real route
                    const tempLine = L.polyline([effectiveUserCoords, venueCoords], {
                        color: '#dadce0',
                        weight: 3,
                        dashArray: '5, 10',
                        opacity: 0.6
                    }).addTo(map);
                    
                    // Fit bounds to show both markers
                    map.fitBounds(L.latLngBounds([effectiveUserCoords, venueCoords]).pad(0.3));
                    
                    // Format coordinates for API - Note that the order is longitude,latitude for ORS API
                    const startCoordsFormatted = `${effectiveUserCoords[1]},${effectiveUserCoords[0]}`;
                    const endCoordsFormatted = `${venueCoords[1]},${venueCoords[0]}`;
                    
                    showNotification("Finding the best walking route...", "info");
                    
                    // Create AbortController for fetch
                    const controller = new AbortController();
                    currentRouteRequest = controller;
                    
                    // Use OpenRouteService API to calculate an actual walking route along roads and paths
                    const apiKey = "5b3ce3597851110001cf6248c0943ad6dce547e59c20450a5741cbaa";
                    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${startCoordsFormatted}&end=${endCoordsFormatted}`;
                    
                    console.log("Requesting route from API:", url);
                    
                    const response = await fetch(url, { signal: controller.signal });
                    
                    if (!response.ok) {
                        throw new Error(`Route API request failed with status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log("Route data received:", data);
                    
                    // Remove temporary line
                    map.removeLayer(tempLine);
                    
                    // Remove loading overlay
                    if (loadingOverlay.parentNode) {
                        loadingOverlay.parentNode.removeChild(loadingOverlay);
                    }
                    
                    // Draw route with optimized styling and animation
                    const routeCoords = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                    
                    // Create the polyline with initial empty array
                    routeLine = L.polyline([], {
                        color: '#4285f4',
                        weight: 7,
                        opacity: 1,
                        smoothFactor: 1,
                        lineCap: 'round',
                        lineJoin: 'round',
                        className: 'route-path'
                    }).addTo(map);
                    
                    // Calculate the route length for adjusting animation speed
                    const routeLength = routeCoords.length;
                    const animationSpeed = Math.max(5, Math.min(30, Math.floor(200 / routeLength))); // Speed between 5-30ms
                    
                    // Animate the path drawing
                    let i = 0;
                    const animateInterval = setInterval(() => {
                        if (i < routeCoords.length) {
                            const currentPath = routeCoords.slice(0, i + 1);
                            routeLine.setLatLngs(currentPath);
                            i++;
                            
                            // While drawing, adjust map view to follow the path
                            if (i % 5 === 0 && i < routeCoords.length - 10) {
                                map.panTo(routeCoords[i]);
                            }
                        } else {
                            clearInterval(animateInterval);
                            
                            // Fit bounds with padding after animation completes
                            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
                            
                            // Update route information
                            const routeInfo = updateRouteInfo(data, venueName);
                            
                            // Show floating route card with details
                            showRouteCard(data, venueName, effectiveUserCoords, venueCoords);
                            
                            showNotification(`Route to ${venueName} found! ${routeInfo.distance} km, ${routeInfo.duration} min walk`, "success");
                        }
                    }, animationSpeed); // Adjust timing based on route length
                    
                    // Add click event to the path
                    routeLine.on('click', function() {
                        // Get a point in the middle of the path for the popup
                        const middlePoint = routeCoords[Math.floor(routeCoords.length / 2)];
                        
                        // Show enhanced route popup
                        const distance = (data.features[0].properties.summary.distance / 1000).toFixed(2);
                        const duration = Math.ceil(data.features[0].properties.summary.duration / 60);
                        
                        const popupContent = `
                            <div class="enhanced-route-popup">
                                <div class="route-popup-header">
                                    <i class="fas fa-walking"></i>
                                    <h4>Walking Route</h4>
                                </div>
                                <div class="route-popup-body">
                                    <div class="route-popup-destination">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <div class="destination-name">${venueName}</div>
                                    </div>
                                    <div class="route-popup-stats">
                                        <div class="route-stat">
                                            <i class="fas fa-route"></i>
                                            <div class="route-stat-value">${distance} km</div>
                                        </div>
                                        <div class="route-stat">
                                            <i class="fas fa-clock"></i>
                                            <div class="route-stat-value">${duration} minutes</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="route-popup-action">
                                    <button class="route-details-btn" id="route-details-btn">
                                        <i class="fas fa-info-circle"></i> Show Details
                                    </button>
                                </div>
                            </div>
                        `;
                        
                        const popup = L.popup({
                            className: 'enhanced-route-popup-container',
                            maxWidth: 300
                        })
                        .setLatLng(middlePoint)
                        .setContent(popupContent)
                        .openOn(map);
                        
                        // Add event listener to the details button
                        setTimeout(() => {
                            document.getElementById('route-details-btn').addEventListener('click', function() {
                                // Close the popup
                                map.closePopup(popup);
                                
                                // Show the route card if it's hidden
                                const routeCard = document.getElementById('floating-route-card');
                                if (routeCard) {
                                    routeCard.classList.add('visible');
                                } else {
                                    // Recreate if not found
                                    showRouteCard(data, venueName, effectiveUserCoords, venueCoords);
                                }
                            });
                        }, 100);
                    });
                    
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log('Route request cancelled');
                        return;
                    }
                    
                    // Remove loading overlay if it exists
                    if (loadingOverlay.parentNode) {
                        loadingOverlay.parentNode.removeChild(loadingOverlay);
                    }
                    
                    console.error("Error fetching route:", error);
                    showNotification("Error finding route. Showing direct path instead.", "error");
                    
                    // Use default location on campus in case of error
                    const fallbackUserCoords = defaultUserCoords;
                    
                    // Add user marker for fallback location
                    const userMarker = L.marker(fallbackUserCoords, {
                        icon: L.divIcon({
                            html: '<div class="user-location-marker"><i class="fas fa-user-circle"></i></div>',
                            className: 'user-marker-container',
                            iconSize: [40, 40]
                        })
                    }).addTo(map);
                    
                    userMarker.bindTooltip('Your Location (Campus)', {
                        permanent: true,
                        direction: 'top',
                        className: 'user-location-tooltip'
                    });
                    
                    // Fallback to direct path
                    showDirectPath(fallbackUserCoords, venueCoords, venueName);
                }
            },
            (error) => {
                // Remove loading overlay if it exists
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
                
                console.error("Location error:", error);
                let errorMsg = "Unable to get your location. Using campus location instead.";
                
                showNotification(errorMsg, "info");
                
                // Use default location on campus as fallback
                const fallbackUserCoords = defaultUserCoords;
                
                // Add user marker for fallback location
                const userMarker = L.marker(fallbackUserCoords, {
                    icon: L.divIcon({
                        html: '<div class="user-location-marker"><i class="fas fa-user-circle"></i></div>',
                        className: 'user-marker-container',
                        iconSize: [40, 40]
                    })
                }).addTo(map);
                
                userMarker.bindTooltip('Your Location (Campus)', {
                    permanent: true,
                    direction: 'top',
                    className: 'user-location-tooltip'
                });
                
                // Format coordinates for API - Note that the order is longitude,latitude for ORS API
                const startCoordsFormatted = `${fallbackUserCoords[1]},${fallbackUserCoords[0]}`;
                const endCoordsFormatted = `${venueCoords[1]},${venueCoords[0]}`;
                
                // Use OpenRouteService API with fallback coordinates
                const apiKey = "5b3ce3597851110001cf6248c0943ad6dce547e59c20450a5741cbaa";
                const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${startCoordsFormatted}&end=${endCoordsFormatted}`;
                
                // Fetch route from API using fallback location
                fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        // Remove loading overlay
                        if (loadingOverlay.parentNode) {
                            loadingOverlay.parentNode.removeChild(loadingOverlay);
                        }
                        
                        // Extract route coordinates
                        const routeCoords = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                        
                        // Create the polyline
                        routeLine = L.polyline(routeCoords, {
                            color: '#4285f4',
                            weight: 7,
                            opacity: 1,
                            smoothFactor: 1,
                            className: 'route-path'
                        }).addTo(map);
                        
                        // Fit bounds to show the entire route
                        map.fitBounds(routeLine.getBounds().pad(0.2));
                        
                        // Update route information
                        const routeInfo = updateRouteInfo(data, venueName);
                        
                        // Show floating route card with details
                        showRouteCard(data, venueName, fallbackUserCoords, venueCoords);
                        
                        showNotification(`Campus route to ${venueName} found! ${routeInfo.distance} km, ${routeInfo.duration} min walk`, "success");
                    })
                    .catch(error => {
                        console.error("Error fetching route:", error);
                        showNotification("Error finding route. Showing direct path.", "error");
                        
                        // Fallback to direct path
                        showDirectPath(fallbackUserCoords, venueCoords, venueName);
                    });
            },
            geoOptions
        );
    } else {
        // Browser doesn't support geolocation - use campus location
        if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
        
        showNotification("Geolocation not supported. Using campus location.", "info");
        
        // Use default location on campus as fallback
        const fallbackUserCoords = defaultUserCoords;
        
        // Add user marker for fallback location
        const userMarker = L.marker(fallbackUserCoords, {
            icon: L.divIcon({
                html: '<div class="user-location-marker"><i class="fas fa-user-circle"></i></div>',
                className: 'user-marker-container',
                iconSize: [40, 40]
            })
        }).addTo(map);
        
        userMarker.bindTooltip('Your Location (Campus)', {
            permanent: true,
            direction: 'top',
            className: 'user-location-tooltip'
        });
        
        // Show direct path
        showDirectPath(fallbackUserCoords, venueCoords, venueName);
    }
}

// Show floating route card with details
function showRouteCard(data, venueName, userCoords, venueCoords) {
    // Remove existing route card if any
    const existingCard = document.getElementById('floating-route-card');
    if (existingCard) {
        existingCard.remove();
    }
    
    const distance = (data.features[0].properties.summary.distance / 1000).toFixed(2);
    const duration = Math.ceil(data.features[0].properties.summary.duration / 60);
    const steps = data.features[0].properties.segments[0].steps;
    
    // Create the route card
    const routeCard = document.createElement('div');
    routeCard.id = 'floating-route-card';
    routeCard.className = 'floating-route-card';
    
    // Create the header
    routeCard.innerHTML = `
        <div class="route-card-header">
            <div class="route-card-title">
                <i class="fas fa-directions"></i>
                <h3>Route to ${venueName}</h3>
            </div>
            <button class="route-card-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="route-card-body">
            <div class="route-summary">
                <div class="route-stat">
                    <div class="route-stat-icon"><i class="fas fa-ruler"></i></div>
                    <div class="route-stat-info">
                        <div class="route-stat-label">Distance</div>
                        <div class="route-stat-value">${distance} km</div>
                    </div>
                </div>
                <div class="route-stat">
                    <div class="route-stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="route-stat-info">
                        <div class="route-stat-label">Walking Time</div>
                        <div class="route-stat-value">${duration} minutes</div>
                    </div>
                </div>
            </div>
            <div class="route-directions">
                <h4><i class="fas fa-list"></i> Directions</h4>
                <div class="directions-list">
                    ${steps.map((step, index) => `
                        <div class="direction-step">
                            <div class="step-number">${index + 1}</div>
                            <div class="step-details">
                                <div class="step-instruction">${step.instruction}</div>
                                <div class="step-distance">${(step.distance / 1000).toFixed(2)} km</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(routeCard);
    
    // Add event listeners
    routeCard.querySelector('.route-card-close').addEventListener('click', () => {
        routeCard.classList.add('slide-out');
        setTimeout(() => {
            routeCard.remove();
        }, 300);
    });
    
    // Animate in
    setTimeout(() => {
        routeCard.classList.add('visible');
    }, 100);
    
    return routeCard;
}

// Update route information in the UI
function updateRouteInfo(data, venueName) {
    const distance = (data.features[0].properties.summary.distance / 1000).toFixed(2);
    const duration = Math.ceil(data.features[0].properties.summary.duration / 60);
    const steps = data.features[0].properties.segments[0].steps;
    
    // Update route info panel
    const routeInfo = document.getElementById('route-info');
    if (routeInfo) {
        routeInfo.style.display = 'block';
        routeInfo.innerHTML = `
            <h4 style="margin-top: 0; color: #4285f4;">Route Information</h4>
            <p><strong>To:</strong> ${venueName}</p>
            <p><strong>Distance:</strong> ${distance} km</p>
            <p><strong>Time:</strong> ${duration} min (walking)</p>
        `;
    }
    
    // Update directions panel
    const routeDirections = document.getElementById('route-directions');
    if (routeDirections) {
        let directionsList = `<h4 style="color: #4285f4;">Directions</h4><ul class="directions-list">`;
        steps.forEach((step, index) => {
            directionsList += `
                <li class="direction-step">
                    <span class="step-number">${index + 1}</span>
                    <span class="step-instruction">${step.instruction}</span>
                    <span class="step-distance">${(step.distance / 1000).toFixed(2)} km</span>
                </li>
            `;
        });
        directionsList += '</ul>';
        routeDirections.innerHTML = directionsList;
        routeDirections.style.display = 'block';
    }
    
    // Return route info for use elsewhere
    return {
        distance,
        duration,
        steps
    };
}

// Show direct path when route finding fails
function showDirectPath(userCoords, venueCoords, venueName) {
    const directPath = L.polyline([userCoords, venueCoords], {
        color: '#4285f4',
        weight: 3,
        opacity: 0.6,
        dashArray: '8, 8'
    }).addTo(map);
    
    map.fitBounds(directPath.getBounds(), { padding: [50, 50] });
    
    const directDistance = calculateDistance(
        userCoords[0], userCoords[1],
        venueCoords[0], venueCoords[1]
    );
    
    const routeInfo = document.getElementById('route-info');
    if (routeInfo) {
        routeInfo.style.display = 'block';
        routeInfo.innerHTML = `
            <h4 style="margin-top: 0; color: #4285f4;">Direct Route</h4>
            <p><strong>To:</strong> ${venueName}</p>
            <p><strong>Direct Distance:</strong> ${directDistance.toFixed(2)} km</p>
            <p><strong>Est. Time:</strong> ${Math.ceil(directDistance * 15)} min</p>
            <p class="warning">* Actual walking distance may vary</p>
        `;
    }
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
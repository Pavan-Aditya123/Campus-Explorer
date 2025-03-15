// Initialize map variables
let map;
let markers = [];
let pathLayer;
let locations = [];

// Initialize the map when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchLocations();
    setupEventListeners();
});

// Initialize the Leaflet map
function initMap() {
    // Create map centered at a default location (will be adjusted based on data)
    map = L.map('map').setView([40.7128, -74.0060], 16);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Create a layer group for the path
    pathLayer = L.layerGroup().addTo(map);
}

// Fetch locations from the API
async function fetchLocations() {
    try {
        const response = await fetch('/api/locations');
        locations = await response.json();
        
        // Populate location dropdowns
        populateLocationDropdowns();
        
        // Add markers to the map
        addMarkersToMap();
        
        // Fit map bounds to show all markers
        if (markers.length > 0) {
            const markerGroup = L.featureGroup(markers);
            map.fitBounds(markerGroup.getBounds().pad(0.1));
        }
    } catch (error) {
        console.error('Error fetching locations:', error);
        showNotification('Failed to load locations. Please try again later.', 'error');
    }
}

// Add markers to the map for each location
function addMarkersToMap() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Add new markers
    locations.forEach(location => {
        const marker = createMarker(location);
        markers.push(marker);
    });
}

// Create a marker for a location
function createMarker(location) {
    // Create custom icon
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<i class="fas fa-map-marker-alt"></i>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });
    
    // Create marker
    const marker = L.marker([location.latitude, location.longitude], { icon }).addTo(map);
    
    // Create popup content
    const popupContent = `
        <div class="popup-header">
            <h3>${location.name}</h3>
        </div>
        <div class="popup-body">
            <p>${location.description || 'No description available.'}</p>
            <button class="btn primary-btn set-start-btn" data-id="${location.id}">Set as Start</button>
            <button class="btn primary-btn set-end-btn" data-id="${location.id}">Set as Destination</button>
        </div>
    `;
    
    // Bind popup to marker
    marker.bindPopup(popupContent, {
        className: 'custom-popup',
        maxWidth: 300
    });
    
    // Add event listener to popup content after it's opened
    marker.on('popupopen', () => {
        // Set start location
        document.querySelectorAll('.set-start-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const locationId = e.target.getAttribute('data-id');
                document.getElementById('start-location').value = locationId;
                marker.closePopup();
            });
        });
        
        // Set end location
        document.querySelectorAll('.set-end-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const locationId = e.target.getAttribute('data-id');
                document.getElementById('end-location').value = locationId;
                marker.closePopup();
            });
        });
    });
    
    return marker;
}

// Populate location dropdowns
function populateLocationDropdowns() {
    const startSelect = document.getElementById('start-location');
    const endSelect = document.getElementById('end-location');
    
    // Clear existing options (except the first one)
    startSelect.innerHTML = '<option value="">Select start location</option>';
    endSelect.innerHTML = '<option value="">Select destination</option>';
    
    // Add options for each location
    locations.forEach(location => {
        const startOption = document.createElement('option');
        startOption.value = location.id;
        startOption.textContent = location.name;
        startSelect.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = location.id;
        endOption.textContent = location.name;
        endSelect.appendChild(endOption);
    });
}

// Set up event listeners
function setupEventListeners() {
    // Find path button
    const findPathBtn = document.getElementById('find-path-btn');
    findPathBtn.addEventListener('click', findShortestPath);
    
    // Location search
    const searchInput = document.getElementById('location-search');
    const searchBtn = document.getElementById('search-btn');
    
    searchBtn.addEventListener('click', () => searchLocations(searchInput.value));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchLocations(searchInput.value);
        }
    });
}

// Search for locations
function searchLocations(query) {
    if (!query.trim()) return;
    
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '';
    
    // Filter locations based on the query
    const filteredLocations = locations.filter(location => 
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        (location.description && location.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    if (filteredLocations.length === 0) {
        searchResults.innerHTML = '<p class="no-results">No locations found.</p>';
        return;
    }
    
    // Display search results
    filteredLocations.forEach(location => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.textContent = location.name;
        
        resultItem.addEventListener('click', () => {
            // Center map on the selected location
            map.setView([location.latitude, location.longitude], 18);
            
            // Find the marker and open its popup
            const marker = markers.find(m => m.getLatLng().lat === location.latitude && m.getLatLng().lng === location.longitude);
            if (marker) {
                marker.openPopup();
            }
            
            // Clear search results
            searchResults.innerHTML = '';
            document.getElementById('location-search').value = '';
        });
        
        searchResults.appendChild(resultItem);
    });
}

// Find the shortest path between two locations
async function findShortestPath() {
    const startId = document.getElementById('start-location').value;
    const endId = document.getElementById('end-location').value;
    
    if (!startId || !endId) {
        showNotification('Please select both start and destination locations.', 'error');
        return;
    }
    
    if (startId === endId) {
        showNotification('Start and destination cannot be the same.', 'error');
        return;
    }
    
    try {
        // Show loading indicator
        document.getElementById('find-path-btn').textContent = 'Finding path...';
        document.getElementById('find-path-btn').disabled = true;
        
        // Fetch the shortest path
        const response = await fetch(`/api/shortest_path?start_id=${startId}&end_id=${endId}`);
        const data = await response.json();
        
        if (response.ok) {
            // Display the path on the map
            displayPath(data.path, data.distance);
            
            // Show path info
            const pathInfo = document.getElementById('path-info');
            pathInfo.innerHTML = `
                <p><strong>Distance:</strong> ${data.distance.toFixed(2)} meters</p>
                <p><strong>Path:</strong> ${data.path.map(loc => loc.name).join(' → ')}</p>
            `;
            pathInfo.style.display = 'block';
        } else {
            showNotification(data.error || 'Failed to find path.', 'error');
        }
    } catch (error) {
        console.error('Error finding shortest path:', error);
        showNotification('Failed to find path. Please try again later.', 'error');
    } finally {
        // Reset button
        document.getElementById('find-path-btn').textContent = 'Find Path';
        document.getElementById('find-path-btn').disabled = false;
    }
}

// Display the path on the map
function displayPath(path, distance) {
    // Clear existing path
    pathLayer.clearLayers();
    
    if (path.length < 2) return;
    
    // Create a polyline for the path
    const pathCoordinates = path.map(loc => [loc.latitude, loc.longitude]);
    const polyline = L.polyline(pathCoordinates, {
        color: 'var(--primary-color)',
        weight: 5,
        opacity: 0.7,
        lineJoin: 'round',
        className: 'path-line'
    }).addTo(pathLayer);
    
    // Fit map to show the entire path
    map.fitBounds(polyline.getBounds().pad(0.1));
    
    // Highlight start and end markers
    const startMarker = markers.find(m => m.getLatLng().lat === path[0].latitude && m.getLatLng().lng === path[0].longitude);
    const endMarker = markers.find(m => m.getLatLng().lat === path[path.length - 1].latitude && m.getLatLng().lng === path[path.length - 1].longitude);
    
    if (startMarker) {
        startMarker.setIcon(L.divIcon({
            className: 'custom-marker start-marker',
            html: `<i class="fas fa-flag-checkered"></i>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        }));
    }
    
    if (endMarker) {
        endMarker.setIcon(L.divIcon({
            className: 'custom-marker end-marker',
            html: `<i class="fas fa-map-pin"></i>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        }));
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set notification content and type
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification
    notification.style.display = 'block';
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Function to navigate to an event location
function navigateToEvent(venueId) {
    // Find the venue location
    const venue = locations.find(loc => loc.id === parseInt(venueId));
    
    if (!venue) {
        showNotification('Venue not found.', 'error');
        return;
    }
    
    // Center map on the venue
    map.setView([venue.latitude, venue.longitude], 18);
    
    // Find the marker and open its popup
    const marker = markers.find(m => m.getLatLng().lat === venue.latitude && m.getLatLng().lng === venue.longitude);
    if (marker) {
        marker.openPopup();
    }
    
    // Scroll to map section
    document.getElementById('map-section').scrollIntoView({ behavior: 'smooth' });
} 
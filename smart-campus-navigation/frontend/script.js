// Initialize the map
var map = L.map('map').setView([13.2630, 80.0274], 17); // Center on campus

// Load the tile layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Locations with latitude & longitude
const locations = {
    "Academic Block": [13.263018, 80.027427],
    "Library": [13.262621, 80.026525],
    "Canteen": [13.262856, 80.028401],
    "Pond": [13.262198, 80.027673],
    "AVV Gym for Girls": [13.262141, 80.026830],
    "Chennai" : [13.080917019874969, 80.26358605588356],
    "Delhi" : [28.675015901626473, 77.21675859763418],
    "Mumbai" : [19.07598369140625, 72.877685546875],
    "Kolkata" : [22.5726455078125, 88.3638671875],
    "Hyderabad" : [17.432607421875, 78.4736328125],
    "Bengaluru" : [12.971593933105469, 77.5945263671875],
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
    "AVV Ground": [13.259708, 80.025416]
};

// Add markers for locations
Object.entries(locations).forEach(([name, coords]) => {
    L.marker(coords).addTo(map).bindPopup(name);
});

// Function to fetch the shortest route using OpenRouteService API
let routeLine;
function fetchRouteFromAPI(start, end) {
    const apiKey = "5b3ce3597851110001cf6248c0943ad6dce547e59c20450a5741cbaa";  
    const startCoords = locations[start].slice().reverse().join(",");
    const endCoords = locations[end].slice().reverse().join(",");

    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${startCoords}&end=${endCoords}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (routeLine) {
                map.removeLayer(routeLine);
            }

            let routeCoords = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            routeLine = L.polyline(routeCoords, { color: 'blue', weight: 5 }).addTo(map);

            // Extract distance & duration
            let distance = (data.features[0].properties.summary.distance / 1000).toFixed(2);
            let duration = (data.features[0].properties.summary.duration / 60).toFixed(1);
            document.getElementById('routeInfo').innerHTML = `Distance: ${distance} km | Duration: ${duration} min`;

            // **Extract Step-by-Step Directions**
            let steps = data.features[0].properties.segments[0].steps;
            let directionsList = "<h3>Directions:</h3><ul>";

            steps.forEach((step, index) => {
                directionsList += `<li><strong>Step ${index + 1}:</strong> ${step.instruction} (${(step.distance / 1000).toFixed(2)} km)</li>`;
            });

            directionsList += "</ul>";
            document.getElementById('routeDirections').innerHTML = directionsList;  // Display directions
        })
        .catch(error => {
            console.error("Error fetching route:", error);
            alert("Error fetching route. Try again.");
        });
}


// Event listener for "Find Route" button
document.getElementById('findRouteBtn').addEventListener('click', function () {
    let start = document.getElementById('startText').value.trim();
    let end = document.getElementById('endText').value.trim();

    if (!locations[start] || !locations[end]) {
        alert("Invalid locations. Please enter correct names.");
        return;
    }

    fetchRouteFromAPI(start, end);
});

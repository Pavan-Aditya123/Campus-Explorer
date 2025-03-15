from flask import Flask, render_template, request, jsonify
from datetime import datetime
import os
import json

app = Flask(__name__)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/locations', methods=['GET'])
def get_locations():
    # Hardcoded locations data since we're not using a database
    locations = [
        {
            'id': 1,
            'name': 'Main Building',
            'latitude': 40.7128,
            'longitude': -74.0060,
            'description': 'The main administrative building'
        },
        {
            'id': 2,
            'name': 'Library',
            'latitude': 40.7130,
            'longitude': -74.0065,
            'description': 'Central library with study spaces'
        },
        {
            'id': 3,
            'name': 'Science Block',
            'latitude': 40.7135,
            'longitude': -74.0070,
            'description': 'Houses science departments and labs'
        },
        {
            'id': 4,
            'name': 'Student Center',
            'latitude': 40.7125,
            'longitude': -74.0055,
            'description': 'Hub for student activities and dining'
        },
        {
            'id': 5,
            'name': 'Sports Complex',
            'latitude': 40.7120,
            'longitude': -74.0050,
            'description': 'Indoor and outdoor sports facilities'
        },
        {
            'id': 6,
            'name': 'Engineering Building',
            'latitude': 40.7140,
            'longitude': -74.0075,
            'description': 'Home to engineering departments'
        },
        {
            'id': 7,
            'name': 'Arts Center',
            'latitude': 40.7145,
            'longitude': -74.0080,
            'description': 'Theaters and art studios'
        },
        {
            'id': 8,
            'name': 'Dormitory A',
            'latitude': 40.7150,
            'longitude': -74.0085,
            'description': 'Student housing'
        },
        {
            'id': 9,
            'name': 'Dormitory B',
            'latitude': 40.7155,
            'longitude': -74.0090,
            'description': 'Student housing'
        },
        {
            'id': 10,
            'name': 'Cafeteria',
            'latitude': 40.7127,
            'longitude': -74.0058,
            'description': 'Main dining hall'
        }
    ]
    return jsonify(locations)

@app.route('/api/paths', methods=['GET'])
def get_paths():
    # Hardcoded paths data
    paths = [
        {'id': 1, 'start_location_id': 1, 'end_location_id': 2, 'distance': 100},
        {'id': 2, 'start_location_id': 2, 'end_location_id': 1, 'distance': 100},
        {'id': 3, 'start_location_id': 1, 'end_location_id': 4, 'distance': 80},
        {'id': 4, 'start_location_id': 4, 'end_location_id': 1, 'distance': 80},
        {'id': 5, 'start_location_id': 2, 'end_location_id': 3, 'distance': 120},
        {'id': 6, 'start_location_id': 3, 'end_location_id': 2, 'distance': 120},
        {'id': 7, 'start_location_id': 3, 'end_location_id': 6, 'distance': 150},
        {'id': 8, 'start_location_id': 6, 'end_location_id': 3, 'distance': 150},
        {'id': 9, 'start_location_id': 4, 'end_location_id': 5, 'distance': 200},
        {'id': 10, 'start_location_id': 5, 'end_location_id': 4, 'distance': 200},
        {'id': 11, 'start_location_id': 4, 'end_location_id': 10, 'distance': 50},
        {'id': 12, 'start_location_id': 10, 'end_location_id': 4, 'distance': 50},
        {'id': 13, 'start_location_id': 6, 'end_location_id': 7, 'distance': 100},
        {'id': 14, 'start_location_id': 7, 'end_location_id': 6, 'distance': 100},
        {'id': 15, 'start_location_id': 7, 'end_location_id': 8, 'distance': 180},
        {'id': 16, 'start_location_id': 8, 'end_location_id': 7, 'distance': 180},
        {'id': 17, 'start_location_id': 8, 'end_location_id': 9, 'distance': 80},
        {'id': 18, 'start_location_id': 9, 'end_location_id': 8, 'distance': 80}
    ]
    return jsonify(paths)

@app.route('/api/shortest_path', methods=['GET'])
def get_shortest_path():
    start_id = request.args.get('start_id', type=int)
    end_id = request.args.get('end_id', type=int)
    
    if not start_id or not end_id:
        return jsonify({'error': 'Start and end location IDs are required'}), 400
    
    # Get all locations and paths
    locations = get_locations().json
    paths = get_paths().json
    
    # Create adjacency matrix for Floyd-Warshall algorithm
    n = len(locations)
    location_id_to_index = {loc['id']: i for i, loc in enumerate(locations)}
    
    # Initialize distance matrix with infinity
    dist = [[float('inf') for _ in range(n)] for _ in range(n)]
    next_node = [[None for _ in range(n)] for _ in range(n)]
    
    # Set diagonal to 0
    for i in range(n):
        dist[i][i] = 0
    
    # Fill distance matrix with direct paths
    for path in paths:
        i = location_id_to_index[path['start_location_id']]
        j = location_id_to_index[path['end_location_id']]
        dist[i][j] = path['distance']
        next_node[i][j] = j
    
    # Run Floyd-Warshall algorithm
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] != float('inf') and dist[k][j] != float('inf'):
                    if dist[i][j] > dist[i][k] + dist[k][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
                        next_node[i][j] = next_node[i][k]
    
    # Reconstruct path
    start_index = location_id_to_index.get(start_id)
    end_index = location_id_to_index.get(end_id)
    
    if start_index is None or end_index is None:
        return jsonify({'error': 'Invalid location IDs'}), 400
    
    if dist[start_index][end_index] == float('inf'):
        return jsonify({'error': 'No path exists between these locations'}), 404
    
    # Reconstruct the path
    path = []
    current = start_index
    
    while current != end_index:
        if next_node[current][end_index] is None:
            return jsonify({'error': 'No path exists between these locations'}), 404
        
        path.append(locations[current]['id'])
        current = next_node[current][end_index]
    
    path.append(locations[end_index]['id'])
    
    # Get location details for the path
    path_details = []
    for loc_id in path:
        location = next((loc for loc in locations if loc['id'] == loc_id), None)
        path_details.append({
            'id': location['id'],
            'name': location['name'],
            'latitude': location['latitude'],
            'longitude': location['longitude']
        })
    
    return jsonify({
        'path': path_details,
        'distance': dist[start_index][end_index]
    })

@app.route('/api/events', methods=['GET'])
def get_events():
    # Hardcoded events data
    events = [
        {
            'id': 1,
            'name': 'Orientation Day',
            'venue_id': 1,
            'venue_name': 'Main Building',
            'date': '2023-09-01',
            'time': '09:00',
            'description': 'Welcome event for new students',
            'created_at': '2023-08-15 10:00:00'
        },
        {
            'id': 2,
            'name': 'Science Fair',
            'venue_id': 3,
            'venue_name': 'Science Block',
            'date': '2023-09-15',
            'time': '10:00',
            'description': 'Annual science exhibition',
            'created_at': '2023-08-20 14:30:00'
        },
        {
            'id': 3,
            'name': 'Basketball Tournament',
            'venue_id': 5,
            'venue_name': 'Sports Complex',
            'date': '2023-09-20',
            'time': '14:00',
            'description': 'Inter-college basketball competition',
            'created_at': '2023-08-25 09:15:00'
        },
        {
            'id': 4,
            'name': 'Art Exhibition',
            'venue_id': 7,
            'venue_name': 'Arts Center',
            'date': '2023-09-25',
            'time': '11:00',
            'description': 'Student art showcase',
            'created_at': '2023-08-30 16:45:00'
        },
        {
            'id': 5,
            'name': 'Tech Symposium',
            'venue_id': 6,
            'venue_name': 'Engineering Building',
            'date': '2023-10-05',
            'time': '09:30',
            'description': 'Technology conference with guest speakers',
            'created_at': '2023-09-01 11:20:00'
        }
    ]
    
    sort_by = request.args.get('sort_by', 'created_at')
    
    if sort_by == 'created_at':
        # Sort by creation time (newest first)
        events.sort(key=lambda x: x['created_at'], reverse=True)
    elif sort_by == 'expiry':
        # Sort by expiry time (soonest first)
        now = datetime.now()
        for event in events:
            event_datetime = datetime.strptime(f"{event['date']} {event['time']}", '%Y-%m-%d %H:%M')
            event['time_left'] = (event_datetime - now).total_seconds()
        
        events.sort(key=lambda x: x['time_left'])
    
    return jsonify(events)

@app.route('/api/events', methods=['POST'])
def add_event():
    data = request.json
    
    if not all(key in data for key in ['name', 'venue_id', 'date', 'time']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        # Get all events
        events = get_events().json
        
        # Get venue name
        locations = get_locations().json
        venue = next((loc for loc in locations if loc['id'] == data['venue_id']), None)
        
        if not venue:
            return jsonify({'error': 'Invalid venue ID'}), 400
        
        # Create new event
        new_event = {
            'id': len(events) + 1,
            'name': data['name'],
            'venue_id': data['venue_id'],
            'venue_name': venue['name'],
            'date': data['date'],
            'time': data['time'],
            'description': data.get('description', ''),
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # In a real app, we would save to database here
        # For this simplified version, we'll just return the new event
        
        return jsonify(new_event), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True) 
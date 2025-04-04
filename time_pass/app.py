from flask import Flask, render_template, request, jsonify
from datetime import datetime
import os
import json

app = Flask(__name__)

# File to store events data
EVENTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'events.json')

# Helper function to load events from file
def load_events():
    if os.path.exists(EVENTS_FILE):
        try:
            with open(EVENTS_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading events: {e}")
            # Create a new empty file if there's an error
            save_events([])
            return []
    else:
        # Create the file if it doesn't exist
        save_events([])
        return []

# Helper function to save events to file
def save_events(events):
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(EVENTS_FILE), exist_ok=True)
        
        with open(EVENTS_FILE, 'w') as f:
            json.dump(events, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving events: {e}")
        return False

# Initialize events file if it doesn't exist
if not os.path.exists(EVENTS_FILE):
    save_events([])

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/locations', methods=['GET'])
def get_locations():
    # Return the predefined locations from the frontend
    locations = [
        {
            'name': 'Academic Block',
            'coordinates': [13.263018, 80.027427]
        },
        {
            'name': 'Library',
            'coordinates': [13.262621, 80.026525]
        },
        {
            'name': 'Canteen',
            'coordinates': [13.262856, 80.028401]
        },
        {
            'name': 'Pond',
            'coordinates': [13.262198, 80.027673]
        },
        {
            'name': 'AVV Gym for Girls',
            'coordinates': [13.262141, 80.026830]
        },
        {
            'name': 'Junior Girls Hostel',
            'coordinates': [13.261993, 80.026421]
        },
        {
            'name': 'Junior Boys Hostel',
            'coordinates': [13.261805, 80.028076]
        },
        {
            'name': 'Lab Block',
            'coordinates': [13.262768, 80.028147]
        },
        {
            'name': 'Mechanical Lab',
            'coordinates': [13.261205, 80.027488]
        },
        {
            'name': 'Volley Ball Court',
            'coordinates': [13.261009, 80.027530]
        },
        {
            'name': 'Basket Ball Court',
            'coordinates': [13.260909, 80.027256]
        },
        {
            'name': 'Senior Girls Hostel',
            'coordinates': [13.260658, 80.028184]
        },
        {
            'name': 'Senior Boys Hostel',
            'coordinates': [13.260550, 80.027272]
        },
        {
            'name': '2nd Year Boys Hostel',
            'coordinates': [13.259570, 80.026694]
        },
        {
            'name': 'Amrita Indoor Stadium',
            'coordinates': [13.259880, 80.025990]
        },
        {
            'name': 'AVV Gym for Boys',
            'coordinates': [13.260146, 80.026143]
        },
        {
            'name': 'AVV Ground',
            'coordinates': [13.259708, 80.025416]
        }
    ]
    return jsonify(locations)

@app.route('/api/paths', methods=['GET'])
def get_paths():
    # This endpoint is not currently used in the project
    # The path finding functionality is handled directly in the frontend using Leaflet.js
    # and the predefined locations from map.js
    return jsonify({'message': 'This endpoint is deprecated. Path finding is handled client-side.'}), 410

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
    # Load events from file
    events = load_events()
    
    sort_by = request.args.get('sort_by', 'created_at')
    filter_type = request.args.get('filter', None)
    
    # Make a copy of events to avoid modifying the original
    events_copy = events.copy()
    now = datetime.now()
    
    # Add time_left to all events for sorting
    for event in events_copy:
        try:
            event_datetime = datetime.strptime(f"{event['date']} {event['time']}", '%Y-%m-%d %H:%M')
            event['time_left'] = (event_datetime - now).total_seconds()
        except ValueError:
            event['time_left'] = float('inf')
    
    # Apply filters if specified
    if filter_type == 'upcoming':
        events_copy = [e for e in events_copy if e['time_left'] > 0]
    elif filter_type == 'past':
        events_copy = [e for e in events_copy if e['time_left'] <= 0]
    
    # Apply sorting
    if sort_by == 'created_at':
        events_copy.sort(key=lambda x: x['created_at'], reverse=True)
    elif sort_by == 'expiry':
        events_copy.sort(key=lambda x: x['time_left'])
    
    # Remove temporary time_left field from response
    for event in events_copy:
        if 'time_left' in event:
            del event['time_left']
    
    return jsonify(events_copy)

@app.route('/api/events', methods=['POST'])
def add_event():
    data = request.json
    
    if not all(key in data for key in ['name', 'venue_name', 'date', 'time']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        # Validate date and time format
        try:
            datetime.strptime(f"{data['date']} {data['time']}", '%Y-%m-%d %H:%M')
            
            if 'end_time' in data:
                datetime.strptime(f"{data['date']} {data['end_time']}", '%Y-%m-%d %H:%M')
                
                if data['end_time'] <= data['time']:
                    return jsonify({'error': 'End time must be after start time'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time'}), 400
        
        # Load existing events
        events = load_events()
        
        # Generate new ID (max ID + 1)
        new_id = max([event['id'] for event in events], default=0) + 1
        
        # Create new event
        new_event = {
            'id': new_id,
            'name': data['name'],
            'venue_name': data['venue_name'],
            'date': data['date'],
            'time': data['time'],
            'end_time': data.get('end_time', ''),
            'description': data.get('description', ''),
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Add to events list
        events.append(new_event)
        
        # Save updated events list
        if save_events(events):
            return jsonify(new_event), 201
        else:
            return jsonify({'error': 'Failed to save event'}), 500
        
    except Exception as e:
        print(f"Error in add_event: {str(e)}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 400

@app.route('/api/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    try:
        # Load existing events
        events = load_events()
        
        # Find the event to delete
        event_index = next((i for i, event in enumerate(events) if event['id'] == event_id), None)
        
        if event_index is None:
            return jsonify({'error': 'Event not found'}), 404
        
        # Remove the event
        deleted_event = events.pop(event_index)
        
        # Save updated events list
        if save_events(events):
            return jsonify({'message': f'Event "{deleted_event["name"]}" deleted successfully', 'id': event_id}), 200
        else:
            return jsonify({'error': 'Failed to save changes after deletion'}), 500
        
    except Exception as e:
        print(f"Error in delete_event: {str(e)}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 400

if __name__ == '__main__':
    app.run(debug=True) 
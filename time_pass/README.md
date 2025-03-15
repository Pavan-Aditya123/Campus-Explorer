# Campus Explorer

A comprehensive campus navigation and event management system for students.

## Features

### Campus Navigation
- Interactive campus map
- Search for places within the campus
- Find the shortest path between any two locations using Floyd-Warshall Algorithm
- Navigate from one place to another with visual guidance

### Event Management
- View ongoing and upcoming campus events
- Add new events with details (name, venue, date, time)
- Sort events by recent additions and expiry time
- Click on events to see venue on map and navigate there

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript
- **Map Integration**: Leaflet.js
- **Backend**: Python (Flask)
- **Database**: MySQL
- **Algorithms**:
  - Floyd-Warshall Algorithm (for shortest path)
  - Sorting Algorithms (Merge Sort / Quick Sort) for event management

## Installation

1. Clone the repository
2. Install backend dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Set up the MySQL database:
   ```
   mysql -u username -p < database/schema.sql
   ```
4. Start the Flask server:
   ```
   python app.py
   ```
5. Open your browser and navigate to `http://localhost:5000`

## Project Structure
- `/static` - Frontend assets (CSS, JS, images)
- `/templates` - HTML templates
- `/database` - Database schema and sample data
- `/algorithms` - Implementation of algorithms
- `app.py` - Main Flask application
- `requirements.txt` - Python dependencies 
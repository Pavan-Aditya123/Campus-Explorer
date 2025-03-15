-- Create database
CREATE DATABASE IF NOT EXISTS campus_explorer;
USE campus_explorer;

-- Create tables
CREATE TABLE IF NOT EXISTS location (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS path (
    id INT AUTO_INCREMENT PRIMARY KEY,
    start_location_id INT NOT NULL,
    end_location_id INT NOT NULL,
    distance FLOAT NOT NULL,
    FOREIGN KEY (start_location_id) REFERENCES location(id),
    FOREIGN KEY (end_location_id) REFERENCES location(id)
);

CREATE TABLE IF NOT EXISTS event (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    venue_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES location(id)
);

-- Insert sample data for locations
INSERT INTO location (name, latitude, longitude, description) VALUES
('Main Building', 40.7128, -74.0060, 'The main administrative building'),
('Library', 40.7130, -74.0065, 'Central library with study spaces'),
('Science Block', 40.7135, -74.0070, 'Houses science departments and labs'),
('Student Center', 40.7125, -74.0055, 'Hub for student activities and dining'),
('Sports Complex', 40.7120, -74.0050, 'Indoor and outdoor sports facilities'),
('Engineering Building', 40.7140, -74.0075, 'Home to engineering departments'),
('Arts Center', 40.7145, -74.0080, 'Theaters and art studios'),
('Dormitory A', 40.7150, -74.0085, 'Student housing'),
('Dormitory B', 40.7155, -74.0090, 'Student housing'),
('Cafeteria', 40.7127, -74.0058, 'Main dining hall');

-- Insert sample data for paths
INSERT INTO path (start_location_id, end_location_id, distance) VALUES
(1, 2, 100), -- Main Building to Library
(2, 1, 100), -- Library to Main Building
(1, 4, 80),  -- Main Building to Student Center
(4, 1, 80),  -- Student Center to Main Building
(2, 3, 120), -- Library to Science Block
(3, 2, 120), -- Science Block to Library
(3, 6, 150), -- Science Block to Engineering Building
(6, 3, 150), -- Engineering Building to Science Block
(4, 5, 200), -- Student Center to Sports Complex
(5, 4, 200), -- Sports Complex to Student Center
(4, 10, 50), -- Student Center to Cafeteria
(10, 4, 50), -- Cafeteria to Student Center
(6, 7, 100), -- Engineering Building to Arts Center
(7, 6, 100), -- Arts Center to Engineering Building
(7, 8, 180), -- Arts Center to Dormitory A
(8, 7, 180), -- Dormitory A to Arts Center
(8, 9, 80),  -- Dormitory A to Dormitory B
(9, 8, 80);  -- Dormitory B to Dormitory A

-- Insert sample events
INSERT INTO event (name, venue_id, date, time, description) VALUES
('Orientation Day', 1, '2023-09-01', '09:00:00', 'Welcome event for new students'),
('Science Fair', 3, '2023-09-15', '10:00:00', 'Annual science exhibition'),
('Basketball Tournament', 5, '2023-09-20', '14:00:00', 'Inter-college basketball competition'),
('Art Exhibition', 7, '2023-09-25', '11:00:00', 'Student art showcase'),
('Tech Symposium', 6, '2023-10-05', '09:30:00', 'Technology conference with guest speakers'); 
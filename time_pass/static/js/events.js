// Initialize events variables
let events = [];
let venues = [];

// Initialize events when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    fetchEvents();
    setupEventListeners();
});

// Fetch events from the API
async function fetchEvents() {
    try {
        // Fetch all events
        const eventsResponse = await fetch('/api/events');
        events = await eventsResponse.json();
        
        // Fetch locations for venue selection
        const locationsResponse = await fetch('/api/locations');
        venues = await locationsResponse.json();
        
        // Populate venue dropdown
        populateVenueDropdown();
        
        // Display events
        displayEvents();
    } catch (error) {
        console.error('Error fetching events:', error);
        showNotification('Failed to load events. Please try again later.', 'error');
    }
}

// Populate venue dropdown
function populateVenueDropdown() {
    const venueSelect = document.getElementById('event-venue');
    
    // Clear existing options (except the first one)
    venueSelect.innerHTML = '<option value="">Select venue</option>';
    
    // Add options for each venue
    venues.forEach(venue => {
        const option = document.createElement('option');
        option.value = venue.id;
        option.textContent = venue.name;
        venueSelect.appendChild(option);
    });
}

// Display events in the events list
function displayEvents() {
    // Display upcoming events (sorted by creation time - newest first)
    const upcomingEventsList = document.getElementById('events-list');
    upcomingEventsList.innerHTML = '';
    
    if (events.length === 0) {
        upcomingEventsList.innerHTML = '<p class="no-events">No events found.</p>';
    } else {
        // Sort events by creation time (newest first)
        const sortedByCreation = [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        sortedByCreation.forEach(event => {
            const eventCard = createEventCard(event);
            upcomingEventsList.appendChild(eventCard);
        });
    }
    
    // Display expiring soon events
    const expiringEventsList = document.getElementById('expiring-events-list');
    expiringEventsList.innerHTML = '';
    
    if (events.length === 0) {
        expiringEventsList.innerHTML = '<p class="no-events">No events found.</p>';
    } else {
        // Sort events by expiry time (soonest first)
        const now = new Date();
        const sortedByExpiry = [...events].sort((a, b) => {
            const aDate = new Date(`${a.date} ${a.time}`);
            const bDate = new Date(`${b.date} ${b.time}`);
            return aDate - bDate;
        }).filter(event => new Date(`${event.date} ${event.time}`) > now);
        
        if (sortedByExpiry.length === 0) {
            expiringEventsList.innerHTML = '<p class="no-events">No upcoming events found.</p>';
        } else {
            sortedByExpiry.forEach(event => {
                const eventCard = createEventCard(event);
                expiringEventsList.appendChild(eventCard);
            });
        }
    }
}

// Create an event card
function createEventCard(event) {
    const eventDate = new Date(`${event.date} ${event.time}`);
    const now = new Date();
    const timeLeft = eventDate - now;
    
    // Format date and time
    const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const formattedTime = new Date(`${event.date} ${event.time}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Create event card element
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card';
    eventCard.setAttribute('data-aos', 'fade-up');
    
    // Create event card content
    eventCard.innerHTML = `
        <div class="event-header">
            <h3>${event.name}</h3>
            <p><i class="fas fa-map-marker-alt"></i> ${event.venue_name}</p>
            <p><i class="fas fa-calendar-alt"></i> ${formattedDate}</p>
            <p><i class="fas fa-clock"></i> ${formattedTime}</p>
        </div>
        <div class="event-body">
            <p>${event.description || 'No description available.'}</p>
            <button class="btn primary-btn navigate-btn" data-venue-id="${event.venue_id}">Navigate to Venue</button>
        </div>
    `;
    
    // Add event listener to navigate button
    eventCard.querySelector('.navigate-btn').addEventListener('click', (e) => {
        const venueId = e.target.getAttribute('data-venue-id');
        navigateToEvent(venueId);
    });
    
    return eventCard;
}

// Set up event listeners
function setupEventListeners() {
    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Event form submission
    const eventForm = document.getElementById('event-form');
    eventForm.addEventListener('submit', addEvent);
}

// Add a new event
async function addEvent(e) {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('event-name').value;
    const venueId = document.getElementById('event-venue').value;
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const description = document.getElementById('event-description').value;
    
    // Validate form
    if (!name || !venueId || !date || !time) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }
    
    // Create event object
    const eventData = {
        name,
        venue_id: parseInt(venueId),
        date,
        time,
        description
    };
    
    try {
        // Show loading indicator
        const submitBtn = eventForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Adding event...';
        submitBtn.disabled = true;
        
        // Send POST request to add event
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Add new event to events array
            events.push(data);
            
            // Display events
            displayEvents();
            
            // Show success notification
            showNotification('Event added successfully!', 'success');
            
            // Reset form
            eventForm.reset();
            
            // Switch to upcoming events tab
            document.querySelector('.tab-btn[data-tab="upcoming-events"]').click();
        } else {
            showNotification(data.error || 'Failed to add event.', 'error');
        }
    } catch (error) {
        console.error('Error adding event:', error);
        showNotification('Failed to add event. Please try again later.', 'error');
    } finally {
        // Reset button
        const submitBtn = eventForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Add Event';
        submitBtn.disabled = false;
    }
} 
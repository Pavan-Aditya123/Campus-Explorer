// Initialize events variables
let events = [];
let venues = [];

// Initialize events when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    fetchEvents();
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

// Fetch events from the API
async function fetchEvents() {
    try {
        // Show loading state
        document.getElementById('events-list').innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading events...</div>';
        document.getElementById('expiring-events-list').innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading events...</div>';
        
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
    const now = new Date();
    
    // 1. Display upcoming events (sorted by creation time - newest first)
    const upcomingEventsList = document.getElementById('events-list');
    upcomingEventsList.innerHTML = '';
    
    if (events.length === 0) {
        upcomingEventsList.innerHTML = '<p class="no-events">No events found.</p>';
    } else {
        // Filter for future events
        const upcomingEvents = events.filter(event => {
            const eventDate = new Date(`${event.date}T${event.time}`);
            return eventDate > now;
        });
        
        // Sort events by creation time (newest first)
        const sortedByCreation = [...upcomingEvents].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        if (sortedByCreation.length === 0) {
            upcomingEventsList.innerHTML = '<p class="no-events">No upcoming events found.</p>';
        } else {
            // Add events with staggered animation delay
            sortedByCreation.forEach((event, index) => {
                setTimeout(() => {
                    const eventCard = createEventCard(event);
                    upcomingEventsList.appendChild(eventCard);
                }, index * 100); // Stagger by 100ms
            });
        }
    }
    
    // 2. Display expiring soon events (sorted by date/time - soonest first)
    const expiringEventsList = document.getElementById('expiring-events-list');
    expiringEventsList.innerHTML = '';
    
    if (events.length === 0) {
        expiringEventsList.innerHTML = '<p class="no-events">No events found.</p>';
    } else {
        // Filter for future events
        const upcomingEvents = events.filter(event => {
            const eventDate = new Date(`${event.date}T${event.time}`);
            return eventDate > now;
        });
        
        // Sort events by expiry time (soonest first)
        const sortedByExpiry = [...upcomingEvents].sort((a, b) => {
            const aDate = new Date(`${a.date}T${a.time}`);
            const bDate = new Date(`${b.date}T${b.time}`);
            return aDate - bDate;
        });
        
        if (sortedByExpiry.length === 0) {
            expiringEventsList.innerHTML = '<p class="no-events">No upcoming events found.</p>';
        } else {
            // Add events with staggered animation delay
            sortedByExpiry.forEach((event, index) => {
                setTimeout(() => {
                    const eventCard = createEventCard(event);
                    expiringEventsList.appendChild(eventCard);
                }, index * 100); // Stagger by 100ms
            });
        }
    }
}

// Create an event card
function createEventCard(event) {
    const eventDate = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const timeLeft = eventDate - now;
    
    // Format date and time
    const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const formattedTime = new Date(`${event.date}T${event.time}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Format end time if available
    let formattedEndTime = '';
    if (event.end_time) {
        formattedEndTime = new Date(`${event.date}T${event.end_time}`).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Calculate time remaining
    let timeRemaining = '';
    if (timeLeft > 0) {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
            timeRemaining = `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (hours > 0) {
            timeRemaining = `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
            timeRemaining = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
    } else {
        timeRemaining = 'Event has passed';
    }
    
    // Create event card element
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card';
    eventCard.setAttribute('data-aos', 'fade-up');
    eventCard.setAttribute('data-event-id', event.id);
    
    // Create event card content
    eventCard.innerHTML = `
        <div class="event-header">
            <h3>${event.name}</h3>
            <div class="event-actions">
                <button class="delete-btn" title="Delete Event"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
        <div class="event-details">
            <p><i class="fas fa-map-marker-alt"></i> ${event.venue_name}</p>
            <p><i class="fas fa-calendar-alt"></i> ${formattedDate}</p>
            <p><i class="fas fa-clock"></i> ${formattedTime}${formattedEndTime ? ` - ${formattedEndTime}` : ''}</p>
            <p><i class="fas fa-hourglass-half"></i> ${timeRemaining}</p>
        </div>
        <div class="event-body">
            <p>${event.description || 'No description available.'}</p>
            <button class="btn primary-btn navigate-btn" data-venue-id="${event.venue_id}">
                <i class="fas fa-directions"></i> Navigate to Venue
            </button>
        </div>
    `;
    
    // Add event listener to navigate button
    eventCard.querySelector('.navigate-btn').addEventListener('click', (e) => {
        const venueId = e.target.getAttribute('data-venue-id') || 
                        e.target.closest('.navigate-btn').getAttribute('data-venue-id');
        navigateToEvent(venueId);
    });
    
    // Add event listener to delete button
    eventCard.querySelector('.delete-btn').addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete the event "${event.name}"?`)) {
            deleteEvent(event.id);
        }
    });
    
    return eventCard;
}

// Delete an event
async function deleteEvent(eventId) {
    try {
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Find the event card and add fade-out animation
            const eventCard = document.querySelector(`.event-card[data-event-id="${eventId}"]`);
            if (eventCard) {
                eventCard.style.animation = 'fadeOut 0.5s ease forwards';
                
                // Wait for animation to complete before removing from DOM
                setTimeout(() => {
                    // Remove event from the events array
                    events = events.filter(event => event.id !== eventId);
                    
                    // Update the display
                    displayEvents();
                    
                    // Show success notification
                    showNotification(data.message || 'Event deleted successfully!', 'success');
                }, 500);
            } else {
                // If card not found, just update the data
                events = events.filter(event => event.id !== eventId);
                displayEvents();
                showNotification(data.message || 'Event deleted successfully!', 'success');
            }
        } else {
            showNotification(data.error || 'Failed to delete event.', 'error');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        showNotification('Failed to delete event. Please try again later.', 'error');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const tabsContainer = document.querySelector('.tabs');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Update the active tab attribute for the sliding indicator
            tabsContainer.setAttribute('data-active-tab', tabId);
        });
    });
    
    // Event form submission
    const eventForm = document.getElementById('event-form');
    eventForm.addEventListener('submit', addEvent);
    
    // Initialize form with default values
    initializeEventForm();
    
    // Initialize time pickers
    initializeTimePickers();
}

// Initialize time pickers with Flatpickr
function initializeTimePickers() {
    if (typeof flatpickr === 'undefined') {
        console.error('Flatpickr library not loaded');
        return;
    }
    
    // Get current time and round to nearest 30 minutes
    const now = new Date();
    const roundedMinutes = Math.ceil(now.getMinutes() / 30) * 30;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    
    // Default start time (1 hour from now)
    const startTime = new Date(now);
    startTime.setHours(startTime.getHours() + 1);
    
    // Default end time (2 hours from now)
    const endTime = new Date(now);
    endTime.setHours(endTime.getHours() + 2);
    
    // Initialize start time picker
    const startTimePicker = flatpickr('#event-start-time', {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        minuteIncrement: 15,
        defaultHour: startTime.getHours(),
        defaultMinute: startTime.getMinutes(),
        onChange: function(selectedDates, dateStr) {
            // Update end time to be at least 30 minutes after start time
            const selectedTime = selectedDates[0];
            const minEndTime = new Date(selectedTime);
            minEndTime.setMinutes(minEndTime.getMinutes() + 30);
            
            const currentEndTime = endTimePicker.selectedDates[0];
            if (!currentEndTime || currentEndTime <= selectedTime) {
                endTimePicker.setDate(minEndTime);
            }
        }
    });
    
    // Initialize end time picker
    const endTimePicker = flatpickr('#event-end-time', {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        minuteIncrement: 15,
        defaultHour: endTime.getHours(),
        defaultMinute: endTime.getMinutes()
    });
    
    // Store references to pickers for later use
    window.startTimePicker = startTimePicker;
    window.endTimePicker = endTimePicker;
}

// Initialize event form with default values
function initializeEventForm() {
    // Set min date for event date input to today
    const dateInput = document.getElementById('event-date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
    dateInput.value = today; // Set default to today
    
    // Clear name and description fields
    document.getElementById('event-name').value = '';
    document.getElementById('event-description').value = '';
    
    // Reset venue selection
    const venueSelect = document.getElementById('event-venue');
    venueSelect.selectedIndex = 0;
    
    // Reset time pickers if they exist
    if (window.startTimePicker && window.endTimePicker) {
        // Get current time and round to nearest 30 minutes
        const now = new Date();
        const roundedMinutes = Math.ceil(now.getMinutes() / 30) * 30;
        now.setMinutes(roundedMinutes);
        now.setSeconds(0);
        
        // Default start time (1 hour from now)
        const startTime = new Date(now);
        startTime.setHours(startTime.getHours() + 1);
        
        // Default end time (2 hours from now)
        const endTime = new Date(now);
        endTime.setHours(endTime.getHours() + 2);
        
        window.startTimePicker.setDate(startTime);
        window.endTimePicker.setDate(endTime);
    }
}

// Add a new event
async function addEvent(e) {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('event-name').value;
    const venueId = document.getElementById('event-venue').value;
    const date = document.getElementById('event-date').value;
    const startTime = document.getElementById('event-start-time').value;
    const endTime = document.getElementById('event-end-time').value;
    const description = document.getElementById('event-description').value;
    
    // Validate form
    if (!name || !venueId || !date || !startTime || !endTime) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }
    
    // Validate that end time is after start time
    if (endTime <= startTime) {
        showNotification('End time must be after start time.', 'error');
        return;
    }
    
    // Create event object (using start time as the main time for compatibility)
    const eventData = {
        name,
        venue_id: parseInt(venueId),
        date,
        time: startTime,
        end_time: endTime,
        description
    };
    
    try {
        // Show loading indicator
        const submitBtn = document.querySelector('#event-form button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding event...';
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
            
            // Show success notification
            showNotification('Event added successfully!', 'success');
            
            // Reset form for next event
            initializeEventForm();
            
            // Update the display
            displayEvents();
            
            // Ask user if they want to add another event or view events
            const addAnother = confirm('Event added successfully! Would you like to add another event?');
            
            if (!addAnother) {
                // Switch to upcoming events tab with animation
                setTimeout(() => {
                    document.querySelector('.tab-btn[data-tab="upcoming-events"]').click();
                }, 300);
            }
        } else {
            showNotification(data.error || 'Failed to add event.', 'error');
        }
    } catch (error) {
        console.error('Error adding event:', error);
        showNotification('Failed to add event. Please try again later.', 'error');
    } finally {
        // Reset button
        const submitBtn = document.querySelector('#event-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Event';
        submitBtn.disabled = false;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Check if notification container exists
    let notificationContainer = document.querySelector('.notification-container');
    
    // Create container if it doesn't exist
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add icon based on notification type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <p>${message}</p>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add notification to container
    notificationContainer.appendChild(notification);
    
    // Add event listener to close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Navigate to event venue
function navigateToEvent(venueId) {
    // Scroll to map section with smooth animation
    document.getElementById('map-section').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
    
    // Highlight the venue on the map (this function should be defined in map.js)
    if (typeof highlightLocation === 'function') {
        setTimeout(() => {
            highlightLocation(parseInt(venueId));
        }, 1000); // Delay to allow scroll to complete
    }
} 
// API Configuration
const API_CONFIG = {
    baseUrl: 'https://api.rtt.io/api/v1/json/search/WFJ/to/EUS',
    username: 'rttapi_daz4590',
    password: '4b886b4940dfd3dbe7b659004994360ec8a34cbc',
    timeout: 10000
};

// Fallback train data
const FALLBACK_TRAINS = [
    {
        id: "AV_001",
        departure_time: "17:15",
        expected_time: "17:17", 
        platform: "7",
        operator: "Avanti West Coast",
        destination: "London Euston",
        train_type: "Class 350",
        formation: "4-car",
        journey_time: "22m",
        status: "Delayed 2m",
        cars: [
            {number: 1, type: "DMS", doors: ["A", "B"], features: ["First class"]},
            {number: 2, type: "MS", doors: ["A", "B"], features: ["Standard class"]},
            {number: 3, type: "MS", doors: ["A", "B"], features: ["Standard class", "Shop"]},
            {number: 4, type: "DMS", doors: ["A", "B"], features: ["Standard class"]}
        ]
    },
    {
        id: "WMT_001",
        departure_time: "17:32",
        expected_time: "17:32",
        platform: "8", 
        operator: "West Midlands Trains",
        destination: "London Euston",
        train_type: "Class 350",
        formation: "5-car",
        journey_time: "24m",
        status: "On time",
        cars: [
            {number: 1, type: "DMS", doors: ["A", "B"], features: ["Standard class"]},
            {number: 2, type: "MS", doors: ["A", "B"], features: ["Standard class"]},
            {number: 3, type: "MS", doors: ["A", "B"], features: ["Quiet coach"]},
            {number: 4, type: "MS", doors: ["A", "B"], features: ["Standard class"]},
            {number: 5, type: "DMS", doors: ["A", "B"], features: ["Standard class"]}
        ]
    },
    {
        id: "LO_001",
        departure_time: "17:45",
        expected_time: "17:45",
        platform: "2",
        operator: "London Overground",
        destination: "London Euston", 
        train_type: "Class 710",
        formation: "4-car",
        journey_time: "28m",
        status: "On time",
        cars: [
            {number: 1, type: "DMS2", doors: ["A", "B", "C"], features: ["Standard seating"]},
            {number: 2, type: "PMS(W)", doors: ["A", "B", "C"], features: ["Wheelchair space", "Accessible toilet"]},
            {number: 3, type: "MS1", doors: ["A", "B", "C"], features: ["Cycle storage"]},
            {number: 4, type: "DMS1", doors: ["A", "B", "C"], features: ["Standard seating"]}
        ]
    }
];

const OPERATOR_COLORS = {
    "London Overground": "#E87722",
    "Avanti West Coast": "#004C8C",
    "West Midlands Trains": "#004C8C"
};

// Application state
let currentTrains = [];
let logEntries = [];
let showOverground = false;
let apiCallCount = 0;

// DOM elements
const elements = {};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeElements();
    setupEventListeners();
    addLogEntry('info', 'Application initialized successfully');
    loadTrainData();
});

function initializeElements() {
    elements.overgroundToggle = document.getElementById('overground-toggle');
    elements.refreshBtn = document.getElementById('refresh-btn');
    elements.apiStatus = document.getElementById('api-status');
    elements.lastUpdated = document.getElementById('last-updated');
    elements.trainCount = document.getElementById('train-count');
    elements.loading = document.getElementById('loading');
    elements.errorState = document.getElementById('error-state');
    elements.trainsContainer = document.getElementById('trains-container');
    elements.logToggle = document.getElementById('log-toggle');
    elements.logContent = document.getElementById('log-content');
    elements.logBadge = document.getElementById('log-badge');
    elements.logEntries = document.getElementById('log-entries');
    elements.clearLogBtn = document.getElementById('clear-log');
    elements.retryBtn = document.getElementById('retry-btn');
    elements.errorMessage = document.getElementById('error-message');
    
    console.log('Elements initialized:', Object.keys(elements).length, 'elements found');
}

function setupEventListeners() {
    if (elements.overgroundToggle) {
        elements.overgroundToggle.addEventListener('change', handleOvergroundToggle);
        console.log('Overground toggle listener added');
    }
    
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', handleRefresh);
        console.log('Refresh button listener added');
    }
    
    if (elements.logToggle) {
        elements.logToggle.addEventListener('click', toggleLog);
        console.log('Log toggle listener added');
    }
    
    if (elements.clearLogBtn) {
        elements.clearLogBtn.addEventListener('click', clearLog);
        console.log('Clear log button listener added');
    }
    
    if (elements.retryBtn) {
        elements.retryBtn.addEventListener('click', handleRefresh);
        console.log('Retry button listener added');
    }
}

function handleOvergroundToggle(event) {
    showOverground = event.target.checked;
    console.log('Overground toggle changed:', showOverground);
    addLogEntry('info', `London Overground filter ${showOverground ? 'enabled' : 'disabled'}`);
    renderTrains();
}

function handleRefresh() {
    console.log('Refresh button clicked');
    addLogEntry('info', 'Manual refresh triggered');
    loadTrainData();
}

function toggleLog() {
    console.log('Log toggle clicked');
    const isHidden = elements.logContent.classList.contains('hidden');
    console.log('Log content currently hidden:', isHidden);
    
    if (isHidden) {
        elements.logContent.classList.remove('hidden');
        elements.logToggle.classList.add('expanded');
        console.log('Log expanded');
    } else {
        elements.logContent.classList.add('hidden');
        elements.logToggle.classList.remove('expanded');
        console.log('Log collapsed');
    }
}

function clearLog() {
    console.log('Clear log clicked');
    logEntries = [];
    if (elements.logEntries) {
        elements.logEntries.innerHTML = '';
    }
    updateLogBadge();
    addLogEntry('info', 'Log cleared');
}

// API Functions
async function loadTrainData() {
    console.log('Loading train data...');
    showLoading(true);
    hideError();
    updateStatus('Connecting...', 'info');
    
    const startTime = Date.now();
    apiCallCount++;
    
    try {
        addLogEntry('info', `API call #${apiCallCount} initiated to ${API_CONFIG.baseUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        
        const response = await fetch(API_CONFIG.baseUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(API_CONFIG.username + ':' + API_CONFIG.password),
                'Accept': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        addLogEntry('success', `API call #${apiCallCount} successful (${responseTime}ms)\nStatus: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
        
        currentTrains = parseApiResponse(data);
        
        if (currentTrains.length === 0) {
            addLogEntry('info', 'No trains found in API response, using fallback data');
            currentTrains = [...FALLBACK_TRAINS];
        }
        
        updateStatus('Connected', 'success');
        updateLastUpdated();
        renderTrains();
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        if (error.name === 'AbortError') {
            addLogEntry('error', `API call #${apiCallCount} timed out after ${API_CONFIG.timeout}ms\nUsing fallback data`);
        } else {
            addLogEntry('error', `API call #${apiCallCount} failed (${responseTime}ms): ${error.message}\nUsing fallback data`);
        }
        
        console.error('API Error:', error);
        
        currentTrains = [...FALLBACK_TRAINS];
        updateStatus('Using fallback data', 'warning');
        updateLastUpdated();
        renderTrains();
    }
    
    showLoading(false);
}

function parseApiResponse(data) {
    try {
        const trains = [];
        
        if (data && data.services && Array.isArray(data.services)) {
            data.services.slice(0, 10).forEach((service, index) => {
                const locationDetail = service.locationDetail || {};
                
                // Parse time from HHMM to HH:MM format
                const parseTime = (timeStr) => {
                    if (!timeStr || typeof timeStr !== 'string') return 'Unknown';
                    if (timeStr.length === 4) {
                        return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
                    }
                    return timeStr;
                };
                
                const departureTime = parseTime(locationDetail.gbttBookedDeparture || locationDetail.realtimeDeparture);
                const expectedTime = parseTime(locationDetail.realtimeDeparture || locationDetail.gbttBookedDeparture);
                
                const train = {
                    id: `RTT_${service.serviceUid || index}`,
                    departure_time: departureTime,
                    expected_time: expectedTime,
                    platform: locationDetail.platform || 'TBC',
                    operator: service.atocName || 'Unknown',
                    destination: (service.locationDetail?.destination?.[0]?.description) || 'London Euston',
                    train_type: service.trainIdentity || 'Unknown',
                    formation: determineFormation(service),
                    journey_time: calculateJourneyTime(service),
                    status: getServiceStatus(service),
                    cars: generateFormationCars(service)
                };
                trains.push(train);
            });
        }
        
        return trains;
    } catch (error) {
        addLogEntry('error', `Failed to parse API response: ${error.message}`);
        return [];
    }
}

function determineFormation(service) {
    // Try to extract formation info from various fields
    if (service.formation && typeof service.formation === 'string') {
        return service.formation;
    }
    
    // Default formations by operator
    const operator = service.atocName || '';
    if (operator.includes('Overground')) {
        return '4-car';
    } else if (operator.includes('Avanti') || operator.includes('West Midlands')) {
        return Math.random() > 0.5 ? '4-car' : '5-car';
    }
    
    return '4-car';
}

function calculateJourneyTime(service) {
    try {
        const locationDetail = service.locationDetail || {};
        const departure = locationDetail.gbttBookedDeparture;
        const arrival = locationDetail.gbttBookedArrival;
        
        if (departure && arrival) {
            const depMins = parseInt(departure.substring(0, 2)) * 60 + parseInt(departure.substring(2, 4));
            const arrMins = parseInt(arrival.substring(0, 2)) * 60 + parseInt(arrival.substring(2, 4));
            const diff = arrMins - depMins;
            return `${diff}m`;
        }
    } catch (e) {
        // Ignore parsing errors
    }
    
    return ['22m', '24m', '26m', '28m'][Math.floor(Math.random() * 4)];
}

function getServiceStatus(service) {
    const locationDetail = service.locationDetail || {};
    
    // Check for cancellation
    if (locationDetail.cancelReasonCode || locationDetail.cancelReasonShortText) {
        return 'Cancelled';
    }
    
    // Check for delay
    if (locationDetail.realtimeDeparture && locationDetail.gbttBookedDeparture) {
        const scheduled = locationDetail.gbttBookedDeparture;
        const actual = locationDetail.realtimeDeparture;
        
        if (actual > scheduled) {
            const schedMins = parseInt(scheduled.substring(0, 2)) * 60 + parseInt(scheduled.substring(2, 4));
            const actualMins = parseInt(actual.substring(0, 2)) * 60 + parseInt(actual.substring(2, 4));
            const delayMins = actualMins - schedMins;
            
            if (delayMins > 0) {
                return `Delayed ${delayMins}m`;
            }
        }
    }
    
    return 'On time';
}

function generateFormationCars(service) {
    const operator = service.atocName || '';
    const formation = determineFormation(service);
    const numCars = parseInt(formation.replace(/[^0-9]/g, '')) || 4;
    const cars = [];
    
    const isOverground = operator.includes('Overground');
    
    for (let i = 1; i <= Math.min(numCars, 5); i++) {
        const car = {
            number: i,
            type: isOverground ? (i === 1 || i === numCars ? 'DMS' : 'MS') : (i === 1 || i === numCars ? 'DMS' : 'MS'),
            doors: isOverground ? ['A', 'B', 'C'] : ['A', 'B'],
            features: []
        };
        
        // Add features based on car position and operator
        if (isOverground) {
            switch (i) {
                case 1:
                    car.features = ['Standard seating'];
                    break;
                case 2:
                    car.features = ['Wheelchair space', 'Accessible toilet'];
                    break;
                case 3:
                    car.features = ['Cycle storage'];
                    break;
                default:
                    car.features = ['Standard seating'];
            }
        } else {
            if (i === 1 && operator.includes('Avanti')) {
                car.features = ['First class'];
            } else if (i === 3) {
                car.features = ['Standard class', 'Shop'];
            } else if (i === 2 || i === 4) {
                car.features = ['Quiet coach'];
            } else {
                car.features = ['Standard class'];
            }
        }
        
        cars.push(car);
    }
    
    return cars;
}

// UI Functions
function showLoading(show) {
    if (elements.loading) {
        elements.loading.classList.toggle('hidden', !show);
    }
    if (elements.trainsContainer) {
        elements.trainsContainer.classList.toggle('hidden', show);
    }
}

function hideError() {
    if (elements.errorState) {
        elements.errorState.classList.add('hidden');
    }
}

function updateStatus(status, type) {
    if (elements.apiStatus) {
        elements.apiStatus.textContent = status;
        elements.apiStatus.className = `status--${type}`;
    }
}

function updateLastUpdated() {
    const now = new Date();
    if (elements.lastUpdated) {
        elements.lastUpdated.textContent = now.toLocaleTimeString();
    }
}

function renderTrains() {
    console.log('Rendering trains. Show Overground:', showOverground, 'Total trains:', currentTrains.length);
    
    let displayTrains;
    
    // Filter based on London Overground toggle
    if (showOverground) {
        // Show all trains including London Overground, maximum 2
        displayTrains = currentTrains.slice(0, 2);
        console.log('Showing all trains including London Overground');
    } else {
        // Hide London Overground trains, show only other operators, maximum 2
        const filteredTrains = currentTrains.filter(train => {
            const isOverground = train.operator === 'London Overground';
            console.log(`Train ${train.operator}: isOverground=${isOverground}`);
            return !isOverground;
        });
        displayTrains = filteredTrains.slice(0, 2);
        console.log('Filtered out London Overground trains, showing:', displayTrains.length);
    }
    
    if (elements.trainCount) {
        elements.trainCount.textContent = displayTrains.length;
    }
    
    if (displayTrains.length === 0) {
        if (elements.trainsContainer) {
            elements.trainsContainer.innerHTML = '<div class="error-state"><h3>No trains available</h3><p>Try enabling London Overground or refresh the data.</p></div>';
        }
        return;
    }
    
    if (elements.trainsContainer) {
        elements.trainsContainer.innerHTML = displayTrains.map(train => createTrainCard(train)).join('');
    }
    
    console.log('Rendered', displayTrains.length, 'trains');
}

function createTrainCard(train) {
    const isOverground = train.operator === 'London Overground';
    const operatorColor = OPERATOR_COLORS[train.operator] || '#004C8C';
    
    return `
        <div class="train-card">
            <div class="train-header">
                <div class="train-info">
                    <h3 style="color: ${operatorColor}">${train.operator}</h3>
                    <div class="train-details">
                        <span class="train-detail">
                            <span class="train-operator">${train.train_type}</span>
                        </span>
                        <span class="train-detail">📍 ${train.destination}</span>
                        <span class="train-detail">⏱️ ${train.journey_time}</span>
                        <span class="train-detail">
                            <span class="status ${getStatusClass(train.status)}">${train.status}</span>
                        </span>
                    </div>
                </div>
                <div class="time-info">
                    <h2 class="departure-time">${train.departure_time}</h2>
                    <p class="expected-time">Expected: ${train.expected_time}</p>
                </div>
                <div class="platform-info">
                    <p class="platform-label">Platform</p>
                    <h3 class="platform-number">${train.platform}</h3>
                </div>
            </div>
            <div class="train-formation">
                <div class="formation-header">
                    <h4 class="formation-title">Train Formation</h4>
                    <span class="formation-info">${train.formation} • ${train.cars.length} cars</span>
                </div>
                <div class="cars-container">
                    ${train.cars.map(car => createCarElement(car, isOverground)).join('')}
                </div>
            </div>
        </div>
    `;
}

function createCarElement(car, isOverground) {
    const carClass = isOverground ? 'car overground' : 'car';
    const doorClass = isOverground ? 'door overground' : 'door';
    
    return `
        <div class="${carClass}">
            <div class="car-number">Car ${car.number}</div>
            <div class="car-type">${car.type}</div>
            <div class="car-doors">
                ${car.doors.map(() => `<div class="${doorClass}"></div>`).join('')}
            </div>
            <div class="car-features">
                ${car.features.map(feature => `<div class="feature">${feature}</div>`).join('')}
            </div>
        </div>
    `;
}

function getStatusClass(status) {
    if (status.includes('Delayed') || status.includes('Cancelled')) return 'status--error';
    if (status.includes('On time')) return 'status--success';
    return 'status--info';
}

// Log Functions
function addLogEntry(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { type, message, timestamp };
    
    logEntries.unshift(entry);
    
    // Keep only last 50 entries
    if (logEntries.length > 50) {
        logEntries = logEntries.slice(0, 50);
    }
    
    renderLogEntries();
    updateLogBadge();
}

function renderLogEntries() {
    if (logEntries.length === 0) return;
    
    if (elements.logEntries) {
        elements.logEntries.innerHTML = logEntries.map(entry => `
            <div class="log-entry log-entry--${entry.type}">
                <div class="log-timestamp">${entry.timestamp}</div>
                <div class="log-content-text">${entry.message}</div>
            </div>
        `).join('');
    }
}

function updateLogBadge() {
    if (elements.logBadge) {
        elements.logBadge.textContent = logEntries.length;
    }
}

// Auto-refresh every 30 seconds
setInterval(() => {
    addLogEntry('info', 'Auto-refresh triggered');
    loadTrainData();
}, 30000);
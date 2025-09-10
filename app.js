// Enhanced Train Tracker with CORS Support
class TrainTracker {
    constructor() {
        this.stations = [
            {"name": "London Euston", "code": "EUS", "region": "London"},
            {"name": "Watford Junction", "code": "WFJ", "region": "Hertfordshire"},
            {"name": "London King's Cross", "code": "KGX", "region": "London"},
            {"name": "London Paddington", "code": "PAD", "region": "London"},
            {"name": "London Victoria", "code": "VIC", "region": "London"},
            {"name": "Birmingham New Street", "code": "BHM", "region": "West Midlands"},
            {"name": "Manchester Piccadilly", "code": "MAN", "region": "Greater Manchester"},
            {"name": "Reading", "code": "RDG", "region": "Berkshire"},
            {"name": "Brighton", "code": "BTN", "region": "East Sussex"},
            {"name": "Oxford", "code": "OXF", "region": "Oxfordshire"},
            {"name": "Cambridge", "code": "CBG", "region": "Cambridgeshire"},
            {"name": "York", "code": "YRK", "region": "North Yorkshire"},
            {"name": "Edinburgh", "code": "EDB", "region": "Scotland"},
            {"name": "Glasgow Central", "code": "GLC", "region": "Scotland"},
            {"name": "Liverpool Lime Street", "code": "LIV", "region": "Merseyside"}
        ];

        this.apiConfig = {
            baseUrl: "https://api.rtt.io/api/v1/json/search/{from}/to/{to}",
            username: "rttapi_daz4590",
            password: "4b886b4940dfd3dbe7b659004994360ec8a34cbc"
        };

        this.corsProxies = {
            proxy1: "https://cors-anywhere.herokuapp.com/",
            proxy2: "https://api.allorigins.win/get?url=",
            proxy3: "https://api.codetabs.com/v1/proxy?quest="
        };

        this.sampleData = {
            services: [
                {
                    locationDetail: {
                        origin: [{ description: "London Euston", crs: "EUS" }],
                        destination: [{ description: "Brighton", crs: "BTN" }]
                    },
                    serviceUid: "P12345",
                    runDate: "2025-09-10",
                    trainIdentity: "1A23",
                    atocCode: "LO",
                    atocName: "London Overground",
                    serviceType: "train",
                    isPassenger: true,
                    operator: "London Overground",
                    platform: "2",
                    locations: [
                        {
                            crs: "EUS",
                            description: "London Euston",
                            gbttBookedDeparture: "1930",
                            realtimeDeparture: "1932",
                            platform: "2"
                        },
                        {
                            crs: "BTN",
                            description: "Brighton",
                            gbttBookedArrival: "2115",
                            realtimeArrival: "2117",
                            platform: "4"
                        }
                    ]
                },
                {
                    locationDetail: {
                        origin: [{ description: "London Euston", crs: "EUS" }],
                        destination: [{ description: "Brighton", crs: "BTN" }]
                    },
                    serviceUid: "P12346",
                    runDate: "2025-09-10",
                    trainIdentity: "1B45",
                    atocCode: "GWR",
                    atocName: "Great Western Railway",
                    serviceType: "train",
                    isPassenger: true,
                    operator: "Great Western Railway",
                    platform: "3",
                    locations: [
                        {
                            crs: "EUS",
                            description: "London Euston",
                            gbttBookedDeparture: "1945",
                            realtimeDeparture: "1945",
                            platform: "3"
                        },
                        {
                            crs: "BTN",
                            description: "Brighton",
                            gbttBookedArrival: "2130",
                            realtimeArrival: "2128",
                            platform: "2"
                        }
                    ]
                },
                {
                    locationDetail: {
                        origin: [{ description: "London Euston", crs: "EUS" }],
                        destination: [{ description: "Brighton", crs: "BTN" }]
                    },
                    serviceUid: "P12347",
                    runDate: "2025-09-10",
                    trainIdentity: "1C67",
                    atocCode: "SN",
                    atocName: "Southern",
                    serviceType: "train",
                    isPassenger: true,
                    operator: "Southern",
                    platform: "5",
                    locations: [
                        {
                            crs: "EUS",
                            description: "London Euston",
                            gbttBookedDeparture: "2000",
                            realtimeDeparture: "2002",
                            platform: "5"
                        },
                        {
                            crs: "BTN",
                            description: "Brighton",
                            gbttBookedArrival: "2145",
                            realtimeArrival: "2147",
                            platform: "6"
                        }
                    ]
                }
            ]
        };

        this.currentFromStation = null;
        this.currentToStation = null;
        this.currentApiMethod = 'sample'; // Default to sample for testing
        this.hideTimeoutId = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateDataSourceStatus('Ready to search');
    }

    bindEvents() {
        // API method selection
        const apiMethodSelect = document.getElementById('api-method');
        if (apiMethodSelect) {
            apiMethodSelect.value = this.currentApiMethod;
            apiMethodSelect.addEventListener('change', (e) => {
                this.currentApiMethod = e.target.value;
                this.updateDataSourceStatus('Method changed - ready to search');
            });
        }

        // Station autocomplete
        const fromInput = document.getElementById('from-station');
        const toInput = document.getElementById('to-station');
        
        if (fromInput) {
            fromInput.addEventListener('input', (e) => this.handleStationInput(e, 'from'));
            fromInput.addEventListener('focus', (e) => {
                if (e.target.value.length > 0) {
                    this.handleStationInput(e, 'from');
                }
            });
            fromInput.addEventListener('blur', () => {
                this.hideTimeoutId = setTimeout(() => this.hideSuggestions('from'), 200);
            });
            fromInput.addEventListener('keydown', (e) => this.handleKeyDown(e, 'from'));
        }
        
        if (toInput) {
            toInput.addEventListener('input', (e) => this.handleStationInput(e, 'to'));
            toInput.addEventListener('focus', (e) => {
                if (e.target.value.length > 0) {
                    this.handleStationInput(e, 'to');
                }
            });
            toInput.addEventListener('blur', () => {
                this.hideTimeoutId = setTimeout(() => this.hideSuggestions('to'), 200);
            });
            toInput.addEventListener('keydown', (e) => this.handleKeyDown(e, 'to'));
        }

        // Swap stations
        const swapButton = document.getElementById('swap-stations');
        if (swapButton) {
            swapButton.addEventListener('click', () => this.swapStations());
        }

        // Search button
        const searchButton = document.getElementById('search-trains');
        if (searchButton) {
            searchButton.addEventListener('click', () => this.searchTrains());
        }
    }

    handleStationInput(event, type) {
        const query = event.target.value.trim();
        
        // Clear any pending hide timeout
        if (this.hideTimeoutId) {
            clearTimeout(this.hideTimeoutId);
            this.hideTimeoutId = null;
        }
        
        if (query.length === 0) {
            this.hideSuggestions(type);
            this.clearStationSelection(type);
            return;
        }

        if (query.length < 2) {
            return;
        }

        const suggestions = this.stations.filter(station => 
            station.name.toLowerCase().includes(query.toLowerCase()) || 
            station.code.toLowerCase().includes(query.toLowerCase()) ||
            station.region.toLowerCase().includes(query.toLowerCase())
        );

        this.showSuggestions(suggestions, type);
        this.validateInputs();
    }

    showSuggestions(suggestions, type) {
        const suggestionsContainer = document.getElementById(`${type}-suggestions`);
        
        if (!suggestionsContainer) {
            console.error(`Suggestions container not found for ${type}`);
            return;
        }
        
        if (suggestions.length === 0) {
            suggestionsContainer.innerHTML = '<div class="suggestion-item">No stations found</div>';
            suggestionsContainer.classList.remove('hidden');
            return;
        }

        const suggestionsHTML = suggestions.slice(0, 6).map((station, index) => `
            <div class="suggestion-item" data-station='${JSON.stringify(station)}' data-index="${index}">
                <div class="suggestion-name">${station.name}</div>
                <div style="margin-top: 4px;">
                    <span class="suggestion-code">${station.code}</span>
                    <span class="suggestion-region">${station.region}</span>
                </div>
            </div>
        `).join('');

        suggestionsContainer.innerHTML = suggestionsHTML;
        suggestionsContainer.classList.remove('hidden');

        // Add click handlers
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            if (item.dataset.station) {
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const station = JSON.parse(item.dataset.station);
                    this.selectStation(station, type);
                });
                
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const station = JSON.parse(item.dataset.station);
                    this.selectStation(station, type);
                });
            }
        });
    }

    hideSuggestions(type) {
        const suggestionsContainer = document.getElementById(`${type}-suggestions`);
        if (suggestionsContainer) {
            suggestionsContainer.classList.add('hidden');
        }
    }

    handleKeyDown(event, type) {
        const suggestionsContainer = document.getElementById(`${type}-suggestions`);
        if (!suggestionsContainer || suggestionsContainer.classList.contains('hidden')) {
            return;
        }
        
        const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item[data-station]');
        
        if (suggestions.length === 0) return;

        const highlighted = suggestionsContainer.querySelector('.highlighted');
        let currentIndex = highlighted ? parseInt(highlighted.dataset.index) : -1;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                currentIndex = Math.min(currentIndex + 1, suggestions.length - 1);
                this.highlightSuggestion(suggestions, currentIndex);
                break;
            case 'ArrowUp':
                event.preventDefault();
                currentIndex = Math.max(currentIndex - 1, 0);
                this.highlightSuggestion(suggestions, currentIndex);
                break;
            case 'Enter':
                event.preventDefault();
                if (highlighted && highlighted.dataset.station) {
                    const station = JSON.parse(highlighted.dataset.station);
                    this.selectStation(station, type);
                }
                break;
            case 'Escape':
                this.hideSuggestions(type);
                break;
        }
    }

    highlightSuggestion(suggestions, index) {
        suggestions.forEach(item => item.classList.remove('highlighted'));
        if (suggestions[index]) {
            suggestions[index].classList.add('highlighted');
        }
    }

    selectStation(station, type) {
        const input = document.getElementById(`${type}-station`);
        if (input) {
            input.value = station.name;
        }
        
        if (type === 'from') {
            this.currentFromStation = station;
        } else {
            this.currentToStation = station;
        }
        
        this.hideSuggestions(type);
        this.validateInputs();
    }

    clearStationSelection(type) {
        if (type === 'from') {
            this.currentFromStation = null;
        } else {
            this.currentToStation = null;
        }
        this.validateInputs();
    }

    swapStations() {
        const fromInput = document.getElementById('from-station');
        const toInput = document.getElementById('to-station');
        
        if (!fromInput || !toInput) return;
        
        const tempValue = fromInput.value;
        const tempStation = this.currentFromStation;
        
        fromInput.value = toInput.value;
        this.currentFromStation = this.currentToStation;
        
        toInput.value = tempValue;
        this.currentToStation = tempStation;
        
        this.validateInputs();
    }

    validateInputs() {
        const searchButton = document.getElementById('search-trains');
        const fromInput = document.getElementById('from-station');
        const toInput = document.getElementById('to-station');
        
        if (!searchButton || !fromInput || !toInput) return;
        
        // Check if we have text in both fields and they are different
        const hasFromText = fromInput.value.trim().length > 0;
        const hasToText = toInput.value.trim().length > 0;
        const isDifferent = fromInput.value.trim() !== toInput.value.trim();
        
        const isValid = hasFromText && hasToText && isDifferent;
        
        // Also check if we have valid station objects for better validation
        if (isValid && this.currentFromStation && this.currentToStation) {
            searchButton.disabled = this.currentFromStation.code === this.currentToStation.code;
        } else {
            searchButton.disabled = !isValid;
        }
    }

    async searchTrains() {
        const fromInput = document.getElementById('from-station');
        const toInput = document.getElementById('to-station');
        
        if (!fromInput?.value.trim() || !toInput?.value.trim()) {
            this.showError('Please enter both departure and destination stations');
            return;
        }

        // If we don't have station objects, try to find them
        if (!this.currentFromStation) {
            this.currentFromStation = this.findStationByName(fromInput.value.trim());
        }
        if (!this.currentToStation) {
            this.currentToStation = this.findStationByName(toInput.value.trim());
        }

        if (!this.currentFromStation || !this.currentToStation) {
            this.showError('Please select valid stations from the suggestions');
            return;
        }

        this.showLoading();
        this.showResults();

        try {
            let data;
            
            if (this.currentApiMethod === 'sample') {
                // Create sample data for the selected route
                data = this.createSampleDataForRoute(this.currentFromStation, this.currentToStation);
                this.updateDataSourceStatus('Using sample data', 'fallback');
            } else {
                data = await this.fetchTrainData();
                this.updateDataSourceStatus('Live data loaded successfully', 'live');
            }

            this.displayTrains(data);
            this.updateLastUpdated();
        } catch (error) {
            console.error('Error fetching train data:', error);
            
            // Fallback to sample data
            if (this.currentApiMethod !== 'sample') {
                this.updateDataSourceStatus('Live data failed - using sample data', 'fallback');
                const fallbackData = this.createSampleDataForRoute(this.currentFromStation, this.currentToStation);
                this.displayTrains(fallbackData);
                this.updateLastUpdated();
                this.showError('Could not fetch live data. Showing sample data instead. Try a different API method or check CORS settings.');
            } else {
                this.showError('Failed to load train data');
            }
        } finally {
            this.hideLoading();
        }
    }

    findStationByName(name) {
        return this.stations.find(station => 
            station.name.toLowerCase() === name.toLowerCase()
        );
    }

    createSampleDataForRoute(fromStation, toStation) {
        return {
            services: this.sampleData.services.map((service, index) => ({
                ...service,
                serviceUid: `P${12345 + index}`,
                trainIdentity: `${index + 1}${String.fromCharCode(65 + index)}${20 + index}`,
                locations: [
                    {
                        ...service.locations[0],
                        crs: fromStation.code,
                        description: fromStation.name
                    },
                    {
                        ...service.locations[1],
                        crs: toStation.code,
                        description: toStation.name
                    }
                ]
            }))
        };
    }

    async fetchTrainData() {
        const url = this.buildApiUrl();
        const headers = this.buildHeaders();

        let fetchUrl = url;
        let options = { headers };

        // Apply CORS proxy if needed
        if (this.currentApiMethod === 'proxy1') {
            fetchUrl = this.corsProxies.proxy1 + url;
        } else if (this.currentApiMethod === 'proxy2') {
            fetchUrl = this.corsProxies.proxy2 + encodeURIComponent(url);
            options = {}; // AllOrigins doesn't support custom headers
        }

        const response = await fetch(fetchUrl, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let data = await response.json();
        
        // Handle AllOrigins response format
        if (this.currentApiMethod === 'proxy2' && data.contents) {
            data = JSON.parse(data.contents);
        }

        return data;
    }

    buildApiUrl() {
        return this.apiConfig.baseUrl
            .replace('{from}', this.currentFromStation.code)
            .replace('{to}', this.currentToStation.code);
    }

    buildHeaders() {
        const auth = btoa(`${this.apiConfig.username}:${this.apiConfig.password}`);
        return {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        };
    }

    displayTrains(data) {
        const resultsContainer = document.getElementById('train-results');
        const routeDisplay = document.getElementById('route-display');
        const errorElement = document.getElementById('error-message');
        
        if (!resultsContainer || !routeDisplay) {
            console.error('Required elements not found');
            return;
        }
        
        // Clear any previous errors
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
        
        routeDisplay.textContent = `${this.currentFromStation.name} → ${this.currentToStation.name}`;

        if (!data || !data.services || data.services.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <h4>No trains found</h4>
                    <p>No direct services available for this route at the moment.</p>
                </div>
            `;
            return;
        }

        const londonOvergroundCheckbox = document.getElementById('london-overground');
        const londonOvergroundEnabled = londonOvergroundCheckbox ? londonOvergroundCheckbox.checked : true;
        let services = data.services;

        // Filter London Overground if disabled
        if (!londonOvergroundEnabled) {
            services = services.filter(service => 
                service.atocCode !== 'LO' && 
                service.operator !== 'London Overground' &&
                service.atocName !== 'London Overground'
            );
        }

        if (services.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <h4>No trains found</h4>
                    <p>No services match your criteria. Try enabling London Overground.</p>
                </div>
            `;
            return;
        }

        const trainsHTML = services.map(service => this.renderTrainCard(service)).join('');
        resultsContainer.innerHTML = trainsHTML;
    }

    renderTrainCard(service) {
        if (!service.locations || service.locations.length < 2) {
            return '';
        }

        const departureLocation = service.locations[0];
        const arrivalLocation = service.locations[service.locations.length - 1];
        
        const departureTime = departureLocation.realtimeDeparture || departureLocation.gbttBookedDeparture;
        const arrivalTime = arrivalLocation.realtimeArrival || arrivalLocation.gbttBookedArrival;
        
        const duration = this.calculateDuration(departureTime, arrivalTime);
        const operator = service.operator || service.atocName || 'Unknown Operator';
        const trainId = service.trainIdentity || service.serviceUid?.slice(-4) || 'N/A';

        return `
            <div class="train-card">
                <div class="train-header">
                    <div class="train-operator">${operator}</div>
                    <div class="train-times">
                        <span class="time-departure">${this.formatTime(departureTime)}</span>
                        <span>→</span>
                        <span class="time-arrival">${this.formatTime(arrivalTime)}</span>
                        <span class="duration">${duration}</span>
                    </div>
                </div>
                <div class="train-details">
                    <div class="detail-item">
                        <span class="detail-label">Train ID</span>
                        <span class="detail-value">${trainId}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Departure Platform</span>
                        <span class="detail-value">
                            <span class="platform">${departureLocation.platform || 'TBA'}</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Arrival Platform</span>
                        <span class="detail-value">
                            <span class="platform">${arrivalLocation.platform || 'TBA'}</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Service Type</span>
                        <span class="detail-value">${service.serviceType || 'Train'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    formatTime(timeString) {
        if (!timeString) return 'TBA';
        const timeStr = String(timeString).padStart(4, '0');
        return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
    }

    calculateDuration(departureTime, arrivalTime) {
        if (!departureTime || !arrivalTime) return 'Unknown';
        
        const depStr = String(departureTime).padStart(4, '0');
        const arrStr = String(arrivalTime).padStart(4, '0');
        
        const depMinutes = parseInt(depStr.slice(0, 2)) * 60 + parseInt(depStr.slice(2));
        const arrMinutes = parseInt(arrStr.slice(0, 2)) * 60 + parseInt(arrStr.slice(2));
        
        let duration = arrMinutes - depMinutes;
        if (duration < 0) duration += 24 * 60; // Handle next day arrival
        
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    showLoading() {
        const loadingIndicator = document.getElementById('loading-indicator');
        const trainResults = document.getElementById('train-results');
        const errorMessage = document.getElementById('error-message');
        
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
        if (trainResults) trainResults.innerHTML = '';
        if (errorMessage) errorMessage.classList.add('hidden');
    }

    hideLoading() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }

    showResults() {
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) resultsContainer.classList.remove('hidden');
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    updateDataSourceStatus(message, type = 'info') {
        const statusElement = document.getElementById('data-source-status');
        if (!statusElement) return;
        
        statusElement.textContent = message;
        
        // Reset classes
        statusElement.className = 'status';
        
        // Add appropriate class
        switch (type) {
            case 'live':
                statusElement.classList.add('status--live');
                break;
            case 'fallback':
                statusElement.classList.add('status--fallback');
                break;
            case 'error':
                statusElement.classList.add('status--error');
                break;
            default:
                statusElement.classList.add('status--info');
        }
    }

    updateLastUpdated() {
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            lastUpdatedElement.textContent = `Last updated: ${timeString}`;
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Train Tracker...');
    new TrainTracker();
});
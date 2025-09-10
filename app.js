// Enhanced Train Tracker with Debug Tools - FIXED AllOrigins Handling
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
            direct: "",
            proxy1: "https://cors-anywhere.herokuapp.com/",
            proxy2: "https://api.allorigins.win/get?url=",
            proxy3: "https://api.codetabs.com/v1/proxy?quest="
        };

        this.sampleData = {
            services: [
                {
                    locationDetail: {
                        origin: [{ description: "Watford Junction", crs: "WFJ" }],
                        destination: [{ description: "London Euston", crs: "EUS" }],
                        gbttBookedDeparture: "1830",
                        realtimeDeparture: "1832",
                        platform: "2"
                    },
                    serviceUid: "P12345",
                    runDate: "2025-09-10",
                    trainIdentity: "1A23",
                    atocCode: "LO",
                    atocName: "London Overground",
                    serviceType: "train",
                    isPassenger: true
                },
                {
                    locationDetail: {
                        origin: [{ description: "Watford Junction", crs: "WFJ" }],
                        destination: [{ description: "London Euston", crs: "EUS" }],
                        gbttBookedDeparture: "1845",
                        realtimeDeparture: "1845",
                        platform: "1"
                    },
                    serviceUid: "P67890",
                    runDate: "2025-09-10",
                    trainIdentity: "2B34",
                    atocCode: "AW",
                    atocName: "Avanti West Coast",
                    serviceType: "train",
                    isPassenger: true
                }
            ]
        };

        this.logs = [];
        this.currentResponse = null;
        this.logStats = {
            total: 0,
            success: 0,
            error: 0
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupAutocomplete();
        this.updateGeneratedUrl();
        this.updateRealtimeTrainsLink();
        console.log('Train Tracker initialized with fixed AllOrigins handling');
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Main tab events
        document.getElementById('search-trains')?.addEventListener('click', () => this.searchTrains());
        document.getElementById('swap-stations')?.addEventListener('click', () => this.swapStations());
        
        // Station inputs
        document.getElementById('from-station')?.addEventListener('input', (e) => this.handleStationInput(e, 'from'));
        document.getElementById('to-station')?.addEventListener('input', (e) => this.handleStationInput(e, 'to'));

        // Debug tab events
        document.getElementById('test-api')?.addEventListener('click', () => this.testApi());
        document.getElementById('clear-logs')?.addEventListener('click', () => this.clearLogs());
        document.getElementById('copy-url')?.addEventListener('click', () => this.copyUrl());
        
        // Debug form changes
        document.getElementById('debug-from')?.addEventListener('input', () => {
            this.updateGeneratedUrl();
            this.updateRealtimeTrainsLink();
        });
        document.getElementById('debug-to')?.addEventListener('input', () => {
            this.updateGeneratedUrl();
            this.updateRealtimeTrainsLink();
        });
        document.getElementById('debug-method')?.addEventListener('change', () => this.updateGeneratedUrl());

        // Log filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterLogs(e.target.dataset.filter));
        });

        // Inspector tabs
        document.querySelectorAll('.inspector-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchInspectorTab(e.target.dataset.tab));
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('tab-button--active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('tab-content--active', content.id === `${tabName}-tab`);
        });
    }

    setupAutocomplete() {
        const setupInput = (inputId, dropdownId) => {
            const input = document.getElementById(inputId);
            const dropdown = document.getElementById(dropdownId);
            
            if (!input || !dropdown) return;

            input.addEventListener('input', (e) => {
                const value = e.target.value.toLowerCase();
                if (value.length < 2) {
                    dropdown.classList.remove('show');
                    return;
                }

                const matches = this.stations.filter(station => 
                    station.name.toLowerCase().includes(value) || 
                    station.code.toLowerCase().includes(value)
                ).slice(0, 5);

                if (matches.length === 0) {
                    dropdown.classList.remove('show');
                    return;
                }

                dropdown.innerHTML = matches.map(station => 
                    `<div class="autocomplete-item" data-station="${station.name} (${station.code})">
                        <strong>${station.name}</strong> (${station.code})<br>
                        <small>${station.region}</small>
                    </div>`
                ).join('');

                dropdown.classList.add('show');

                dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                    item.addEventListener('click', () => {
                        input.value = item.dataset.station;
                        dropdown.classList.remove('show');
                    });
                });
            });

            input.addEventListener('blur', () => {
                setTimeout(() => dropdown.classList.remove('show'), 200);
            });
        };

        setupInput('from-station', 'from-suggestions');
        setupInput('to-station', 'to-suggestions');
    }

    extractStationCode(stationText) {
        const match = stationText.match(/\(([A-Z]{3,4})\)/);
        return match ? match[1] : stationText.substring(0, 3).toUpperCase();
    }

    swapStations() {
        const fromInput = document.getElementById('from-station');
        const toInput = document.getElementById('to-station');
        
        if (fromInput && toInput) {
            const temp = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = temp;
        }
    }

    async searchTrains() {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const results = document.getElementById('results');
        const statusElement = document.getElementById('data-source-status');

        // Show loading
        loading?.classList.remove('hidden');
        error?.classList.add('hidden');
        results && (results.innerHTML = '');

        try {
            const fromStation = document.getElementById('from-station')?.value;
            const toStation = document.getElementById('to-station')?.value;
            const method = document.getElementById('api-method')?.value || 'proxy2';

            const fromCode = this.extractStationCode(fromStation);
            const toCode = this.extractStationCode(toStation);

            statusElement && (statusElement.textContent = 'Searching...');
            statusElement?.classList.remove('status--info', 'status--success', 'status--error');
            statusElement?.classList.add('status--warning');

            // Use the same makeApiCall function as debug tab
            const response = await this.makeApiCall(fromCode, toCode, method, false);
            
            if (response && response.services && response.services.length > 0) {
                this.displayTrains(response.services);
                statusElement && (statusElement.textContent = `Found ${response.services.length} trains`);
                statusElement?.classList.remove('status--warning');
                statusElement?.classList.add('status--success');
                
                document.getElementById('last-update')?.textContent = 
                    `Last updated: ${new Date().toLocaleTimeString()}`;
            } else {
                throw new Error('No trains found');
            }
        } catch (err) {
            console.error('Search error:', err);
            error?.classList.remove('hidden');
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) {
                errorMessage.textContent = err.message;
            }
            
            statusElement && (statusElement.textContent = 'Search failed');
            statusElement?.classList.remove('status--warning');
            statusElement?.classList.add('status--error');
        } finally {
            loading?.classList.add('hidden');
        }
    }

    displayTrains(services) {
        const results = document.getElementById('results');
        const showOverground = document.getElementById('show-overground')?.checked;
        
        if (!results) return;

        let filteredServices = services;
        if (!showOverground) {
            filteredServices = services.filter(service => 
                !service.atocName?.toLowerCase().includes('overground')
            );
        }

        // Limit to 2 trains
        filteredServices = filteredServices.slice(0, 2);

        if (filteredServices.length === 0) {
            results.innerHTML = '<div class="card"><div class="card__body"><p>No trains match your criteria. Try enabling London Overground or adjusting your search.</p></div></div>';
            return;
        }

        results.innerHTML = filteredServices.map(service => {
            const locationDetail = service.locationDetail || {};
            const scheduledTime = this.formatTime(locationDetail.gbttBookedDeparture || '0000');
            const expectedTime = this.formatTime(locationDetail.realtimeDeparture || locationDetail.gbttBookedDeparture || '0000');
            const platform = locationDetail.platform || 'TBA';
            const operator = service.atocName || 'Unknown';
            const isDelayed = expectedTime !== scheduledTime;
            
            return `
                <div class="card">
                    <div class="card__body">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                            <div>
                                <div style="font-size: 1.5rem; font-weight: bold; ${isDelayed ? 'color: var(--color-error)' : ''}">
                                    ${scheduledTime}
                                </div>
                                ${isDelayed ? `<div style="color: var(--color-error); font-size: 0.875rem;">Expected: ${expectedTime}</div>` : ''}
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.875rem; color: var(--color-text-subtle);">Platform</div>
                                <div style="font-size: 1.25rem; font-weight: bold;">${platform}</div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.875rem;">
                            <div><strong>Operator:</strong> ${operator}</div>
                            <div><strong>Status:</strong> <span class="status ${isDelayed ? 'status--error' : 'status--success'}">${isDelayed ? 'Delayed' : 'On time'}</span></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatTime(timeStr) {
        if (!timeStr || timeStr.length !== 4) return 'TBA';
        return `${timeStr.substring(0, 2)}:${timeStr.substring(2)}`;
    }

    // Debug Tab Functions
    updateGeneratedUrl() {
        const fromCode = document.getElementById('debug-from')?.value || 'WFJ';
        const toCode = document.getElementById('debug-to')?.value || 'EUS';
        const method = document.getElementById('debug-method')?.value || 'direct';

        const baseUrl = this.apiConfig.baseUrl.replace('{from}', fromCode).replace('{to}', toCode);
        let finalUrl = baseUrl;

        if (method === 'proxy1') {
            finalUrl = this.corsProxies.proxy1 + encodeURIComponent(baseUrl);
        } else if (method === 'proxy2') {
            finalUrl = this.corsProxies.proxy2 + encodeURIComponent(baseUrl);
        } else if (method === 'proxy3') {
            finalUrl = this.corsProxies.proxy3 + encodeURIComponent(baseUrl);
        }

        document.getElementById('generated-url').textContent = finalUrl;
    }

    updateRealtimeTrainsLink() {
        const fromCode = document.getElementById('debug-from')?.value || 'WFJ';
        const toCode = document.getElementById('debug-to')?.value || 'EUS';
        
        const link = document.getElementById('realtimetrains-link');
        if (link) {
            const today = new Date().toISOString().split('T')[0];
            link.href = `https://www.realtimetrains.co.uk/search/detailed/${today}/${fromCode}/dep`;
        }
    }

    async testApi() {
        const fromCode = document.getElementById('debug-from')?.value || 'WFJ';
        const toCode = document.getElementById('debug-to')?.value || 'EUS';
        const method = document.getElementById('debug-method')?.value || 'direct';

        try {
            const response = await this.makeApiCall(fromCode, toCode, method, true);
            console.log('Test API response:', response);
        } catch (error) {
            console.error('Test API error:', error);
        }
    }

    // FIXED: Unified API call function with proper AllOrigins handling
    async makeApiCall(fromCode, toCode, method, isDebugCall = false) {
        const startTime = Date.now();
        const baseUrl = this.apiConfig.baseUrl.replace('{from}', fromCode).replace('{to}', toCode);
        let finalUrl = baseUrl;
        let useAllOriginsWorkaround = false;

        // Handle sample data
        if (method === 'sample') {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
            return this.sampleData;
        }

        // Determine final URL based on method
        if (method === 'proxy1') {
            finalUrl = this.corsProxies.proxy1 + encodeURIComponent(baseUrl);
        } else if (method === 'proxy2') {
            finalUrl = this.corsProxies.proxy2 + encodeURIComponent(baseUrl);
            useAllOriginsWorkaround = true;
        } else if (method === 'proxy3') {
            finalUrl = this.corsProxies.proxy3 + encodeURIComponent(baseUrl);
        }

        const credentials = btoa(`${this.apiConfig.username}:${this.apiConfig.password}`);
        const headers = {
            'Authorization': `Basic ${credentials}`,
            'Accept': 'application/json'
        };

        let logEntry = {
            timestamp: new Date().toISOString(),
            method: method.toUpperCase(),
            url: finalUrl,
            fromCode,
            toCode,
            success: false,
            error: null,
            responseTime: 0,
            response: null,
            headers: headers
        };

        try {
            console.log(`Making API call: ${method} ${fromCode} → ${toCode}`);
            console.log(`URL: ${finalUrl}`);

            const response = await fetch(finalUrl, {
                method: 'GET',
                headers,
                mode: 'cors'
            });

            const responseTime = Date.now() - startTime;
            logEntry.responseTime = responseTime;

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            let data = await response.text();
            console.log('Raw response:', data.substring(0, 200) + '...');
            
            // FIXED: Consistent AllOrigins wrapper handling
            if (useAllOriginsWorkaround) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.contents) {
                        console.log('Unwrapping AllOrigins response');
                        data = parsed.contents;
                    } else {
                        console.log('AllOrigins response format unexpected:', Object.keys(parsed));
                    }
                } catch (parseError) {
                    console.log('Failed to parse AllOrigins wrapper, using raw response');
                }
            }

            let jsonData;
            try {
                jsonData = JSON.parse(data);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Raw data:', data.substring(0, 500));
                throw new Error(`JSON Parse Error: ${parseError.message}`);
            }
            
            logEntry.success = true;
            logEntry.response = jsonData;
            this.logStats.success++;

            if (isDebugCall) {
                this.currentResponse = {
                    headers: Object.fromEntries(response.headers.entries()),
                    json: jsonData,
                    parsed: this.parseTrainData(jsonData)
                };
                this.updateInspectorContent();
            }

            this.addLogEntry(logEntry);
            console.log(`API call successful: ${jsonData.services?.length || 0} services found`);
            return jsonData;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            logEntry.responseTime = responseTime;
            logEntry.success = false;
            logEntry.error = error.message;
            this.logStats.error++;

            // Classify error type
            if (error.message.includes('CORS') || error.message.includes('fetch') || error.name === 'TypeError') {
                logEntry.errorType = 'CORS';
            } else if (error.message.includes('timeout')) {
                logEntry.errorType = 'TIMEOUT';
            } else if (error.message.includes('HTTP')) {
                logEntry.errorType = 'HTTP';
            } else if (error.message.includes('JSON Parse')) {
                logEntry.errorType = 'JSON';
            } else {
                logEntry.errorType = 'UNKNOWN';
            }

            console.error(`API call failed (${method}):`, error.message);
            this.addLogEntry(logEntry);
            throw error;
        }
    }

    parseTrainData(data) {
        if (!data || !data.services) {
            return { trains: [], summary: 'No train data available' };
        }

        const trains = data.services.map(service => {
            const locationDetail = service.locationDetail || {};
            return {
                operator: service.atocName,
                scheduledDeparture: this.formatTime(locationDetail.gbttBookedDeparture),
                expectedDeparture: this.formatTime(locationDetail.realtimeDeparture || locationDetail.gbttBookedDeparture),
                platform: locationDetail.platform || 'TBA',
                trainId: service.trainIdentity,
                serviceUid: service.serviceUid
            };
        });

        return {
            trains,
            summary: `Found ${trains.length} trains`,
            location: data.location
        };
    }

    addLogEntry(entry) {
        this.logs.unshift(entry);
        this.logStats.total++;
        
        // Keep only last 50 logs
        if (this.logs.length > 50) {
            this.logs = this.logs.slice(0, 50);
        }

        this.updateLogDisplay();
        this.updateLogStats();
    }

    updateLogDisplay() {
        const container = document.getElementById('debug-logs');
        if (!container || this.logs.length === 0) {
            container && (container.innerHTML = '<div class="log-placeholder">📄 API calls will be logged here. Try making a test call above.</div>');
            return;
        }

        const currentFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        let filteredLogs = this.logs;

        if (currentFilter === 'success') {
            filteredLogs = this.logs.filter(log => log.success);
        } else if (currentFilter === 'error') {
            filteredLogs = this.logs.filter(log => !log.success);
        } else if (currentFilter === 'cors') {
            filteredLogs = this.logs.filter(log => log.errorType === 'CORS');
        }

        container.innerHTML = filteredLogs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            const statusClass = log.success ? 'log-status-success' : 'log-status-error';
            const status = log.success ? `✅ ${log.responseTime}ms` : `❌ ${log.error}`;

            return `
                <div class="log-entry">
                    <div class="log-timestamp">[${timestamp}]</div>
                    <div><span class="log-method">${log.method}</span> <span class="log-url">${log.fromCode} → ${log.toCode}</span></div>
                    <div class="${statusClass}">${status}</div>
                    ${log.success && log.response ? 
                        `<div class="log-details">Services: ${log.response.services?.length || 0}</div>` : 
                        log.error ? `<div class="log-details">Error: ${log.error}</div>` : ''
                    }
                </div>
            `;
        }).join('');
    }

    updateLogStats() {
        document.getElementById('log-count').textContent = `${this.logStats.total} entries`;
        const successRate = this.logStats.total > 0 ? Math.round((this.logStats.success / this.logStats.total) * 100) : 0;
        document.getElementById('success-rate').textContent = `${successRate}% success`;
    }

    filterLogs(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.updateLogDisplay();
    }

    clearLogs() {
        this.logs = [];
        this.logStats = { total: 0, success: 0, error: 0 };
        this.updateLogDisplay();
        this.updateLogStats();
        
        const container = document.getElementById('inspector-content');
        if (container) {
            container.innerHTML = '<div class="inspector-placeholder">Make an API call to see detailed response information</div>';
        }
    }

    copyUrl() {
        const url = document.getElementById('generated-url').textContent;
        navigator.clipboard.writeText(url).then(() => {
            const btn = document.getElementById('copy-url');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    }

    switchInspectorTab(tabName) {
        document.querySelectorAll('.inspector-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        this.updateInspectorContent(tabName);
    }

    updateInspectorContent(activeTab = 'headers') {
        const container = document.getElementById('inspector-content');
        if (!container || !this.currentResponse) {
            container && (container.innerHTML = '<div class="inspector-placeholder">Make an API call to see detailed response information</div>');
            return;
        }

        let content = '';

        switch (activeTab) {
            case 'headers':
                content = Object.entries(this.currentResponse.headers)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n') || 'No headers available';
                break;
            case 'json':
                content = JSON.stringify(this.currentResponse.json, null, 2);
                break;
            case 'parsed':
                content = JSON.stringify(this.currentResponse.parsed, null, 2);
                break;
        }

        container.innerHTML = `<pre>${content}</pre>`;
    }

    handleStationInput(event, type) {
        // Basic implementation for demo
        const value = event.target.value;
        console.log(`Station input (${type}):`, value);
    }
}

// Global functions for HTML onclick handlers
function switchToDebugTab() {
    window.trainTracker?.switchTab('debug');
}

function copyGeneratedUrl() {
    const url = document.getElementById('generated-url').textContent;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => btn.textContent = originalText, 1000);
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.trainTracker = new TrainTracker();
    console.log('Enhanced Train Tracker with Fixed AllOrigins handling initialized');
});
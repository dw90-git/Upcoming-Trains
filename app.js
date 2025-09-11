// Train Departures App - Rail Data Marketplace Darwin API
class TrainDepartureApp {
    constructor() {
        // Rail Data Marketplace API Configuration
        this.apiConfig = {
            // Authentication endpoint to get bearer token
            authUrl: 'https://raildata.org.uk/api/auth/login',
            // Live Departure Board API endpoint
            baseUrl: 'https://api1.raildata.org.uk/1010-live-departure-board-dep1_2/LDBWS/api/20220120/GetNextDepartures',
            // Your RDM consumer credentials
            consumerGroup: 'SC-90bc7a51-7c23-4a69-b1af-85e1fd58e576',
            consumerUsername: 'GED7XXJEFEXZ4V5T',
            consumerPassword: 'cfltE08pqt//Vb3Dhu3GG/rFAx7cej54aMeux5NgwbE3jp08fGWBD18+7VmMBfSg'
        };

        this.refreshInterval = 60000; // 60 seconds
        this.maxTrains = 2;
        this.countdownInterval = null;
        this.autoRefreshInterval = null;
        this.autoRefreshCountdown = 60;
        this.bearerToken = null;

        this.elements = {
            loadingState: document.getElementById('loadingState'),
            errorState: document.getElementById('errorState'),
            noTrainsState: document.getElementById('noTrainsState'),
            trainsContainer: document.getElementById('trainsContainer'),
            refreshBtn: document.getElementById('refreshBtn'),
            retryBtn: document.getElementById('retryBtn'),
            errorMessage: document.getElementById('errorMessage'),
            countdown: document.getElementById('countdown')
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTrains();
        this.startAutoRefresh();
    }

    bindEvents() {
        this.elements.refreshBtn.addEventListener('click', () => {
            this.loadTrains();
            this.resetAutoRefresh();
        });

        this.elements.retryBtn.addEventListener('click', () => {
            this.loadTrains();
            this.resetAutoRefresh();
        });
    }

    // Authenticate and get bearer token
    async authenticateRDM() {
        try {
            const response = await fetch(this.apiConfig.authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: this.apiConfig.consumerUsername,
                    password: this.apiConfig.consumerPassword
                })
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const authData = await response.json();
            this.bearerToken = authData.token || authData.access_token;

            if (!this.bearerToken) {
                throw new Error('No token received from authentication');
            }

            return this.bearerToken;
        } catch (error) {
            console.error('Authentication error:', error);
            throw new Error('Failed to authenticate with Rail Data Marketplace');
        }
    }

    async loadTrains() {
        this.showLoadingState();
        this.elements.refreshBtn.classList.add('refreshing');

        try {
            // Authenticate first if we don't have a valid token
            if (!this.bearerToken) {
                await this.authenticateRDM();
            }

            // Get next departures from WFJ to EUS
            const response = await fetch(`${this.apiConfig.baseUrl}/WFJ/to/EUS/2`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.bearerToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                // Token expired, re-authenticate and retry
                this.bearerToken = null;
                await this.authenticateRDM();

                const retryResponse = await fetch(`${this.apiConfig.baseUrl}/WFJ/to/EUS/2`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.bearerToken}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (!retryResponse.ok) {
                    throw new Error(`API request failed: ${retryResponse.status} ${retryResponse.statusText}`);
                }

                const data = await retryResponse.json();
                this.displayTrains(data);
            } else if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            } else {
                const data = await response.json();
                this.displayTrains(data);
            }

        } catch (error) {
            console.error('Error loading trains:', error);
            this.showErrorState(error.message);
        } finally {
            this.elements.refreshBtn.classList.remove('refreshing');
        }
    }

    displayTrains(data) {
        // Handle different possible response formats from RDM API
        let services = [];

        if (data.departures && data.departures.service) {
            services = Array.isArray(data.departures.service) ? data.departures.service : [data.departures.service];
        } else if (data.services) {
            services = Array.isArray(data.services) ? data.services : [data.services];
        } else if (data.nextDepartures) {
            services = Array.isArray(data.nextDepartures) ? data.nextDepartures : [data.nextDepartures];
        }

        if (services.length === 0) {
            this.showNoTrainsState();
            return;
        }

        // Sort by departure time and limit to maxTrains
        const upcomingTrains = services
            .sort((a, b) => {
                const timeA = a.etd || a.std || a.scheduledDeparture || a.estimatedDeparture;
                const timeB = b.etd || b.std || b.scheduledDeparture || b.estimatedDeparture;
                return (timeA || '').localeCompare(timeB || '');
            })
            .slice(0, this.maxTrains);

        this.renderTrains(upcomingTrains);
        this.showTrainsState();
    }

    renderTrains(trains) {
        const container = this.elements.trainsContainer;
        container.innerHTML = '';

        trains.forEach((train, index) => {
            const trainCard = this.createTrainCard(train, index);
            container.appendChild(trainCard);
        });
    }

    createTrainCard(train, index) {
        // Handle different response formats from RDM API
        const scheduledTime = train.std || train.scheduledDeparture;
        const realtimeTime = train.etd || train.estimatedDeparture;
        const platform = train.platform || 'TBC';
        const operator = train.operatorName || train.operator || train.toc || 'Unknown';
        const destination = train.destination ? 
            (Array.isArray(train.destination) ? train.destination[0].locationName : train.destination) : 
            'London Euston';

        // Calculate delay status
        const delayStatus = this.calculateDelayStatus(scheduledTime, realtimeTime);

        // Calculate countdown
        const departureTime = realtimeTime || scheduledTime;
        const countdown = this.calculateCountdown(departureTime);

        const card = document.createElement('div');
        card.className = `train-card train-card--${delayStatus.class}`;

        card.innerHTML = `
            <div class="train-card__header">
                <div class="train-card__number">${index + 1}</div>
                <div class="train-card__status">
                    <span class="status-badge status-badge--${delayStatus.class}">
                        ${delayStatus.text}
                    </span>
                </div>
            </div>

            <div class="train-card__main">
                <div class="train-card__time">
                    <div class="time-display">
                        <span class="time-display__main">${this.formatTime(departureTime)}</span>
                        ${realtimeTime !== scheduledTime ? `
                            <span class="time-display__scheduled">(${this.formatTime(scheduledTime)})</span>
                        ` : ''}
                    </div>
                    <div class="countdown">${countdown}</div>
                </div>

                <div class="train-card__details">
                    <div class="detail-item">
                        <span class="detail-label">Platform</span>
                        <span class="detail-value platform-${platform.toLowerCase()}">${platform}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Operator</span>
                        <span class="detail-value">${operator}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">To</span>
                        <span class="detail-value">${destination}</span>
                    </div>
                </div>
            </div>
        `;

        return card;
    }

    calculateDelayStatus(scheduledTime, realtimeTime) {
        if (!realtimeTime || realtimeTime === scheduledTime || realtimeTime === "On time") {
            return { class: 'on-time', text: 'On Time' };
        }

        if (realtimeTime === "Delayed" || realtimeTime === "Cancelled") {
            return { class: 'major-delay', text: realtimeTime };
        }

        // Try to calculate delay in minutes if times are in HH:MM format
        if (scheduledTime && realtimeTime && scheduledTime.includes(':') && realtimeTime.includes(':')) {
            const scheduledMinutes = this.timeToMinutes(scheduledTime.replace(':', ''));
            const realtimeMinutes = this.timeToMinutes(realtimeTime.replace(':', ''));
            const delayMinutes = realtimeMinutes - scheduledMinutes;

            if (delayMinutes <= 0) {
                return { class: 'on-time', text: 'On Time' };
            } else if (delayMinutes <= 5) {
                return { class: 'minor-delay', text: `${delayMinutes}min late` };
            } else {
                return { class: 'major-delay', text: `${delayMinutes}min late` };
            }
        }

        return { class: 'on-time', text: realtimeTime };
    }

    calculateCountdown(departureTime) {
        if (!departureTime) return 'Unknown';

        let timeStr = departureTime;
        if (timeStr === "On time" || timeStr === "Delayed" || timeStr === "Cancelled") {
            return timeStr;
        }

        // Handle different time formats
        if (timeStr.includes(':')) {
            const now = new Date();
            const departure = this.parseTimeToday(timeStr);

            if (departure < now) {
                departure.setDate(departure.getDate() + 1);
            }

            const diffMinutes = Math.floor((departure - now) / (1000 * 60));

            if (diffMinutes < 0) {
                return 'Departed';
            } else if (diffMinutes === 0) {
                return 'Due now';
            } else if (diffMinutes === 1) {
                return '1 minute';
            } else if (diffMinutes < 60) {
                return `${diffMinutes} minutes`;
            } else {
                const hours = Math.floor(diffMinutes / 60);
                const mins = diffMinutes % 60;
                return `${hours}h ${mins}m`;
            }
        }

        return timeStr;
    }

    timeToMinutes(timeString) {
        if (!timeString || timeString.length < 4) return 0;
        const hours = parseInt(timeString.substring(0, 2));
        const minutes = parseInt(timeString.substring(2, 4));
        return hours * 60 + minutes;
    }

    parseTimeToday(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    formatTime(timeString) {
        if (!timeString) return 'TBC';
        if (timeString === "On time" || timeString === "Delayed" || timeString === "Cancelled") {
            return timeString;
        }
        if (timeString.includes(':')) return timeString;
        if (timeString.length === 4) {
            return `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`;
        }
        return timeString;
    }

    startAutoRefresh() {
        this.startCountdown();

        this.autoRefreshInterval = setInterval(() => {
            this.loadTrains();
            this.resetAutoRefresh();
        }, this.refreshInterval);
    }

    startCountdown() {
        this.autoRefreshCountdown = 60;
        this.updateCountdownDisplay();

        this.countdownInterval = setInterval(() => {
            this.autoRefreshCountdown--;
            this.updateCountdownDisplay();

            if (this.autoRefreshCountdown <= 0) {
                clearInterval(this.countdownInterval);
            }
        }, 1000);
    }

    updateCountdownDisplay() {
        if (this.elements.countdown) {
            this.elements.countdown.textContent = this.autoRefreshCountdown;
        }
    }

    resetAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.startAutoRefresh();
    }

    showLoadingState() {
        this.hideAllStates();
        this.elements.loadingState.classList.remove('hidden');
    }

    showTrainsState() {
        this.hideAllStates();
        this.elements.trainsContainer.classList.remove('hidden');
    }

    showErrorState(message) {
        this.hideAllStates();
        this.elements.errorState.classList.remove('hidden');
        this.elements.errorMessage.textContent = message;
    }

    showNoTrainsState() {
        this.hideAllStates();
        this.elements.noTrainsState.classList.remove('hidden');
    }

    hideAllStates() {
        this.elements.loadingState.classList.add('hidden');
        this.elements.errorState.classList.add('hidden');
        this.elements.noTrainsState.classList.add('hidden');
        this.elements.trainsContainer.classList.add('hidden');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrainDepartureApp();
});
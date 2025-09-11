// Train Departures App
class TrainDepartureApp {
    constructor() {
        // API Configuration - Updated with your RTT API credentials
        this.apiConfig = {
            baseUrl: 'https://api.rtt.io/api/v1/json/search/WFJ/to/EUS',
            // RTT API credentials configured
            username: 'rttapi_daz4590',
            password: '4b886b4940dfd3dbe7b659004994360ec8a34cbc'
        };

        this.refreshInterval = 60000; // 60 seconds
        this.maxTrains = 2;
        this.countdownInterval = null;
        this.autoRefreshInterval = null;
        this.autoRefreshCountdown = 60;

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

    async loadTrains() {
        this.showLoadingState();
        this.elements.refreshBtn.classList.add('refreshing');

        try {
            // API credentials configured and ready to use

            const response = await fetch(this.apiConfig.baseUrl, {
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + btoa(this.apiConfig.username + ':' + this.apiConfig.password),
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid API credentials. Please check your username and password.');
                } else if (response.status === 403) {
                    throw new Error('Access denied. Please check your API permissions.');
                } else if (response.status >= 500) {
                    throw new Error('RTT API service temporarily unavailable. Please try again later.');
                } else {
                    throw new Error(`API request failed with status ${response.status}`);
                }
            }

            const data = await response.json();
            this.displayTrains(data);

        } catch (error) {
            console.error('Error loading trains:', error);
            this.showErrorState(error.message);
        } finally {
            this.elements.refreshBtn.classList.remove('refreshing');
        }
    }

    displayTrains(data) {
        if (!data.services || data.services.length === 0) {
            this.showNoTrainsState();
            return;
        }

        // Sort by departure time and limit to maxTrains
        const upcomingTrains = data.services
            .filter(service => service.locationDetail)
            .sort((a, b) => {
                const timeA = a.locationDetail.realtimeDeparture || a.locationDetail.gbttBookedDeparture;
                const timeB = b.locationDetail.realtimeDeparture || b.locationDetail.gbttBookedDeparture;
                return timeA.localeCompare(timeB);
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
        const service = train.locationDetail;
        const scheduledTime = service.gbttBookedDeparture;
        const realtimeTime = service.realtimeDeparture;
        const platform = service.platform || 'TBC';
        const operator = train.atocName || 'Unknown';

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
                </div>
            </div>
        `;

        return card;
    }

    calculateDelayStatus(scheduledTime, realtimeTime) {
        if (!realtimeTime || realtimeTime === scheduledTime) {
            return { class: 'on-time', text: 'On Time' };
        }

        const scheduledMinutes = this.timeToMinutes(scheduledTime);
        const realtimeMinutes = this.timeToMinutes(realtimeTime);
        const delayMinutes = realtimeMinutes - scheduledMinutes;

        if (delayMinutes <= 0) {
            return { class: 'on-time', text: 'On Time' };
        } else if (delayMinutes <= 5) {
            return { class: 'minor-delay', text: `${delayMinutes}min late` };
        } else {
            return { class: 'major-delay', text: `${delayMinutes}min late` };
        }
    }

    calculateCountdown(departureTime) {
        const now = new Date();
        const departure = this.parseTimeToday(departureTime);

        // Handle trains after midnight tomorrow
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

    timeToMinutes(timeString) {
        const hours = parseInt(timeString.substring(0, 2));
        const minutes = parseInt(timeString.substring(2, 4));
        return hours * 60 + minutes;
    }

    parseTimeToday(timeString) {
        const hours = parseInt(timeString.substring(0, 2));
        const minutes = parseInt(timeString.substring(2, 4));
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    formatTime(timeString) {
        if (!timeString || timeString.length !== 4) return 'TBC';
        return `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`;
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
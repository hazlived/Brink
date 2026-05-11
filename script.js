class EventManager {
    constructor() {
        this.events = [];
        this.currentEventId = null;
        this.overlayEnabled = false;
        this.countdownInterval = null;
        this.selectedColor = '#FFBF00';
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderInitialUI();
        if (this.events.length > 0) this.startCountdown();
    }

    // ── Storage (chrome.storage with localStorage fallback) ──

    async loadData() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const data = await chrome.storage.local.get(['events', 'currentEventId', 'overlayEnabled']);
                this.events = data.events || [];
                const stored = data.currentEventId;
                this.currentEventId = stored != null ? stored : (this.events[0]?.id ?? null);
                this.overlayEnabled = !!data.overlayEnabled;
            } else {
                const raw = localStorage.getItem('events');
                this.events = raw ? JSON.parse(raw) : [];
                const cid = localStorage.getItem('currentEventId');
                this.currentEventId = cid ? parseInt(cid, 10) : (this.events[0]?.id ?? null);
            }
        } catch {
            this.events = [];
            this.currentEventId = null;
        }
        this.events.sort((a, b) => a.dateTime - b.dateTime);
    }

    async saveData() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ events: this.events, currentEventId: this.currentEventId });
            } else {
                localStorage.setItem('events', JSON.stringify(this.events));
                localStorage.setItem('currentEventId', this.currentEventId);
            }
        } catch {}
    }

    // ── Event listeners ──

    setupEventListeners() {
        document.getElementById('eventForm').addEventListener('submit', e => this.addEvent(e));
        document.getElementById('addEventBtn').addEventListener('click', () => this.showFormSection());
        document.getElementById('manageBtn').addEventListener('click', () => this.showEventsSection());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideFormSection());
        document.getElementById('closeEventsBtn').addEventListener('click', () => this.hideEventsSection());
        document.getElementById('addFromListBtn').addEventListener('click', () => this.showFormSection());
        document.getElementById('overlayToggleBtn').addEventListener('click', () => this.toggleOverlay());

        document.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                this.selectedColor = dot.dataset.color;
            });
        });

        // Prevent past dates in the datetime picker
        const dtInput = document.getElementById('eventDateTime');
        const now = new Date();
        now.setSeconds(0, 0);
        const offset = now.getTimezoneOffset() * 60000;
        dtInput.min = new Date(now - offset).toISOString().slice(0, 16);
    }

    // ── CRUD ──

    addEvent(e) {
        e.preventDefault();
        const name = document.getElementById('eventName').value.trim();
        const dateTime = document.getElementById('eventDateTime').value;
        if (!name || !dateTime) return;

        const event = {
            id: Date.now(),
            name,
            dateTime: new Date(dateTime).getTime(),
            color: this.selectedColor,
            createdAt: Date.now()
        };

        this.events.push(event);
        this.events.sort((a, b) => a.dateTime - b.dateTime);
        if (!this.currentEventId) this.currentEventId = event.id;
        this.saveData();
        this.resetForm();
        this.hideFormSection();
        this.renderInitialUI();
        this.startCountdown();
        this.showToast('Event added!');
    }

    deleteEvent(id) {
        this.events = this.events.filter(e => e.id !== id);
        if (this.currentEventId === id) {
            this.currentEventId = this.events.length > 0 ? this.events[0].id : null;
        }
        this.saveData();
        this.renderInitialUI();
        if (this.events.length > 0) {
            this.startCountdown();
        } else {
            clearInterval(this.countdownInterval);
        }
        this.renderEventsList();
        this.showToast('Event deleted');
    }

    setCurrentEvent(id) {
        this.currentEventId = id;
        this.saveData();
        this.renderInitialUI();
        this.startCountdown();
        this.renderEventsList();
    }

    getCurrentEvent() {
        return this.events.find(e => e.id === this.currentEventId) || null;
    }

    // ── Countdown logic ──

    updateCountdown() {
        const event = this.getCurrentEvent();
        if (!event) return;

        const now = Date.now();
        const diff = event.dateTime - now;

        // Progress bar: how much of the total time has elapsed
        const total = event.dateTime - event.createdAt;
        const elapsed = now - event.createdAt;
        const pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 100;
        document.getElementById('progressBar').style.width = pct + '%';

        const countdownEl = document.getElementById('countdown');
        const timesUpEl = document.getElementById('timesUp');

        if (diff <= 0) {
            countdownEl.style.display = 'none';
            timesUpEl.classList.add('show');
            document.getElementById('timesUpSub').textContent = event.name;
            document.getElementById('urgencyBadge').className = 'urgency-badge';
            return;
        }

        countdownEl.style.display = 'flex';
        timesUpEl.classList.remove('show');

        const days    = Math.floor(diff / 86400000);
        const hours   = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        this.setDigit('days', days);
        this.setDigit('hours', hours);
        this.setDigit('minutes', minutes);
        this.setDigit('seconds', seconds);

        // Urgency badge
        const badge = document.getElementById('urgencyBadge');
        if (days < 1) {
            badge.textContent = 'Due Today';
            badge.className = 'urgency-badge show now';
        } else if (days <= 3) {
            badge.textContent = days === 1 ? '1 day left' : `${days} days left`;
            badge.className = 'urgency-badge show soon';
        } else if (days <= 7) {
            badge.textContent = `${days} days left`;
            badge.className = 'urgency-badge show week';
        } else {
            badge.className = 'urgency-badge';
        }
    }

    setDigit(id, value) {
        const el = document.getElementById(id);
        const str = value.toString().padStart(2, '0');
        if (el.textContent !== str) {
            el.classList.add('tick');
            setTimeout(() => el.classList.remove('tick'), 130);
            el.textContent = str;
        }
    }

    startCountdown() {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.updateCountdown();
        this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
    }

    // ── Rendering ──

    renderInitialUI() {
        const hasEvents = this.events.length > 0;
        const cancelBtn = document.getElementById('cancelBtn');

        document.getElementById('formSection').classList.toggle('active', !hasEvents);
        document.getElementById('countdownSection').classList.toggle('active', hasEvents);
        document.getElementById('eventsSection').classList.remove('active');

        // Hide cancel button when form is the only screen (no events yet)
        if (cancelBtn) cancelBtn.style.display = hasEvents ? '' : 'none';

        if (hasEvents) this.renderCountdownUI();
        this.updateOverlayBtn();
    }

    renderCountdownUI() {
        const event = this.getCurrentEvent();
        if (!event) return;

        document.getElementById('eventTitle').textContent = event.name;
        document.getElementById('eventDate').textContent = new Date(event.dateTime).toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        this.applyEventColor(event.color || '#FFBF00');
    }

    renderEventsList() {
        const container = document.getElementById('eventsContainer');
        container.replaceChildren();

        if (this.events.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No events yet. Add one!';
            container.appendChild(empty);
            return;
        }

        this.events.forEach(event => {
            const isActive = event.id === this.currentEventId;
            const div = document.createElement('div');
            div.className = 'event-item' + (isActive ? ' current-event' : '');
            div.style.borderLeftColor = event.color || '#555878';

            const diff = event.dateTime - Date.now();
            let remaining;
            if (diff <= 0) {
                remaining = "Time's up!";
            } else {
                const d = Math.floor(diff / 86400000);
                const h = Math.floor((diff % 86400000) / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                if (d > 0)      remaining = `${d}d ${h}h remaining`;
                else if (h > 0) remaining = `${h}h ${m}m remaining`;
                else            remaining = `${m}m remaining`;
            }

            const dateStr = new Date(event.dateTime).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });

            const infoDiv = document.createElement('div');
            infoDiv.className = 'event-info';
            const nameDiv = document.createElement('div');
            nameDiv.className = 'event-name';
            nameDiv.textContent = event.name;
            const remainingDiv = document.createElement('div');
            remainingDiv.className = 'event-remaining';
            remainingDiv.textContent = `${dateStr} · ${remaining}`;
            infoDiv.append(nameDiv, remainingDiv);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'event-actions';

            const setBtn = document.createElement('button');
            setBtn.type = 'button';
            setBtn.className = 'btn-set' + (isActive ? ' is-active' : '');
            if (isActive) {
                const svgEl = new DOMParser().parseFromString(
                    '<svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,4.5 3.8,7.5 10,1"/></svg>',
                    'image/svg+xml'
                ).documentElement.cloneNode(true);
                setBtn.append(svgEl, document.createTextNode(' Active'));
            } else {
                setBtn.textContent = 'Set';
            }

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btn-delete';
            delBtn.textContent = 'Delete';

            actionsDiv.append(setBtn, delBtn);
            div.append(infoDiv, actionsDiv);

            setBtn.addEventListener('click', () => this.setCurrentEvent(event.id));
            delBtn.addEventListener('click', () => this.deleteEvent(event.id));
            container.appendChild(div);
        });
    }

    // ── Section navigation ──

    showFormSection() {
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) cancelBtn.style.display = '';
        document.getElementById('formSection').classList.add('active');
        document.getElementById('countdownSection').classList.remove('active');
        document.getElementById('eventsSection').classList.remove('active');
        setTimeout(() => document.getElementById('eventName').focus(), 80);
    }

    hideFormSection() {
        if (this.events.length === 0) return;
        document.getElementById('formSection').classList.remove('active');
        document.getElementById('countdownSection').classList.add('active');
    }

    showEventsSection() {
        document.getElementById('countdownSection').classList.remove('active');
        document.getElementById('eventsSection').classList.add('active');
        this.renderEventsList();
    }

    hideEventsSection() {
        document.getElementById('eventsSection').classList.remove('active');
        document.getElementById('countdownSection').classList.add('active');
    }

    resetForm() {
        document.getElementById('eventForm').reset();
        this.selectedColor = '#FFBF00';
        document.querySelectorAll('.color-dot').forEach((d, i) => d.classList.toggle('active', i === 0));
    }

    // ── Overlay toggle ──

    async toggleOverlay() {
        this.overlayEnabled = !this.overlayEnabled;
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ overlayEnabled: this.overlayEnabled });
            }
        } catch {}
        this.updateOverlayBtn();
        this.showToast(this.overlayEnabled ? 'Overlay enabled' : 'Overlay hidden');
    }

    updateOverlayBtn() {
        const btn   = document.getElementById('overlayToggleBtn');
        const label = document.getElementById('overlayBtnLabel');
        if (!btn || !label) return;
        if (this.overlayEnabled) {
            btn.classList.add('ctrl-btn-active');
            label.textContent = 'On Page';
        } else {
            btn.classList.remove('ctrl-btn-active');
            label.textContent = 'Show on Page';
        }
    }

    // ── Helpers ──

    applyEventColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        document.documentElement.style.setProperty('--accent', hex);
        document.documentElement.style.setProperty('--accent-dim', `rgba(${r},${g},${b},0.13)`);
        document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.28)`);
    }

    showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
    }
}

const eventManager = new EventManager();

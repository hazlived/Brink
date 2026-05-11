// Brink – Live Countdown Overlay (content script)
// Uses Shadow DOM so page styles can't bleed in.

if (typeof chrome !== 'undefined' && chrome.storage) {

const CSS = `
  :host-context(body) {}

  .widget {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(10, 11, 17, 0.88);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 12px;
    padding: 9px 10px 9px 7px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.04) inset;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    width: max-content;
    min-width: 0;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    transition: box-shadow 0.2s;
  }
  .widget:hover {
    box-shadow: 0 10px 36px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.06) inset;
  }

  /* ── Drag handle ── */
  .drag {
    width: 10px;
    height: 20px;
    cursor: grab;
    flex-shrink: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px;
    align-content: center;
    padding: 1px 0;
  }
  .drag:active { cursor: grabbing; }
  .drag span {
    display: block;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    transition: background 0.15s;
  }
  .drag:hover span { background: rgba(255,255,255,0.55); }

  /* ── Body ── */
  .body {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  .widget.minimized .body { display: none; }

  .event-name {
    font-size: 9px;
    font-weight: 700;
    color: rgba(255,255,255,0.35);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
    margin-bottom: 2px;
  }

  .time {
    font-size: 17px;
    font-weight: 800;
    color: #FFBF00;
    font-family: "Courier New", "Lucida Console", monospace;
    line-height: 1;
    white-space: nowrap;
    letter-spacing: 0.5px;
  }

  /* ── Min/expand button ── */
  .min-btn {
    all: unset;
    box-sizing: border-box;
    color: rgba(255,255,255,0.28);
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 5px;
    transition: color 0.15s, background 0.15s;
  }
  .min-btn:hover {
    color: rgba(255,255,255,0.75);
    background: rgba(255,255,255,0.09);
  }
  .min-btn svg { display: block; pointer-events: none; }
`;

const SVG_MINUS = `<svg width="10" height="2" viewBox="0 0 10 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="1" y1="1" x2="9" y2="1"/></svg>`;
const SVG_PLUS  = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="1" x2="5" y2="9"/><line x1="1" y1="5" x2="9" y2="5"/></svg>`;

let hostEl      = null;
let shadow      = null;
let currentEvt  = null;
let tickTimer   = null;
let isDragging  = false;
let dragOff     = { x: 0, y: 0 };
let saveTimer   = null;

// ── Bootstrap ──────────────────────────────────────────────

function init() {
    chrome.storage.local.get(
        ['overlayEnabled', 'events', 'currentEventId', 'overlayPosition', 'overlayMinimized'],
        (data) => {
            if (data.overlayEnabled) {
                const ev = resolveEvent(data.events, data.currentEventId);
                if (ev) mount(ev, data.overlayPosition, !!data.overlayMinimized);
            }
        }
    );

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;

        if ('overlayEnabled' in changes) {
            if (changes.overlayEnabled.newValue) {
                chrome.storage.local.get(
                    ['events', 'currentEventId', 'overlayPosition', 'overlayMinimized'],
                    (data) => {
                        const ev = resolveEvent(data.events, data.currentEventId);
                        if (ev) mount(ev, data.overlayPosition, !!data.overlayMinimized);
                    }
                );
            } else {
                unmount();
            }
        }

        if (('events' in changes || 'currentEventId' in changes) && hostEl) {
            chrome.storage.local.get(['events', 'currentEventId'], (data) => {
                const ev = resolveEvent(data.events, data.currentEventId);
                if (ev) setEvent(ev);
                else unmount();
            });
        }
    });
}

// ── Mount / unmount ────────────────────────────────────────

function mount(event, position, minimized) {
    if (hostEl) return;

    hostEl = document.createElement('div');
    Object.assign(hostEl.style, {
        position:  'fixed',
        bottom:    '20px',
        right:     '20px',
        zIndex:    '2147483647',
        userSelect: 'none',
        pointerEvents: 'auto',
    });

    if (position) {
        hostEl.style.bottom = 'auto';
        hostEl.style.right  = 'auto';
        hostEl.style.left   = clampX(position.x) + 'px';
        hostEl.style.top    = clampY(position.y) + 'px';
    }

    document.body.appendChild(hostEl);
    shadow = hostEl.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    shadow.appendChild(styleEl);

    const widget = document.createElement('div');
    widget.className = 'widget' + (minimized ? ' minimized' : '');
    widget.innerHTML = `
        <div class="drag">
            <span></span><span></span>
            <span></span><span></span>
            <span></span><span></span>
        </div>
        <div class="body">
            <div class="event-name"></div>
            <div class="time">--:--:--</div>
        </div>
        <button class="min-btn" title="${minimized ? 'Expand' : 'Minimize'}">
            ${minimized ? SVG_PLUS : SVG_MINUS}
        </button>
    `;
    shadow.appendChild(widget);

    setEvent(event);
    setupDrag();

    shadow.querySelector('.min-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const isMin = widget.classList.toggle('minimized');
        const btn = shadow.querySelector('.min-btn');
        btn.innerHTML = isMin ? SVG_PLUS : SVG_MINUS;
        btn.title = isMin ? 'Expand' : 'Minimize';
        chrome.storage.local.set({ overlayMinimized: isMin });
    });
}

function unmount() {
    clearInterval(tickTimer);  tickTimer = null;
    clearTimeout(saveTimer);   saveTimer = null;
    if (hostEl) { hostEl.remove(); hostEl = null; shadow = null; }
    currentEvt = null;
}

// ── Event / countdown ──────────────────────────────────────

function resolveEvent(events, currentId) {
    if (!Array.isArray(events) || events.length === 0) return null;
    return events.find(e => e.id === currentId) || events[0];
}

function setEvent(ev) {
    currentEvt = ev;
    if (!shadow) return;
    const nameEl = shadow.querySelector('.event-name');
    const timeEl = shadow.querySelector('.time');
    if (nameEl) nameEl.textContent = ev.name;
    if (timeEl && ev.color) timeEl.style.color = ev.color;
    startTick();
}

function startTick() {
    clearInterval(tickTimer);
    tick();
    tickTimer = setInterval(tick, 1000);
}

function tick() {
    if (!currentEvt || !shadow) return;
    const timeEl = shadow.querySelector('.time');
    if (!timeEl) { clearInterval(tickTimer); return; }

    const diff = currentEvt.dateTime - Date.now();
    if (diff <= 0) {
        timeEl.textContent = "Time's up!";
        clearInterval(tickTimer);
        return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);
    const p = n => n.toString().padStart(2, '0');

    timeEl.textContent = d > 0
        ? `${d}d ${p(h)}:${p(m)}:${p(s)}`
        : `${p(h)}:${p(m)}:${p(s)}`;
}

// ── Dragging ───────────────────────────────────────────────

function setupDrag() {
    const handle = shadow.querySelector('.drag');

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        const r = hostEl.getBoundingClientRect();
        dragOff.x = e.clientX - r.left;
        dragOff.y = e.clientY - r.top;
        hostEl.style.right  = 'auto';
        hostEl.style.bottom = 'auto';
    });

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

function onMove(e) {
    if (!isDragging) return;
    hostEl.style.left = clampX(e.clientX - dragOff.x) + 'px';
    hostEl.style.top  = clampY(e.clientY - dragOff.y) + 'px';
}

function onUp() {
    if (!isDragging) return;
    isDragging = false;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        if (!hostEl) return;
        const r = hostEl.getBoundingClientRect();
        chrome.storage.local.set({ overlayPosition: { x: r.left, y: r.top } });
    }, 400);
}

function clampX(x) { return Math.max(0, Math.min(x, window.innerWidth  - 60)); }
function clampY(y) { return Math.max(0, Math.min(y, window.innerHeight - 40)); }

// ── Time's Up toast ────────────────────────────────────────
// Shown on the active page whenever a countdown ends.
// Works regardless of whether the overlay widget is enabled.

const TOAST_CSS = `
  :host {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  }
  .card {
    position: relative;
    margin: 22px auto 0;
    width: 400px;
    max-width: calc(100vw - 32px);
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 15px 14px 20px 16px;
    background: rgba(10, 11, 17, 0.97);
    border: 1px solid rgba(255,255,255,0.10);
    border-top: 3px solid var(--c, #FFBF00);
    border-radius: 14px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.05) inset;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    overflow: hidden;
    transform: translateY(-130%);
    opacity: 0;
    transition: transform 0.42s cubic-bezier(0.34, 1.28, 0.64, 1),
                opacity   0.28s ease;
  }
  .card.in {
    transform: translateY(0);
    opacity: 1;
  }
  .card.out {
    transform: translateY(-130%);
    opacity: 0;
    transition: transform 0.3s ease, opacity 0.25s ease;
  }
  .icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--c, #FFBF00);
  }
  .icon svg { display: block; }
  .body {
    flex: 1;
    min-width: 0;
  }
  .title {
    font-size: 15px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.2px;
    line-height: 1.2;
  }
  .subtitle {
    font-size: 12.5px;
    color: rgba(255,255,255,0.45);
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }
  .dismiss {
    all: unset;
    box-sizing: border-box;
    flex-shrink: 0;
    align-self: flex-start;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    color: rgba(255,255,255,0.30);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .dismiss:hover {
    color: rgba(255,255,255,0.8);
    background: rgba(255,255,255,0.10);
  }
  .dismiss svg { display: block; pointer-events: none; }
  .bar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    background: rgba(255,255,255,0.07);
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    width: 100%;
    background: var(--c, #FFBF00);
    transform-origin: left;
    transition: width 0.08s linear;
  }
`;

const TOAST_TROPHY = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8v5a4 4 0 0 1-8 0V3z"/><path d="M8 5.5H5.5A1.5 1.5 0 0 0 4 7v.5A2.5 2.5 0 0 0 6.5 10H8"/><path d="M16 5.5h2.5A1.5 1.5 0 0 1 20 7v.5a2.5 2.5 0 0 1-2.5 2.5H16"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9" y1="17" x2="15" y2="17"/><line x1="7" y1="21" x2="17" y2="21"/></svg>`;
const TOAST_X      = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="1.5" y1="1.5" x2="8.5" y2="8.5"/><line x1="8.5" y1="1.5" x2="1.5" y2="8.5"/></svg>`;

const TOAST_DURATION = 7000;

let toastHost    = null;
let toastShadow  = null;
let toastProgTimer = null;
let toastOutTimer  = null;

function showTimesUpToast(eventName, color) {
    // Replace any existing toast immediately
    removeToast(true);

    toastHost = document.createElement('div');
    document.body.appendChild(toastHost);
    toastShadow = toastHost.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = TOAST_CSS;
    toastShadow.appendChild(styleEl);

    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--c', color);
    card.innerHTML = `
        <div class="icon">${TOAST_TROPHY}</div>
        <div class="body">
            <div class="title">Time's Up!</div>
            <div class="subtitle">${safeText(eventName)}</div>
        </div>
        <button class="dismiss" title="Dismiss">${TOAST_X}</button>
        <div class="bar"><div class="bar-fill"></div></div>
    `;
    toastShadow.appendChild(card);

    // Slide in
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('in')));

    // Progress bar drain
    const start   = Date.now();
    const fillEl  = toastShadow.querySelector('.bar-fill');
    toastProgTimer = setInterval(() => {
        const pct = Math.max(0, 100 - ((Date.now() - start) / TOAST_DURATION) * 100);
        if (fillEl) fillEl.style.width = pct + '%';
        if (pct === 0) removeToast();
    }, 60);

    // Dismiss button
    toastShadow.querySelector('.dismiss').addEventListener('click', () => removeToast());
}

function removeToast(immediate) {
    clearInterval(toastProgTimer); toastProgTimer = null;
    clearTimeout(toastOutTimer);   toastOutTimer  = null;

    if (!toastHost) return;

    if (immediate) {
        toastHost.remove(); toastHost = null; toastShadow = null;
        return;
    }

    const card = toastShadow && toastShadow.querySelector('.card');
    if (card) {
        card.classList.remove('in');
        card.classList.add('out');
    }
    toastOutTimer = setTimeout(() => {
        toastHost && toastHost.remove();
        toastHost = null; toastShadow = null;
    }, 350);
}

function safeText(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Message listener (fired by background.js on alarm) ─────────────────────

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PADHLE_TIMESUP') {
        showTimesUpToast(msg.eventName, msg.color || '#FFBF00');
    }
});

// ── Go ─────────────────────────────────────────────────────
init();

} // end chrome guard

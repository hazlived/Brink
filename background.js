// Brink – Background Service Worker
// Manages chrome.alarms for countdown events and fires chrome.notifications.

const ALARM_PREFIX  = 'brink_';
const MISSED_WINDOW = 10 * 60 * 1000; // notify if event was missed within 10 min

// ── Lifecycle ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => syncAlarms());
chrome.runtime.onStartup.addListener(() => syncAlarms());

// Re-sync whenever the events list changes (written by popup script.js)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'events' in changes) syncAlarms();
});

// ── Alarm handler ──────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm.name.startsWith(ALARM_PREFIX)) return;
    const eventId = parseInt(alarm.name.slice(ALARM_PREFIX.length), 10);
    fireIfNotYet(eventId);
});

// ── Notification click: dismiss it ────────────────────────────────────────

chrome.notifications.onClicked.addListener((id) => {
    chrome.notifications.clear(id);
});

// ── Core: sync alarms to current event list ────────────────────────────────

function syncAlarms() {
    chrome.storage.local.get(['events', 'notifiedIds'], (data) => {
        const events   = data.events      || [];
        const notified = new Set(data.notifiedIds || []);
        const now      = Date.now();

        // Prune notified IDs for events that no longer exist
        const liveIds = new Set(events.map(e => e.id));
        let pruned = false;
        for (const id of [...notified]) {
            if (!liveIds.has(id)) { notified.delete(id); pruned = true; }
        }

        chrome.alarms.getAll((existing) => {
            const existingNames = new Set(existing.map(a => a.name));

            // Clear alarms whose events have been deleted
            for (const alarm of existing) {
                if (!alarm.name.startsWith(ALARM_PREFIX)) continue;
                const id = parseInt(alarm.name.slice(ALARM_PREFIX.length), 10);
                if (!liveIds.has(id)) chrome.alarms.clear(alarm.name);
            }

            // Create / notify for each event
            for (const event of events) {
                if (notified.has(event.id)) continue;

                if (event.dateTime > now) {
                    // Future → schedule (skip if alarm already exists)
                    const name = ALARM_PREFIX + event.id;
                    if (!existingNames.has(name)) {
                        chrome.alarms.create(name, { when: event.dateTime });
                    }
                } else if (now - event.dateTime <= MISSED_WINDOW) {
                    // Just passed while browser/extension was off → notify now
                    notifyEvent(event);
                    notified.add(event.id);
                    pruned = true;
                }
                // Older than MISSED_WINDOW → silently skip (stale)
            }

            if (pruned) {
                chrome.storage.local.set({ notifiedIds: [...notified] });
            }
        });
    });
}

// ── Notify once per event ──────────────────────────────────────────────────

function fireIfNotYet(eventId) {
    chrome.storage.local.get(['events', 'notifiedIds'], (data) => {
        const events   = data.events      || [];
        const notified = new Set(data.notifiedIds || []);

        if (notified.has(eventId)) return;

        const event = events.find(e => e.id === eventId);
        if (!event) return;

        notifyEvent(event);
        notified.add(eventId);
        chrome.storage.local.set({ notifiedIds: [...notified] });
    });
}

// ── Notification helpers ───────────────────────────────────────────────────

function notifyEvent(event) {
    showSystemNotification(event);
    showInPageToast(event);
}

function showSystemNotification(event) {
    chrome.notifications.create(`brink_notif_${event.id}`, {
        type:     'basic',
        iconUrl:  'icon.png',
        title:    "Time's Up — Brink",
        message:  `${event.name} has ended.`,
        priority: 2
    });
}

function showInPageToast(event) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        chrome.tabs.sendMessage(tabs[0].id, {
            type:      'PADHLE_TIMESUP',
            eventName: event.name,
            color:     event.color || '#FFBF00'
        // Silently ignore if the tab has no content script (e.g. chrome:// pages)
        }).catch(() => {});
    });
}

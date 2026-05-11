<div align="center">

<img src="icon.png" width="96" height="96" alt="Brink icon" />

# Brink

**A countdown extension that keeps your deadlines front and center —**  
**on every page, every second.**

<br/>

![Version](https://img.shields.io/badge/version-1.0.0-FFBF00?style=flat-square)
![Manifest](https://img.shields.io/badge/Manifest-v3-4285F4?style=flat-square)
![Chrome](https://img.shields.io/badge/Chrome-Supported-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox-109+-FF7139?style=flat-square&logo=firefoxbrowser&logoColor=white)
![Firefox for Android](https://img.shields.io/badge/Firefox_for_Android-121+-FF7139?style=flat-square&logo=firefox&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)
![No Dependencies](https://img.shields.io/badge/dependencies-none-lightgrey?style=flat-square)

</div>

---

## 📖 Table of Contents

- [What is Brink?](#-what-is-brink)
- [Features](#-features)
- [Installation](#-installation)
  - [Chrome](#chrome)
  - [Firefox](#firefox)
  - [Firefox for Android](#firefox-for-android)
- [How to Use](#-how-to-use)
  - [Adding an Event](#adding-your-first-event)
  - [Managing Events](#managing-events)
  - [Live Page Overlay](#live-page-overlay)
  - [Notifications](#notifications)
- [Permissions](#-permissions)
- [How It Works](#-how-it-works)
- [File Structure](#-file-structure)
- [Built With](#-built-with)

---

## 🧭 What is Brink?

Brink is a lightweight browser extension for tracking countdowns to important events — exams, submission deadlines, product launches, interviews, anything with a date and time attached to it.

It lives in your toolbar and shows a precise **days · hours · minutes · seconds** countdown for whichever event matters most. It can float a live widget over any webpage you're on, and when time runs out it notifies you immediately — with a native OS notification *and* a toast that slides into your active tab — even if the popup is closed and the overlay is off.

The name says it all: you're always on the **brink**.

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| ⏱️ | **Live Countdown** | Real-time display of days, hours, minutes, and seconds remaining |
| 📋 | **Multiple Events** | Add and manage as many events as you need, sorted by nearest deadline |
| 🎨 | **Color Tags** | Pick from 6 accent colors per event — the entire popup UI recolors to match |
| 📊 | **Progress Bar** | A thin bar across the top of the popup shows how much time has already elapsed |
| 🚨 | **Urgency Badges** | *Due Today*, *X days left* badges that shift from gold → orange → red as you approach zero |
| 🖥️ | **Live Page Overlay** | A draggable, minimizable countdown widget that floats over any webpage |
| 🔔 | **System Notifications** | Native OS notification fires the moment a countdown hits zero |
| 💥 | **In-Page Toast** | An animated toast slides in on your active tab when time's up, even with the overlay off |
| 🏆 | **Time's Up State** | A clean "Time's Up!" screen replaces the countdown once an event ends |
| 💾 | **Persistent Storage** | All events, positions, and settings are saved via `chrome.storage.local` |

---

## 📦 Installation

> No build step required. The extension runs directly from source.

### Chrome

1. **Download** this repository (click *Code → Download ZIP* on GitHub, then extract it), or clone it:
   ```bash
   git clone https://github.com/your-username/brink.git
   ```

2. Open **Chrome** and navigate to:
   ```
   chrome://extensions
   ```

3. Toggle on **Developer Mode** in the top-right corner.

4. Click **Load unpacked**.

5. Select the `extension/` folder (the one containing `manifest.json`).

6. Brink will appear in your extensions toolbar. Pin it for easy access by clicking the puzzle piece icon → pin Brink.

> ✅ Changes to the source files are reflected after clicking the **refresh** icon on the extensions page.

---

### Firefox

1. Open **Firefox** and navigate to:
   ```
   about:debugging
   ```

2. Click **This Firefox** in the left sidebar.

3. Click **Load Temporary Add-on…**

4. Navigate into the `extension/` folder and select `manifest.json`.

5. Brink will appear in your toolbar for the current session.

> ⚠️ Temporary add-ons in Firefox are removed when the browser closes. For a permanent install, the extension needs to be signed through [Mozilla Add-ons](https://addons.mozilla.org). Brink is fully MV3-compatible with Firefox 109+.

---

### Firefox for Android

Brink is available on **Firefox for Android 121+** via [Mozilla Add-ons (AMO)](https://addons.mozilla.org).

1. Open **Firefox for Android** and go to the [Brink add-on page](https://addons.mozilla.org) on AMO.
2. Tap **Add to Firefox**.
3. The overlay widget and in-page toast work on Android. System notifications are not available on this platform and are gracefully skipped — the in-page toast still fires when a countdown ends.

> ℹ️ Sideloading unsigned extensions on Firefox for Android requires enabling Custom Add-on Collections in Firefox settings. For most users, installing via AMO is recommended.

---

## 🚀 How to Use

### Adding Your First Event

1. Click the **Brink icon** in your browser toolbar.
2. The **New Event** form opens automatically on a fresh install.
3. Fill in:
   - **Event Name** — e.g., *Final Exam*, *Project Deadline*, *Flight Departure*
   - **Date & Time** — the exact moment you're counting down to
   - **Color Tag** — choose one of 6 colors; this tints the whole UI and the overlay widget
4. Click **Add Event**.

The countdown starts immediately and ticks every second.

---

### Managing Events

Click **☰ All Events** in the popup to open the events panel.

| Button | What it does |
|--------|-------------|
| **Set** | Makes this event the one displayed on the main countdown screen |
| **✓ Active** | Indicates the currently displayed event |
| **Delete** | Permanently removes the event and cancels its scheduled notification |
| **＋ Add New Event** | Opens the add form without leaving the events panel |

Events are always sorted by nearest deadline — the most urgent one is at the top.

---

### Live Page Overlay

The overlay widget floats over any webpage so you can keep an eye on your countdown without switching tabs.

1. Open the Brink popup while viewing any webpage.
2. Click **🖥 Show on Page** — the button turns gold when active.
3. A small widget appears in the **bottom-right corner** of the page.

**Interacting with the overlay:**

| Action | How |
|--------|-----|
| **Move it** | Drag the dot-grip handle on the left edge |
| **Minimize** | Click the **−** button — collapses to just the time |
| **Expand** | Click **+** when minimized |
| **Toggle off** | Click **Show on Page** again in the popup |

Position and minimized state are saved automatically and restored across page navigations and browser restarts.

> The overlay uses **Shadow DOM** — it is fully isolated from every webpage's own styles and cannot be accidentally overridden or broken by the page.

---

### Notifications

When a countdown reaches exactly zero, Brink fires **two simultaneous notifications**, regardless of whether the popup is open or the overlay is enabled:

#### 1 · System Notification
A native OS notification appears via `chrome.notifications`. This works even when the browser is minimized or in the background.

> Not available on Firefox for Android — the in-page toast fires instead.

#### 2 · In-Page Toast
An animated card slides down from the top of your currently active tab:

```
┌─────────────────────────────────────────────┐
│  🏆  Time's Up!                          ✕  │
│      Final Exam has ended.                  │
│  ████████████████████░░░░░░░░   7s         │
└─────────────────────────────────────────────┘
```

- Colored with the event's tag color
- Auto-dismisses after **7 seconds** with a live progress bar
- Click **✕** to dismiss immediately
- Appears on top of all page content, never blocked by the overlay widget

#### Missed Deadlines
If the browser was closed when the deadline passed, Brink checks on the next startup. If the event ended **within the last 10 minutes**, both notifications fire immediately. Older events are silently skipped to avoid notification spam.

---

## 🔒 Permissions

Brink requests the minimum set of permissions needed to function:

| Permission | Why it's needed |
|------------|-----------------|
| `storage` | Saves your events, current event, overlay position, and settings to `chrome.storage.local` — stays on your device |
| `alarms` | Schedules a `chrome.alarm` for each event's exact deadline — survives popup close, tab close, and browser minimization |
| `notifications` | Displays a native OS notification when a countdown ends (not requested on platforms where it is unavailable) |
| `host_permissions: <all_urls>` | Allows the content script (`overlay.js`) to inject the live widget and toast on any page you visit |

> 🔐 **No data ever leaves your browser.** Brink has no backend, no analytics, no telemetry. Everything is stored locally via `chrome.storage.local`.

---

## ⚙️ How It Works

Brink is split into three independently running parts:

```
┌─────────────────────────────────────────────────────────┐
│  POPUP  (popup.html + script.js)                        │
│  Renders the countdown UI, manages events in storage,   │
│  and toggles the overlay on/off.                        │
└───────────────────────┬─────────────────────────────────┘
                        │ chrome.storage.local
          ┌─────────────┴──────────────┐
          ▼                            ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│  BACKGROUND         │    │  CONTENT SCRIPT             │
│  (background.js)    │    │  (overlay.js)               │
│                     │    │                             │
│  Service worker.    │    │  Injected into every page.  │
│  Schedules alarms   │──► │  Shows the draggable        │
│  for each event.    │msg │  overlay widget and the     │
│  Fires system       │    │  Time's Up toast.           │
│  notifications and  │    │  Isolated via Shadow DOM.   │
│  messages the       │    │                             │
│  active tab.        │    └─────────────────────────────┘
└─────────────────────┘
```

**Key design decisions:**

- **`chrome.alarms` not `setTimeout`** — Alarms persist across browser restarts and service worker shutdowns. `setTimeout` would be lost the moment the service worker is killed.
- **Shadow DOM for the overlay** — Completely encapsulates the widget's CSS. Page styles cannot bleed in; the widget cannot break the page.
- **`chrome.storage.local` not `localStorage`** — Extension storage is shared across all parts (popup, background, content script). `localStorage` is popup-only.
- **One notification per event** — Brink tracks notified event IDs in storage to guarantee each event only triggers one notification, no matter how many times the service worker restarts.
- **No `innerHTML`** — All DOM nodes are built with `createElement` and `textContent`. SVGs are parsed via `DOMParser`. No user input is ever written as raw HTML.

---

## 🗂️ File Structure

```
extension/
│
├── manifest.json       # Extension manifest (MV3) — permissions, background SW,
│                       # content scripts, icons; declares Firefox 109+ and
│                       # Firefox for Android 121+ compatibility
│
├── popup.html          # Popup UI shell — three sections: form, countdown, events list
├── style.css           # All popup styles — dark theme, design tokens, animations
├── script.js           # Popup logic — EventManager class handling CRUD, countdown
│                       # rendering, overlay toggle, and chrome.storage reads/writes
│
├── overlay.js          # Content script — two independent features:
│                       #   1. Draggable countdown widget (Shadow DOM)
│                       #   2. Time's Up toast (Shadow DOM, always-on)
│                       # Listens for PADHLE_TIMESUP messages from background.js
│
├── background.js       # Service worker — syncs chrome.alarms with the events list,
│                       # fires system notifications (where available), messages
│                       # active tab on alarm
│
└── icon.png            # 128×128 extension icon (hourglass, generated programmatically)
```

---

## 🛠️ Built With

<div align="center">

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Chrome Extensions](https://img.shields.io/badge/Chrome_Extensions_API-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)

</div>

**Zero external dependencies. Zero build tools. Zero frameworks.**

Brink uses only native browser extension APIs:

- `chrome.storage.local` — persistent key-value storage
- `chrome.alarms` — exact-time background scheduling
- `chrome.notifications` — native OS notifications (desktop only)
- `chrome.tabs` — messaging the active tab
- `chrome.runtime` — cross-context messaging
- **Shadow DOM** — CSS encapsulation for the overlay and toast
- **DOMParser** — safe SVG injection without `innerHTML`

---

## 📄 License

MIT — do whatever you want with it.

---

<div align="center">

Made with focus, for people on the **brink**.

</div>

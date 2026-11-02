# ChronoShift — Time + Days, Hours & Subsequent Multi-Step Calculator

A high-precision web application for adding and subtracting **Days, Hours, and Minutes** to live current time, with support for **multiple subsequent time additions** (e.g. `Live Time + 5h 10m + 1d 5h`), persistent browser history, and live countdowns.

---

## ✨ Features

### 1. 📅 Days + Hours + Minutes Time Offsets
- **Live Time or Custom Anchor**: Continuously tracks real-time system clock with sub-second accuracy, or select a custom starting timestamp.
- **Dedicated Days, Hours & Minutes Steppers**:
  - Direct numeric stepper buttons (`-` / `+`) and keyboard input.
  - Direction switch for each offset (`+ Add` or `− Subtract`).

### 2. 🔗 Subsequent Chained Offsets (Multi-Step Calculations)
- **Add Subsequent Offsets**: Click `+ Add Subsequent Time` to chain multiple sequential time intervals.
- Example:
  - **Step 1**: `+ 5 hours 10 mins` (lands at 5:01 PM today)
  - **Step 2**: `+ 1 day 5 hours` (lands at 10:01 PM tomorrow)
- **Real-Time Step-by-Step Progression**:
  - Visual breakdown displaying each intermediate arrival time and relative day badge.
  - Cumulative total offset summary (e.g., `+1d 10h 10m`).

### 3. 💬 Smart Natural & Chained Expression Input
- Type single or chained natural expressions into the quick input bar:
  - `5hours10min + 1day5hrs`
  - `5h 10m + 1d 5h`
  - `2d 12h` or `3.5d` or `90m`
- Auto-populates all subsequent step cards instantly.

### 4. ⚡ Quick Presets
- Instant chips: `+1h`, `+2h`, `+5h 10m`, `+8h (Shift)`, `+12h`, `+1 Day`, `+1d 5h`, `+2 Days`, `+3.5 Days`, `+1 Week`.

### 5. 💾 Persistent History & Presets
- Saved to browser `localStorage` across page reloads.
- **Custom Labels / Notes**: e.g., *"Trip stages"*, *"Flight layover + arrival"*, *"Multi-step oven recipe"*.
- **Starred / Favorites**: Pin repetitive calculations.
- **One-Click Restore**: Click any historical entry to reload all chained steps back into the calculator.
- **Export to JSON**: Backup history locally.
- **One-Click Copy**: Copy clean formatted result to clipboard.

### 6. ⏳ Live Countdown Timer Widget
- Pin any calculation into a live countdown with `HH:MM:SS` (or `Dd HH:MM:SS`), progress bar, and completion alarms.

---

## 🚀 How to Run

No build step or dependencies required. Open [index.html](file:///e:/EdgeDownload/CurrentTime+HoursCalulator/index.html) in any browser:

```bash
start index.html
```

# ChronoShift — Time + Days, Hours & Subsequent Multi-Step Calculator

A high-precision web application for adding and subtracting **Days, Hours, and Minutes** to live current time, with support for **multiple subsequent time additions** (e.g. `Live Time + 5h 10m + 1d 5h`), persistent browser history, live countdowns, and cross-device **Cloudflare KV Sync**.

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

### 4. ☁️ Cloudflare KV Multi-Device Sync (New)
- **Cross-Device History**: Keep history in sync between your phone, tablet, and PC.
- **Zero Sign-Up Required**: Generates a secure, private Sync Code (e.g. `chrono-8f4b-21a9`). Enter it on your other device once, and history synchronizes automatically in the background.
- **Automatic Merging**: Merges local entries with cloud entries without deleting local calculations.

---

## ☁️ How to Enable Cloudflare KV Sync in your Cloudflare Dashboard

Because you deployed to Cloudflare Pages, the serverless function is already located in [`functions/api/sync.js`](file:///e:/EdgeDownload/CurrentTime+HoursCalulator/functions/api/sync.js).

To connect Cloudflare's free KV store in 2 minutes:

### Step 1: Create a KV Namespace
1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com).
2. On the left navigation, click **Storage & Databases** → **KV**.
3. Click **Create namespace**.
4. Name it: `CHRONO_KV` and click **Add**.

### Step 2: Bind KV to your Pages Project
1. In Cloudflare, go to **Workers & Pages** and select your `CurrentTime+HoursCalulator` Pages project.
2. Go to **Settings** → **Functions**.
3. Scroll down to **KV namespace bindings** and click **Add binding**.
4. Fill in:
   - **Variable name**: `CHRONO_KV` *(must be uppercase exact match)*
   - **KV namespace**: select the `CHRONO_KV` namespace you created in Step 1.
5. Click **Save**.

### Step 3: Redeploy (or trigger new deployment)
1. Push your latest code (with the new `/functions` folder) to your repository, or trigger a rebuild in Cloudflare Pages.
2. In the app, click **Cloud Sync** in the top bar → click **New Code** → copy the code to your other devices!

---

## 🚀 Local Run
```bash
start index.html
```

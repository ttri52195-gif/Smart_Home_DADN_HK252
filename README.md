# Smart House — React Native App

Mobile frontend for the Smart House system, built with React Native and Expo. Connects to the FastAPI backend (`code/smarthouse`) for authentication, device control, sensor monitoring, alerts, and activity history.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Screens](#screens)
- [Design System](#design-system)
- [Getting Started](#getting-started)
- [Running on Your Phone](#running-on-your-phone)
- [API Configuration](#api-configuration)
- [Architecture Notes](#architecture-notes)
- [API Conflicts & Known Issues](#api-conflicts--known-issues)
- [Changelog](#changelog)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.76.2 |
| Runtime | Expo SDK 54 |
| Navigation | React Navigation v6 (Bottom Tabs + Stack) |
| Auth state | React Context (in-memory JWT) |
| Backend API | FastAPI (`code/smarthouse`) via fetch |
| Styling | StyleSheet.create — no external UI library |

---

## Project Structure

```
smarthouse-app/
├── App.js                        # Root — AuthProvider + NavigationContainer
├── app.json                      # Expo config
├── babel.config.js
├── package.json
└── src/
    ├── theme/
    │   └── index.js              # Design tokens (colors, typography, spacing, radius)
    ├── context/
    │   └── AuthContext.js        # JWT auth state — signIn / signUp / signOut
    ├── services/
    │   ├── api.js                # Backend API client (all authenticated calls)
    │   └── adafruitIO.js         # Adafruit IO client (unused — kept for fallback reference)
    └── screens/
        ├── LoginScreen.js        # Login / register form
        ├── HomeScreen.js         # Sensor overview + quick device controls + recent activity
        ├── DevicesScreen.js      # Full device list + activity history section
        ├── ChartScreen.js        # Historical sensor charts (GET /api/sensor-data)
        ├── AlertScreen.js        # Server-generated alerts with time/type filters
        ├── SettingsScreen.js     # App settings
        ├── AccountSettingsScreen.js
        └── RoomSetting/
            └── RoomSettingScreen.js
```

---

## Screens

### Login
- Toggle between **Sign In** and **Register** modes
- Register supports an optional "house owner" flag
- JWT token stored in React Context after login

### Home
- Greeting header with current date
- **3-column sensor grid**: dynamic — renders all sensors returned by `GET /api/sensors`. Icons and colours are configured per `feed_key` in `SENSOR_META`; name, value, and unit come from the API at runtime. New sensors appear automatically.
- **Quick Controls**: dynamic — renders all devices from `GET /api/devices`. Visual config is keyed by device `type` in `DEVICE_META`. No hardcoded device list.
- **Recent Activity**: last 5 minutes of device state changes fetched from `GET /api/device-data` for each device in parallel. Updates every 10 seconds with the sensor/device poll.
- Pull-to-refresh; polling stops when the screen loses focus (`useFocusEffect`).

### Devices
- Full device list from `GET /api/devices` with type-filter chips (All / Doors / Lights / Curtains / Climate)
- Toggle switch for lights/RGB/dimmer; lock/unlock toggle for doors
- **Device Activities** section below the list:
  - Follows the active type filter (only shows feed_keys matching the selected category)
  - Time range chips: 5 min (default) / 1 hour / 1 day — changes trigger a new `GET /api/device-data` fetch
- Pull-to-refresh

### Charts
- Sensor chips: dynamically generated from `GET /api/sensors` — same count and names as HomeScreen
- Time range chips: **5 min** (default) / 1 hour / 1 day
- Line chart rendered from `GET /api/sensor-data?feed_key=...&start_time=...&end_time=...`
- Stats row: Current / Min / Max / Avg
- Raw readings table (last 8 points)
- Manual refresh button (tap the refresh icon in the header)

### Alerts
- Fetches `GET /api/alerts/list?since=<ISO>` using the selected time window
- Time filter chips: 10 min / 1 hour (default) / 1 day
- Type filter chips: All / Gas Leak / Motion / Door Forced
- Per-card dismiss (local state; reloads on refresh)
- Pull-to-refresh

### Settings / Account Settings / Room Settings
- Account settings navigable from the avatar button on Home and Devices screens

---

## Design System

Tokens are in `src/theme/index.js`.

### Colour palette

| Token | Value | Usage |
|-------|-------|-------|
| `surface.overlay` | `#1A1D20` | Nav bar, modal scrim |
| `surface.base` | `#292D31` | Screen background |
| `surface.card` | `#2F3439` | Card / list row |
| `surface.elevated` | `#4A535E` | Borders, inactive toggles |
| `primary.default` | `#E4B518` | CTAs, active state, borders |
| `text.title` | `#FFFFFF` | Headlines |
| `text.body` | `#B8BCC2` | Body text |
| `text.caption` | `#6B7280` | Timestamps, labels |
| `success` | `#27AE60` | OK state, connected |
| `warning` | `#F59E0B` | Threshold warnings |
| `error` | `#EB5757` | Critical alerts |

### Key design patterns

- **Dynamic rendering**: `SENSOR_META` and `DEVICE_META` hold only visual config (icon, colour). All data (name, value, unit, count) comes from the API at runtime — adding a new sensor or device to the backend requires no frontend code change.
- **Chip filters**: `alignSelf: 'flex-start'` + `flexDirection: 'row'` on the horizontal ScrollView `contentContainerStyle` prevents chips from stretching to fill width.
- **Scroll layout**: `<View style={{ flex: 1 }}>` wrapper around each main `<ScrollView>` is required for scroll to work correctly on SDK 54.
- **Tab bar**: 80 px height on iOS, 64 px on Android, with `paddingBottom: 24` on iOS to clear the home indicator.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode 15+ (macOS — for iOS Simulator)
- Backend running — see `code/smarthouse/README.md`

### Install dependencies

```bash
cd code/smarthouse-app
rm -rf node_modules
npm install --legacy-peer-deps
```

### Build and run (iOS)

```bash
./node_modules/.bin/expo prebuild --clean
npm run ios
```

### Configure the API URL

Open `src/services/api.js` and set `API_BASE_URL`:

```js
// Physical phone (Expo Go) — use your computer's LAN IP
export const API_BASE_URL = 'http://192.168.x.x:8001';

// iOS Simulator
export const API_BASE_URL = 'http://localhost:8001';

// Android Emulator
export const API_BASE_URL = 'http://10.0.2.2:8001';
```

Find your LAN IP on macOS:
```bash
ipconfig getifaddr en0
```

### Dev mode

Set `DEV_MODE = true` in `src/services/api.js` to skip the backend entirely. Every API call returns data from `src/services/mockData.js` instantly.

### Start the backend

```bash
cd code/smarthouse
docker-compose up
```

---

## Running on Your Phone

```bash
cd code/smarthouse-app
npx expo start
```

Scan the QR code with **Expo Go**. Both phone and computer must be on the same Wi-Fi network.

---

## API Configuration

All calls go to the FastAPI backend. Adafruit IO is no longer used for chart data.

### Authentication

The JWT token is passed as `Authorization: Bearer <token>` on all authenticated requests. Some endpoints (e.g. `getDeviceState`) also accept `auth_token` as a query param — both are sent where required.

### Backend endpoints

| Screen | Method | Endpoint | Auth |
|--------|--------|----------|------|
| Login | POST | `/api/auth/login` | — |
| Register | POST | `/api/auth/register` | — |
| Home, Devices, Charts | GET | `/api/sensors` | — |
| Home, Devices | GET | `/api/devices` | — |
| Home, Devices | POST | `/api/devices/{id}/set_state` | Bearer |
| Devices | GET | `/api/devices/{id}/get_state` | `auth_token` query |
| Charts | GET | `/api/sensor-data` | Bearer |
| Home, Devices | GET | `/api/device-data` | Bearer |
| Alerts | GET | `/api/alerts/list` | — |
| Schedules | GET/POST/PUT | `/api/schedules` | Bearer |
| System | GET | `/api/system/mode` | Bearer |

---

## Architecture Notes

**Auth flow**: `AuthContext` holds the JWT in component state. `App.js` renders `LoginScreen` when `token` is null, otherwise renders the tab navigator.

**Polling**: `HomeScreen` polls `GET /api/sensors` and `GET /api/devices` every 10 seconds via `useFocusEffect` — polling starts when the tab gains focus and stops when it loses it. After each device list refresh, `GET /api/device-data` is fetched in parallel for all devices to populate the Recent Activity section.

**Dynamic sensor/device rendering**: No screen hardcodes a list of sensors or devices. `SENSOR_META` / `DEVICE_META` provide icon + colour per `feed_key` / `type`; the API provides everything else. Unknown sensors/devices fall back to a generic icon.

**Chart data**: `ChartScreen` calls `GET /api/sensor-data?feed_key=...&start_time=...&end_time=...` with a Bearer token. The `start_time` and `end_time` are derived from the selected time range chip (5 min / 1 hour / 1 day). Response shape: `{ count, data: [{ timestamp, value }], feed_key }`.

**Device activity**: Both `HomeScreen` (last 5 min, all devices) and `DevicesScreen` (configurable range, filtered by type) use `GET /api/device-data`. Calls are made in parallel via `Promise.allSettled` — one per device in scope — then merged and sorted by timestamp descending.

**Alert data**: `AlertScreen` calls `GET /api/alerts/list?since=<ISO>` where `since` is computed from the selected time filter. The backend returns `{ alerts: [{ feed_key, type, title, msg, timestamp }] }`. Type filtering is client-side. Dismissed alerts are tracked in local state.

**No persistent storage**: The JWT token is in-memory only and is lost on app restart. For production, replace with `expo-secure-store`.

---

## API Conflicts & Known Issues

### 1. `getDeviceState` — method mismatch (resolved)
- **Postman**: `GET /api/devices/{id}/get_state?auth_token=...`
- **Previous code**: `POST` with body `{ auth_token, state }`
- **Fix**: Changed to `GET` with `queryParams: { auth_token: token }`.

### 2. `register` — extra field
- **Postman** body: `{ username, password }` only.
- **App** sends `is_house_owner` boolean for UI differentiation.
- **Status**: Backend may ignore or 422 the field. Kept for UI purposes.

### 3. Chart history — endpoint replaced
- **Previous code**: `ChartScreen` fetched Adafruit IO directly.
- **Now**: Uses `GET /api/sensor-data` with Bearer token. Response envelope `{ count, data, feed_key }` is unwrapped; field `timestamp` is used (not `created_at`).

### 4. Alert response shape (resolved)
- **Actual backend**: `{ alerts: [{ feed_key, type, title, msg, timestamp }] }` — no `id` field.
- **Fix**: Card dismiss key uses `${feed_key}-${timestamp}`. `listAlerts` unwraps `res?.alerts`.

### 5. `getSensorData` / `getDeviceActivities` require auth (resolved)
- Both endpoints return `401 Missing auth token` without credentials.
- **Fix**: Bearer token passed via the `token` field in the `request()` helper for both calls.

### 6. Stub / undocumented endpoints
- `GET /api/system/mode` — implemented in `api.js` but not wired to any screen.
- `GET /api/users`, `GET /get-user-by-username` — implemented but only used by AccountSettings.

### 7. Adafruit IO credentials
- `src/services/adafruitIO.js` contains a hardcoded AIO key. The file is no longer called from any screen but should be rotated before shipping.

---

## Changelog

### 2026-05-19
- **ChartScreen**: replaced hardcoded 3-sensor list with dynamic sensor chips from `GET /api/sensors`; switched chart data source from Adafruit IO to `GET /api/sensor-data`; added 5 min / 1 hour / 1 day time range filter; removed auto-refresh countdown.
- **HomeScreen**: replaced in-memory activity log with real device state history from `GET /api/device-data` (last 5 min, all devices, updates with 10 s poll).
- **DevicesScreen**: added "Device Activities" section — follows active type filter, supports 5 min / 1 hour / 1 day time range.
- **AlertScreen**: fixed chip layout (chips were expanding to ~50% screen width); added `flexGrow: 0` on the horizontal ScrollView to eliminate blank gap between filters and alert list.
- **App.js**: tab bar height increased to 80 px (iOS) / 64 px (Android) with proper bottom padding to clear the iPhone home indicator.
- **api.js**: added `getDeviceActivities(token, feedKey, startTime, endTime)` → `GET /api/device-data`; added `getSensorData(token, feedKey, startTime, endTime)` → `GET /api/sensor-data`; fixed `getSensorData` to pass Bearer token.

### 2026-05-18
- Downgraded from Expo SDK 55 to **SDK 54** (React Native 0.76.2) to fix scroll layout issues.
- **AlertScreen**: full rewrite — fetches `GET /api/alerts/list?since=...`; time filter (10 min / 1 hour / 1 day); type filter chips (All / Gas Leak / Motion / Door Forced); fixed field names (`type`, `msg`, `timestamp`) to match real API shape.
- **DevicesScreen**: removed hardcoded room cards and room labels; removed `isAuto` from `TYPE_META`; status derived from live device value.
- **HomeScreen**: replaced hardcoded `SENSOR_STRIP` with dynamic 3-column grid from `SENSOR_META`; replaced hardcoded `QUICK_CARDS` with `DEVICE_META` driven by API device list; `useFocusEffect` polling (10 s, stops on tab blur); fixed sensor count label and active device count badge.
- **api.js**: fixed `getDeviceState` from POST to GET; added `console.log('[API]', ...)` for response logging; `listAlerts` now unwraps `{ alerts: [...] }` envelope.

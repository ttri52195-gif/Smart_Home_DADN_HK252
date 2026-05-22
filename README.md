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
    │   └── api.js                # Backend API client (all authenticated calls)
    └── screens/
        ├── LoginScreen.js        # Login / register form
        ├── HomeScreen.js         # Sensor overview + quick device controls + recent activity
        ├── DevicesScreen.js      # Full device list + activity history section
        ├── ChartScreen.js        # Historical sensor charts (GET /api/sensor-data)
        ├── AlertScreen.js        # Server-generated alerts with time/type filters
        ├── SettingsScreen.js     # App settings
        ├── AccountSettingsScreen.js
        ├── ChangePasswordScreen.js   # Change password with strength validation
        ├── FamilyMemberScreen.js     # Manage / view family members
        ├── RoomDeviceScreen.js       # Sensors & devices grouped by location
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
- **3-column sensor grid**: dynamic — renders all sensors from `GET /api/sensors`. Icons and colours configured per `feed_key` in `SENSOR_META`; name, value, and unit come from the API at runtime. Sensors with `unit: "raw"` hide the unit label.
- **Quick Controls**: dynamic — renders all devices from `GET /api/devices`. Visual config keyed by device `type` in `DEVICE_META`. Active state uses `isNumericOn` (any non-zero numeric string counts as ON) so devices like `lb1` (value `"41"`) and `rgb` (value `"15"`) render correctly.
- **Recent Activity**: last 5 minutes of device state changes from `GET /api/device-data` fetched in parallel for all devices. Refreshes every 10 seconds with the poll cycle.
- Pull-to-refresh; polling stops when the screen loses focus (`useFocusEffect`).

### Devices
- Type-filter chips (All / Doors / Lights / Curtains / Climate)
- **Room cards** (horizontal scrollable, above the device list):
  - Grouped by the `location` field on each device; devices with `null` or missing location fall into a **"Default"** room
  - Room icon selected by keyword match on the location string (e.g. "Bedroom" → `bed-outline`, "Kitchen" → `restaurant-outline`); falls back to `home-outline`
  - Card shows device count for the currently active type filter — count and card visibility update live as the filter changes
  - Tapping a card navigates to **RoomSettingScreen** passing `{ roomName, devices }` for that room
- Full device list filtered by the active chip; active state uses `numericOn` logic (same as HomeScreen)
- Toggle switch for lights/RGB/dimmer; lock/unlock toggle for doors
- **Device Activities** section at the bottom:
  - Follows the active type filter (feed_keys of matching devices only)
  - Time range chips: 5 min (default) / 1 hour / 1 day — changing either triggers a fresh `GET /api/device-data` fetch
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

### Account Settings
- Profile card showing username and email
- Notification toggles (device, email)
- Security: Change Password, Two-Factor Authentication toggle, Manage Access Code
- Household: Family Member, Room & Device Info
- Log out button

### Change Password
- Current password, new password, confirm password — each with eye toggle
- Live strength checklist (8+ chars, uppercase, lowercase, number, special char)
- Confirm mismatch error shown inline; save disabled until all rules pass
- Inline success / error banner on submit

### Family Member
- **Homeowner view**: list of all users with role badges; add new member form (username + password with strength rules); delete non-owner members via confirmation dialog
- **Member view**: read-only list with role badges

### Room & Device Info
- Sensors and devices grouped by `location` field (ungrouped items shown under "Unassigned")
- **Homeowner view**: inline edit panel per row to rename and reassign location; changes saved via `PATCH` immediately and list re-groups
- **Member view**: read-only list with a "view only" hint

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
| Register / Add Member | POST | `/api/auth/register` | — |
| Change Password | PUT | `/api/auth/change-password` | Bearer |
| Family Member | GET | `/api/users` | Bearer |
| Family Member | DELETE | `/api/users/{id}` | Bearer |
| Account Settings | GET | `/get-user-by-username?username=` | — |
| Home, Devices, Charts | GET | `/api/sensors` | — |
| Home, Devices | GET | `/api/devices` | — |
| Home, Devices | POST | `/api/devices/{id}/set_state` | Bearer |
| Devices | GET | `/api/devices/{id}/get_state` | `auth_token` query |
| Room & Device Info | PATCH | `/api/devices/{feedKey}` | Bearer |
| Room & Device Info | PATCH | `/api/sensors/{feedKey}` | Bearer |
| Charts | GET | `/api/sensor-data` | Bearer |
| Home, Devices | GET | `/api/device-data` | Bearer |
| Alerts | GET | `/api/alerts/list` | — |
| Schedules | GET/POST/PUT | `/api/schedules` | Bearer |
| System | GET | `/api/system/mode` | Bearer |

---

## Architecture Notes

**Auth flow**: `AuthContext` holds the JWT in component state. `App.js` renders `LoginScreen` when `token` is null, otherwise renders the tab navigator.

**Polling**: `HomeScreen` polls `GET /api/sensors` and `GET /api/devices` every 10 seconds via `useFocusEffect` — polling starts when the tab gains focus and stops when it loses it. After each device list refresh, `GET /api/device-data` is fetched in parallel for all devices to populate the Recent Activity section.

**Dynamic sensor/device rendering**: No screen hardcodes a list of sensors or devices. `SENSOR_META` / `DEVICE_META` provide icon + colour per `feed_key` / `type`; the API provides everything else. Unknown sensors/devices fall back to a generic icon. Device active state is determined by `isNumericOn` (non-zero numeric string) OR `parseBool` (ON/OPEN/1/TRUE), so numeric PWM/brightness values are handled correctly.

**Room grouping**: `DevicesScreen` derives room cards at render time by grouping the device list by `location` field. No room data is fetched separately. Devices without a location are grouped into "Default". The `LOCATION_META` map resolves a location string to an icon by keyword substring match.

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

### 7. Adafruit IO credentials (resolved)
- `src/services/adafruitIO.js` was deleted — no screen imports it anymore. All chart data now comes from `GET /api/sensor-data`.

---

## Changelog

### 2026-05-22 (latest)
- **Offline detection — HomeScreen, DevicesScreen, SettingsScreen, ManualMode, AutomaticMode**: added `isOnline(ts)` helper (true if `last_record_time` / `last_recorded_at` is within 5 min of now) and extended `formatAge` to handle days. Affected screens show: (1) a full-width section banner when **all** devices or sensors in a section are offline; (2) each individual card/row greyed to 60% opacity when its own data is stale; (3) a small "OFFLINE" chip replacing the status badge; (4) last-record age (`39d ago`) shown beneath the device/sensor name. Active/online counts in section headers now reflect data freshness instead of on/off state. ManualMode additionally greys the slider/toggle area and tints tab icons red for offline devices; AutomaticMode shows per-device last-seen time and a "Door state may be outdated" warning in the auto-lock card.

### 2026-05-22
- **AutomaticMode** (complete rewrite): door auto-lock card (toggle + delay ± 1-min spinner, three-state door guide OPEN / CLOSED / LOCKED, saved via `PUT /api/modes/automation`); motion sensor devices shown with a read-only note (no rules needed); light/dimmer/RGB devices each get a per-device rule list with an inline "Add Rule" form — time picker (HH:MM), day-of-week chips (Mon–Sun with All shortcut), value input (ON/OFF chips for LIGHT, numeric for DIMMER/RGB). Rules are toggled and deleted per-row. All rules loaded via `GET /api/automation/rules` with `Promise.allSettled` so a config endpoint failure does not block rule display.
- **SettingsScreen** (away mode rewrite): loads real door device list from `GET /api/devices` filtered to `type === DOOR`; three-state door display — OPEN shows alert icon (cannot be toggled), CLOSE/CLOSED shows unlocked icon, LOCKED shows locked icon; away mode toggle calls `PUT /api/modes/away` then refreshes door states; state legend at bottom explains all three states; door toggle disabled while away mode is active.
- **RoomSettingScreen**: removed Schedule from the mode selector (Manual / Automatic only) — Schedule and Automatic covered the same use case.
- **api.js**: added `getAwayMode` (`GET /api/modes/away`, normalises backend `{ away_mode }` to `{ enabled }`); `setAwayMode` (`PUT /api/modes/away`); `getAutomationMode` (`GET /api/modes/automation`); `setAutomationMode` (`PUT /api/modes/automation`); full CRUD for automation rules — `listAutomationRules`, `createAutomationRule`, `updateAutomationRule`, `deleteAutomationRule`; improved request logging: `[API →]` before every fetch, `[API ✗]` on error with status + body, `[API ✓]` on success.
- **backend `database.py`**: fixed `get_mode_settings` — `_safe_bool`/`_safe_int` helpers were generating `sp.<column>` but the query had no `sp` alias, causing a 500 on every automation/away mode GET; replaced with local helpers that emit plain column names. Fixed `_rule_row_to_dict` — PostgreSQL BIGINT IDs (~10¹⁸) exceed JS `Number.MAX_SAFE_INTEGER`; IDs (`id`, `setting_profile_id`, `device_id`) are now stringified before returning so the frontend receives them as strings and PUT/DELETE routes match correctly.
- **Bug fixes**: `parseDays` in AutomaticMode now accepts both array (from backend) and comma-string, normalising to title-case; `handleAddRule` manually injects `feed_key` into the stored rule because the POST RETURNING clause omits it, preventing the optimistic-update toggle from targeting the wrong `rulesMap` key.

### 2026-05-22
- **ChangePasswordScreen** (new): current password + new password + confirm password inputs, each with eye toggle. Live strength-rule checklist (8+ chars, uppercase, lowercase, number, special char) shown as user types. Confirm mismatch error shown inline. Save button disabled until all rules pass and passwords match. Inline success/error banner. Navigated from "Change Password" in Account Settings.
- **FamilyMemberScreen** (new): homeowner sees full member list with role badges ("Home Owner" / "Member") and can add new accounts (username + password with strength rules) or delete non-owner members via a confirmation dialog (`DELETE /api/users/{id}`). Family member role sees view-only list. Role detection uses `member.role === "homeowner"` to match real API shape.
- **RoomDeviceScreen** (new): sensors and devices fetched in parallel and grouped by `location` field (null/missing → "Unassigned", sorted last). Homeowner gets an inline edit panel per row to rename the device/sensor and reassign its location — changes are saved via `PATCH /api/devices/{feedKey}` or `PATCH /api/sensors/{feedKey}` and reflected immediately by re-grouping the list. Family member sees view-only list with a hint banner.
- **AccountSettingsScreen**: "Change Password" row now navigates to `ChangePasswordScreen`; "Family Member" row navigates to `FamilyMemberScreen`; replaced duplicate "Two-Factor Authentication" in HOUSEHOLD section with "Room & Device Info" navigating to `RoomDeviceScreen`.
- **api.js**: added `changePassword` (`PUT /api/auth/change-password`, body includes `confirm_new_password`); added `createMember` (`POST /api/auth/register`); added `deleteMember` (`DELETE /api/users/{id}`); added `updateDevice` (`PATCH /api/devices/{feedKey}`); added `updateSensor` (`PATCH /api/sensors/{feedKey}`); fixed `listUsers` to unwrap `res?.users ?? res?.data ?? []`.
- **App.js**: registered `ChangePasswordScreen`, `FamilyMemberScreen`, and `RoomDeviceScreen` in the stack navigator.

### 2026-05-22
- **HomeScreen + DevicesScreen**: LIGHT and RGB devices now use a horizontal drag slider (0–100) instead of a toggle. Slider has a white thumb with colored border that tracks the fill edge using CSS percentage positioning + `translateX`. Value label shows the numeric level or "OFF". Card press is disabled for slider devices to avoid gesture conflicts.
- **ManualMode**: replaced the vertical slider with a `BigVerticalToggle` for non-LIGHT/non-RGB devices (DOOR, MOTION, DIMMER, GENERIC) — a pill-shaped vertical toggle where the white knob springs to the top (ON) or bottom (OFF) using `Animated.spring`; label below shows current value string (ON/OFF/OPEN/CLOSE); DOOR devices cycle OPEN↔CLOSE. LIGHT/RGB still show the vertical slider, but the value label now shows the raw number without `%`. Fixed field names throughout ManualMode: now reads `feed_key ?? key` and `value ?? last_value` to match the current API device shape.

### 2026-05-21
- **mockData.js**: added `unit` field to all sensors; updated device fields (`status`, `last_record_time`, real values like `lb1="41"`, `rgb="15"`); added `MOCK_DEVICE_HISTORY` keyed by device `feed_key`; `getDeviceActivities` DEV_MODE now uses `MOCK_DEVICE_HISTORY` instead of sensor history; `getSensorData` DEV_MODE returns same `{ count, data, feed_key }` envelope as real API; removed unused `MOCK_ROOMS`.
- **HomeScreen + DevicesScreen**: added `isNumericOn` helper — non-zero numeric device values (PWM brightness, RGB level) now correctly register as active/ON.
- **DevicesScreen**: restored room card horizontal slider — cards grouped by device `location` field, null/missing location falls into "Default" room; `LOCATION_META` maps 9 location keywords to icons with `home-outline` fallback; cards filter by active type chip and update device count live; tapping a card navigates to `RoomSettingScreen` with `{ roomName, devices }`.

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

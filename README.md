# Smart House — React Native App

Mobile frontend for the Smart House system, built with React Native and Expo. Connects to the FastAPI backend (`code/smarthouse`) for authentication, device control, and sensor monitoring.

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

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81.5 |
| Runtime | Expo SDK 54 |
| Navigation | React Navigation v6 (Bottom Tabs) |
| Auth state | React Context (in-memory JWT) |
| Backend API | FastAPI (`code/smarthouse`) via fetch |
| Chart data | Adafruit IO REST API (history only) |
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
    │   └── adafruitIO.js         # Adafruit IO client (feed history for charts)
    └── screens/
        ├── LoginScreen.js        # Login / register form
        ├── HomeScreen.js         # Sensor overview + quick device controls
        ├── DevicesScreen.js      # Full device list with toggle controls
        ├── ChartScreen.js        # Historical sensor charts
        └── AlertScreen.js        # Threshold monitoring and alert cards
```

---

## Screens

### Login
- Toggle between **Sign In** and **Register** modes
- Register supports an optional "house owner" flag (owners can create schedules)
- JWT token is stored in React Context after login

### Home
- Greeting header with current date
- **2×2 sensor grid**: Temperature, Humidity, Gas, Rain — live values polled every 5 s
- **Quick controls**: Light (lb1), Motion detector (pir), RGB strip — on/off toggles
- **Door control**: Open / Close buttons
- Activity log of the last 8 device commands

### Devices
- Full list of all devices fetched from `GET /api/devices`
- 4px left border colour indicates state: gold = active, grey = inactive
- Toggle switch for lights, motion, RGB; Open/Close buttons for door
- Pull-to-refresh

### Charts
- Tab selector: Temperature · Humidity · Light
- Line chart of the last 30 readings (from Adafruit IO)
- Stats row: Current / Min / Max / Avg
- Raw data table of the last 8 readings
- Auto-refreshes every 30 seconds with a live countdown

### Alerts
- Current status cards for all 5 sensors with colour-coded level badges
- Active alerts section with left-border alert cards (warning/danger)
- Threshold reference table
- Pull-to-refresh

---

## Design System

Tokens are in `src/theme/index.js`, derived from the `ux-ui/` design files.

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

- **Alert cards**: 4 px coloured left border + tinted background (from `smart_home_home_brainstorm_v2.html`)
- **Device state**: gold border = ON, grey = OFF
- **Toggle switch**: custom — gold track when ON, grey when OFF
- **Section labels**: uppercase, letter-spaced, caption colour

---

## Getting Started

### Prerequisites

- Node.js 18+
- **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Backend running — see `code/smarthouse/README.md`

### Install dependencies

```bash
cd code/smarthouse-app
npm install
```

### Configure the API URL

Open `src/services/api.js` and set `API_BASE_URL` to match your environment:

```js
// Physical phone (Expo Go) — use your computer's local IP
export const API_BASE_URL = 'http://192.168.x.x:8000';

// iOS Simulator
export const API_BASE_URL = 'http://localhost:8000';

// Android Emulator
export const API_BASE_URL = 'http://10.0.2.2:8000';
```

Find your local IP on macOS:
```bash
ipconfig getifaddr en0
```

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

A QR code appears in the terminal. Open **Expo Go** on your phone and scan it. The app loads over your local network — no build or USB required.

> Both your phone and computer must be on the **same Wi-Fi network**.

### Simulator / Emulator

```bash
npx expo start --ios      # requires Xcode
npx expo start --android  # requires Android Studio
```

---

## API Configuration

The app uses two data sources:

| Source | Used for | Auth |
|--------|----------|------|
| `code/smarthouse` FastAPI | Login, register, sensor values, device control, schedules | JWT Bearer token |
| Adafruit IO REST API | Feed history (charts only) | `X-AIO-Key` header |

### Backend endpoints used

| Screen | Method | Endpoint |
|--------|--------|----------|
| Login | POST | `/api/auth/login` |
| Register | POST | `/api/auth/register` |
| Home / Alerts | GET | `/api/sensors` |
| Home / Devices | GET | `/api/devices` |
| Home / Devices | POST | `/api/devices/{id}/set_state` |

The JWT token is passed as `Authorization: Bearer <token>` on all authenticated requests.

---

## Architecture Notes

**Auth flow**: `AuthContext` holds the JWT in component state. `App.js` renders `LoginScreen` when `token` is null, otherwise renders the tab navigator. Logging out clears the token and returns to the login screen.

**Polling**: `HomeScreen` polls `GET /api/sensors` and `GET /api/devices` every 5 seconds to keep sensor readings and device states current. `ChartScreen` auto-refreshes every 30 seconds.

**Chart data**: The FastAPI backend does not yet implement a history endpoint, so `ChartScreen` fetches feed history directly from Adafruit IO using `src/services/adafruitIO.js`. Once the backend exposes `/api/sensors/{id}/history`, this can be swapped in.

**No persistent storage**: The JWT token is in-memory only and is lost on app restart. For production, replace with `expo-secure-store`.

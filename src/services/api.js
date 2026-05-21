import {
  MOCK_SENSORS, MOCK_DEVICES, MOCK_SCHEDULES, MOCK_ALERTS, MOCK_HISTORY, MOCK_DEVICE_HISTORY,
} from './mockData';

// ── DEV MODE ──────────────────────────────────────────────────────────────────
// true  → skip the backend, every function returns mock data instantly.
// false → hit the real FastAPI backend (update API_BASE_URL below first).
export const DEV_MODE = false;
// ─────────────────────────────────────────────────────────────────────────────

// When testing on a physical device with Expo Go, set this to your computer's
// local IP address, e.g. 'http://192.168.1.42:8001'.
//   iOS Simulator  → 'http://localhost:8001'
//   Android Emu    → 'http://10.0.2.2:8001'
//   Physical phone → 'http://<your-lan-ip>:8001'
export const API_BASE_URL = 'http://192.168.30.203:8001';

// ── Internal fetch helper ─────────────────────────────────────────────────────
// The backend wraps every success as { success: true, data: <payload> }.
// This helper unwraps that envelope automatically.
async function request(path, { token, body, method = 'GET', queryParams } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let url = `${API_BASE_URL}${path}`;
  if (queryParams) {
    const qs = new URLSearchParams(queryParams).toString();
    url = `${url}?${qs}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return res.text();
  const json = await res.json();
  const result = json?.success !== undefined && 'data' in json ? json.data : json;

  console.log('[API]', method, path, result);   // log API's response
  return json?.success !== undefined && 'data' in json ? json.data : json;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(username, password) {
  if (DEV_MODE) return { access_token: 'dev-token', token_type: 'bearer' };
  return request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

// Note: Postman body is { username, password } only.
// is_house_owner is an app-side extension; backend may ignore or 422 it.
export async function register(username, password, is_house_owner = false) {
  if (DEV_MODE) return { message: 'User registered successfully' };
  return request('/api/auth/register', {
    method: 'POST',
    body: { username, password, is_house_owner },
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function listUsers(token) {
  if (DEV_MODE) return [{ username: 'admin', is_house_owner: true }];
  return request('/api/users', { token });
}

export async function getUserByUsername(username) {
  if (DEV_MODE) return { username, is_house_owner: username === 'admin' };
  return request('/get-user-by-username', { queryParams: { username } });
}

// ── Sensors ───────────────────────────────────────────────────────────────────
export async function listSensors() {
  if (DEV_MODE) return MOCK_SENSORS;
  return request('/api/sensors');
}

export async function getSensorValue(sensorId, token) {
  if (DEV_MODE) {
    const s = (MOCK_SENSORS.sensors ?? []).find(x => x.feed_key === sensorId);
    return s?.current_value ?? '0';
  }
  return request(`/api/sensors/${sensorId}/get_value`, { token });
}

// POST /api/sensors/history — preferred over Adafruit IO for chart data.
// Response shape assumed: [{ value: number|string, created_at: ISO string }]
export async function getSensorHistory(token, feedKey, startTime, endTime) {
  if (DEV_MODE) {
    const raw = MOCK_HISTORY[feedKey] ?? [];
    return raw.map(d => ({ value: d.value, created_at: d.time.toISOString() }));
  }
  return request('/api/sensors/history', {
    method: 'POST',
    body: { auth_token: token, feed_key: feedKey, start_time: startTime, end_time: endTime },
  });
}

// GET /api/sensor-data?feed_key=...&start_time=...&end_time=...&auth_token=...
// Response shape: [{ value, created_at }]
export async function getSensorData(token, feedKey, startTime, endTime) {
  if (DEV_MODE) {
    const raw = MOCK_HISTORY[feedKey] ?? [];
    return { feed_key: feedKey, data: raw.map(d => ({ timestamp: d.time.toISOString(), value: String(d.value) })), count: raw.length };
  }
  return request('/api/sensor-data', {
    token,
    queryParams: { feed_key: feedKey, start_time: startTime, end_time: endTime },
  });
}

// GET /api/device-data?feed_key=...&start_time=...&end_time=...
// Response shape: { feed_key, data: [{ timestamp, value }], count }
export async function getDeviceActivities(token, feedKey, startTime, endTime) {
  if (DEV_MODE) {
    const raw = MOCK_DEVICE_HISTORY[feedKey] ?? [];
    return { feed_key: feedKey, data: raw.map(d => ({ timestamp: d.time.toISOString(), value: String(d.value) })), count: raw.length };
  }
  return request('/api/device-data', {
    token,
    queryParams: { feed_key: feedKey, start_time: startTime, end_time: endTime },
  });
}

// ── Devices ───────────────────────────────────────────────────────────────────
export async function listDevices() {
  if (DEV_MODE) return MOCK_DEVICES;
  return request('/api/devices');
}

// Conflict fixed: was POST with body — actual API is GET with auth_token as query param.
export async function getDeviceState(deviceId, token) {
  if (DEV_MODE) {
    const d = MOCK_DEVICES.devices.find(x => (x.feed_key ?? x.key) === deviceId);
    return d?.value ?? d?.last_value ?? 'OFF';
  }
  return request(`/api/devices/${deviceId}/get_state`, {
    queryParams: { auth_token: token },
  });
}

export async function setDeviceState(deviceId, state, token) {
  if (DEV_MODE) return { message: 'ok', device_id: deviceId, state };
  return request(`/api/devices/${deviceId}/set_state`, {
    method: 'POST',
    body: { auth_token: token, state },
  });
}

// ── Schedules ─────────────────────────────────────────────────────────────────
export async function listSchedules(token, deviceId = null) {
  if (DEV_MODE) {
    return deviceId
      ? MOCK_SCHEDULES.filter(s => s.device_id === deviceId)
      : MOCK_SCHEDULES;
  }
  const queryParams = deviceId ? { device_id: deviceId } : undefined;
  return request('/api/schedules', { token, queryParams });
}

export async function getScheduleById(token, scheduleId) {
  if (DEV_MODE) {
    return MOCK_SCHEDULES.find(s => s.id === scheduleId) ?? null;
  }
  return request(`/api/schedules/${scheduleId}`, { token });
}

export async function createSchedule(token, data) {
  if (DEV_MODE) return { id: Date.now(), ...data };
  return request('/api/schedules', {
    method: 'POST',
    token,
    body: data,
  });
}

export async function updateSchedule(token, scheduleId, data) {
  if (DEV_MODE) return { id: scheduleId, ...data };
  return request(`/api/schedules/${scheduleId}`, {
    method: 'PUT',
    token,
    body: data,
  });
}

// ── Alerts ───────────────────────────────────────────────────────────────────
// GET /api/alerts/list — returns server-generated alerts.
// Optional `since` is an ISO timestamp string to filter recent alerts only.
// Real response shape: { alerts: [{ feed_key, type, title, msg, timestamp }] }
export async function listAlerts(since = null) {
  if (DEV_MODE) {
    if (!since) return MOCK_ALERTS;
    return MOCK_ALERTS.filter(a => new Date(a.timestamp) >= new Date(since));
  }
  const queryParams = since ? { since } : undefined;
  const res = await request('/api/alerts/list', { queryParams });
  return Array.isArray(res) ? res : (res?.alerts ?? []);
}

// ── System ────────────────────────────────────────────────────────────────────
// Stub endpoint — backend does not yet return real data.
export async function getSystemMode(token) {
  if (DEV_MODE) return { mode: 'home' };
  return request('/api/system/mode', { token });
}

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
export const API_BASE_URL = 'http://192.168.69.92:8001';

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

  const PASSWORD_KEYS = ['password', 'new_password', 'confirm_new_password', 'current_password'];
  const logBody = body
    ? Object.fromEntries(Object.entries(body).map(([k, v]) =>
        PASSWORD_KEYS.includes(k) ? [k, '***'] : [k, v]
      ))
    : queryParams ?? '';
  console.log('[API →]', method, path, logBody);

  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn('[API ✗]', method, path, res.status, text);
    let errMsg = `${res.status}`;
    try { const j = JSON.parse(text); if (j.message) errMsg = j.message; } catch {}
    throw new Error(errMsg);
  }

  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return res.text();
  const json = await res.json();
  const result = json?.success !== undefined && 'data' in json ? json.data : json;

  console.log('[API ✓]', method, path, result);
  return result;
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
export async function register(username, password, is_house_owner = false, display_name = '', email = '') {
  if (DEV_MODE) return { message: 'User registered successfully' };
  return request('/api/auth/register', {
    method: 'POST',
    body: { username, password, is_house_owner, display_name, email },
  });
}

export async function changePassword(token, currentPassword, newPassword) {
  if (DEV_MODE) return { message: 'Password changed successfully' };
  return request('/api/auth/change-password', {
    method: 'PUT',
    token,
    body: {
      current_password:    currentPassword,
      new_password:        newPassword,
      confirm_new_password: newPassword,
    },
  });
}

export async function resetPassword(username, email, newPassword) {
  if (DEV_MODE) return { message: 'Password reset successfully' };
  return request('/api/auth/forgot-password/reset', {
    method: 'POST',
    body: { username, email, new_password: newPassword, confirm_new_password: newPassword },
  });
}

export async function verifyEmail(username, email) {
  if (DEV_MODE) return { username };
  return request('/api/auth/forgot-password/verify-email', {
    method: 'POST',
    body: { username, email },
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function listUsers(token) {
  if (DEV_MODE) return [
    { id: 1, username: 'dev',   role: 'homeowner' },
    { id: 2, username: 'alice', role: 'member'    },
    { id: 3, username: 'bob',   role: 'member'    },
  ];
  const res = await request('/api/users', { token });
  return Array.isArray(res) ? res : (res?.users ?? res?.data ?? []);
}

export async function getUserByUsername(username) {
  if (DEV_MODE) return { username, is_house_owner: username === 'dev' || username === 'admin' };
  return request('/get-user-by-username', { queryParams: { username } });
}

// Creates a new family member account via the shared register endpoint.
export async function createMember(token, username, password, ownerID) {
  if (DEV_MODE) return { message: 'Member created successfully' };
  return request('/api/auth/register', {
    method: 'POST',
    token,
    body: { username, password,ownerID },
  });
}

export async function deleteMember(token, userId) {
  if (DEV_MODE) return { message: 'Member deleted successfully' };
  return request(`/api/users/${userId}`, {
    method: 'DELETE',
    token,
  });
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

export async function updateDevice(token, feedKey, data) {
  if (DEV_MODE) return { message: 'ok' };
  return request(`/api/devices/${feedKey}`, { method: 'PATCH', token, body: data });
}

export async function updateSensor(token, feedKey, data) {
  if (DEV_MODE) return { message: 'ok' };
  return request(`/api/sensors/${feedKey}`, { method: 'PATCH', token, body: data });
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
export async function getSystemMode(token) {
  if (DEV_MODE) return { home: true, away: false, sleep: false, automation: false };
  return request('/api/system/mode', { token });
}

// ── Modes ─────────────────────────────────────────────────────────────────────
export async function getAwayMode(token) {
  if (DEV_MODE) return { enabled: false };
  const res = await request('/api/modes/away', { token });
  // Backend returns { away_mode: bool }, normalize to { enabled: bool }
  return { enabled: res?.away_mode ?? false };
}

export async function setAwayMode(token, enabled) {
  if (DEV_MODE) return { enabled };
  return request('/api/modes/away', { method: 'PUT', token, body: { enabled } });
}

export async function getAutomationMode(token) {
  if (DEV_MODE) return { enabled: false, door_auto_lock: false, door_auto_lock_delay_sec: 120 };
  return request('/api/modes/automation', { token });
}

export async function setAutomationMode(token, data) {
  if (DEV_MODE) return data;
  return request('/api/modes/automation', { method: 'PUT', token, body: data });
}

// ── Automation Rules ──────────────────────────────────────────────────────────
// Rule shape: { id, feed_key, time_of_day (HH:MM), days_of_week (comma-sep), value, enabled }
export async function listAutomationRules(token, feedKey = null) {
  if (DEV_MODE) return [];
  const queryParams = feedKey ? { feed_key: feedKey } : undefined;
  return request('/api/automation/rules', { token, queryParams });
}

export async function createAutomationRule(token, data) {
  if (DEV_MODE) return { id: Date.now(), ...data };
  return request('/api/automation/rules', { method: 'POST', token, body: data });
}

export async function updateAutomationRule(token, id, data) {
  if (DEV_MODE) return { id, ...data };
  return request(`/api/automation/rules/${id}`, { method: 'PUT', token, body: data });
}

export async function deleteAutomationRule(token, id) {
  if (DEV_MODE) return { message: 'ok' };
  return request(`/api/automation/rules/${id}`, { method: 'DELETE', token });
}

// ── Thresholds ────────────────────────────────────────────────────────────────
// GET /api/setting-profiles/current/thresholds
// Response: { temp_lower_threshold, temp_upper_threshold, humidity_lower_threshold,
//             humidity_upper_threshold, gas_upper_threshold, light_lower_threshold }
export async function getThresholds(token) {
  if (DEV_MODE) return {
    temp_lower_threshold:     18,
    temp_upper_threshold:     30,
    humidity_lower_threshold: 30,
    humidity_upper_threshold: 80,
    gas_upper_threshold:      500,
    light_lower_threshold:    100,
  };
  return request('/api/setting-profiles/current/thresholds', { token });
}

export async function updateThresholds(token, data) {
  if (DEV_MODE) return data;
  return request('/api/setting-profiles/current/thresholds', {
    method: 'PUT',
    body:   { ...data, auth_token: token },
  });
}

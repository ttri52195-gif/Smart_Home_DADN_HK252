import { MOCK_SENSORS, MOCK_DEVICES, MOCK_SCHEDULES } from './mockData';

// ── DEV MODE ──────────────────────────────────────────────────────────────────
// true  → skip the backend, every function returns mock data instantly.
// false → hit the real FastAPI backend (update API_BASE_URL below first).
export const DEV_MODE = true;
// ─────────────────────────────────────────────────────────────────────────────

// When testing on a physical device with Expo Go, set this to your computer's
// local IP address, e.g. 'http://192.168.1.42:8000'.
//   iOS Simulator  → 'http://localhost:8000'
//   Android Emu    → 'http://10.0.2.2:8000'
//   Physical phone → 'http://<your-lan-ip>:8000'
export const API_BASE_URL = 'http://localhost:8000';

// ── Internal fetch helper ─────────────────────────────────────────────────────
async function request(path, { token, body, method = 'GET' } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(username, password) {
  if (DEV_MODE) return { access_token: 'dev-token', token_type: 'bearer' };
  return request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export async function register(username, password, is_house_owner = false) {
  if (DEV_MODE) return { message: 'User registered successfully' };
  return request('/api/auth/register', {
    method: 'POST',
    body: { username, password, is_house_owner },
  });
}

// ── Sensors ───────────────────────────────────────────────────────────────────
export async function listSensors() {
  if (DEV_MODE) return MOCK_SENSORS;
  return request('/api/sensors');
}

export async function getSensorValue(sensorId, token) {
  if (DEV_MODE) {
    const s = MOCK_SENSORS.sensors.find((x) => x.key === sensorId);
    return s?.last_value ?? '0';
  }
  return request(`/api/sensors/${sensorId}/get_value`, {
    method: 'POST',
    token,
    body: { auth_token: token },
  });
}

// ── Devices ───────────────────────────────────────────────────────────────────
export async function listDevices() {
  if (DEV_MODE) return MOCK_DEVICES;
  return request('/api/devices');
}

export async function getDeviceState(deviceId, token) {
  if (DEV_MODE) {
    const d = MOCK_DEVICES.devices.find((x) => x.key === deviceId);
    return d?.last_value ?? 'OFF';
  }
  return request(`/api/devices/${deviceId}/get_state`, {
    method: 'POST',
    token,
    body: { auth_token: token },
  });
}

export async function setDeviceState(deviceId, state, token) {
  if (DEV_MODE) return { message: 'ok', device_id: deviceId, state };
  return request(`/api/devices/${deviceId}/set_state`, {
    method: 'POST',
    token,
    body: { auth_token: token, state },
  });
}

// ── Devices ───────────────────────────────────────────────────────────────────
export const MOCK_ROOMS = [
  {
    id: 'bedroom',
    name: 'Master Bedroom',
    type: 'BEDROOM',
    devices: ['lb1', 'rgb', 'door', 'pir'],
  },
  {
    id: 'living',
    name: 'Living Room',
    type: 'LIVING',
    devices: ['light-pwm'],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    type: 'KITCHEN',
    devices: ['lb1'],
  },
];

// ── Schedules ─────────────────────────────────────────────────────────────────
export async function listSchedules(token, deviceId = null) {
  if (DEV_MODE) {
    return deviceId
      ? MOCK_SCHEDULES.filter((s) => s.device_id === deviceId)
      : MOCK_SCHEDULES;
  }
  const q = deviceId ? `?device_id=${deviceId}` : '';
  return request(`/api/schedules${q}`, { token });
}

export async function createSchedule(token, data) {
  if (DEV_MODE) return { id: Date.now(), ...data };
  return request('/api/schedules', {
    method: 'POST',
    token,
    body: { auth_token: token, ...data },
  });
}

export async function updateSchedule(token, scheduleId, data) {
  if (DEV_MODE) return { id: scheduleId, ...data };
  return request(`/api/schedules/${scheduleId}`, {
    method: 'PUT',
    token,
    body: { auth_token: token, ...data },
  });
}

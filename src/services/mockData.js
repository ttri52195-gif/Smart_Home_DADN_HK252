// Mock responses that mirror the real API shape.
// Used when DEV_MODE = true in api.js.

// Timestamps generated at load time so devices/sensors always appear online.
function minsAgo(n) { return new Date(Date.now() - n * 60 * 1000).toISOString(); }

// ── Sensors ───────────────────────────────────────────────────────────────────
// Mirrors GET /api/sensors → { sensors: [...], count }
export const MOCK_SENSORS = {
  sensors: [
    { feed_key: 'temperature', name: 'temperature', type: 'TEMPERATURE',    current_value: '28.00', unit: '°C',  location: 'Living Room', last_recorded_at: minsAgo(1) },
    { feed_key: 'humidity',    name: 'humidity',    type: 'HUMIDITY',        current_value: '45',    unit: '%',   location: 'Living Room', last_recorded_at: minsAgo(1) },
    { feed_key: 'rain',        name: 'rain',        type: 'RAIN',            current_value: '716',   unit: 'raw', location: 'Outdoor',     last_recorded_at: minsAgo(2) },
    { feed_key: 'gas',         name: 'gas',         type: 'GAS',             current_value: '820',   unit: 'ppm', location: 'Kitchen',     last_recorded_at: minsAgo(1) },
    { feed_key: 'themis',      name: 'themis',      type: 'LIGHT_INTENSITY', current_value: '82',    unit: '%',   location: 'Outdoor',     last_recorded_at: minsAgo(2) },
  ],
  count: 5,
};

// ── Devices ───────────────────────────────────────────────────────────────────
// Mirrors GET /api/devices → { devices: [...], count }
export const MOCK_DEVICES = {
  devices: [
    { feed_key: 'door',      name: 'DOOR',      type: 'DOOR',   status: 'ONLINE', value: 'OPEN', location: 'Entrance',    last_record_time: minsAgo(1) },
    { feed_key: 'lb1',       name: 'LB1',       type: 'LIGHT',  status: 'ONLINE', value: '41',   location: 'Bedroom',     last_record_time: minsAgo(1) },
    { feed_key: 'pir',       name: 'PIR',       type: 'MOTION', status: 'ONLINE', value: 'ON',   location: 'Bedroom',     last_record_time: minsAgo(1) },
    { feed_key: 'rgb',       name: 'RGB',       type: 'RGB',    status: 'ONLINE', value: '15',   location: 'Bedroom',     last_record_time: minsAgo(1) },
  ],
  count: 5,
};

// ── Alerts ────────────────────────────────────────────────────────────────────
// Mirrors GET /api/alerts/list → { alerts: [...] }
// Fields: feed_key, type, title, msg, timestamp
export const MOCK_ALERTS = [
  {
    feed_key:  'gas',
    type:      'GAS_LEAK',
    title:     'Alert from gas',
    msg:       'Gas concentration is high (3500.0 compared to 800.0).',
    timestamp: new Date(Date.now() - 2  * 60 * 1000).toISOString(),
  },
  {
    feed_key:  'pir',
    type:      'MOTION_DETECTED',
    title:     'Alert from pir',
    msg:       'Motion detected in living room.',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    feed_key:  'door',
    type:      'DOOR_FORCED_OPEN',
    title:     'Alert from door',
    msg:       'Door is open (value=OPEN).',
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
];

// ── Schedules ─────────────────────────────────────────────────────────────────
export const MOCK_SCHEDULES = [
  {
    id: 1,
    setting_profile_id: 1,
    device_id: 1,
    action: 'TURN_ON',
    payload: null,
    trigger_time: '2026-05-21T07:00:00Z',
  },
  {
    id: 2,
    setting_profile_id: 1,
    device_id: 2,
    action: 'TURN_OFF',
    payload: null,
    trigger_time: '2026-05-21T22:00:00Z',
  },
];

// ── Sensor history ────────────────────────────────────────────────────────────
// Used by getSensorHistory and getSensorData DEV_MODE branches.
// Shape: [{ value: number, time: Date }] — 30 points over the last hour.
function fakeSensorHistory(base, variance) {
  const now = Date.now();
  return Array.from({ length: 30 }, (_, i) => ({
    value: parseFloat((base + (Math.random() - 0.5) * variance).toFixed(2)),
    time:  new Date(now - (29 - i) * 2 * 60 * 1000), // 2-min intervals
  }));
}

export const MOCK_HISTORY = {
  temperature: fakeSensorHistory(27,  4),
  humidity:    fakeSensorHistory(65, 10),
  themis:      fakeSensorHistory(48, 20),
  rain:        fakeSensorHistory(70, 30),
  gas:         fakeSensorHistory(350, 80),
};

// ── Device activity history ───────────────────────────────────────────────────
// Used by getDeviceActivities DEV_MODE branch.
// Shape: [{ value: string, time: Date }] — alternating states, 1-min intervals.
// Most recent entry is the current state shown in MOCK_DEVICES.
function fakeDeviceHistory(states) {
  const now = Date.now();
  return states.map((value, i) => ({
    value,
    time: new Date(now - (states.length - 1 - i) * 60 * 1000),
  }));
}

export const MOCK_DEVICE_HISTORY = {
  'lb1':       fakeDeviceHistory(['0', '41', '0', '41', '0', '41']),
  'door':      fakeDeviceHistory(['OPEN', 'CLOSE', 'OPEN', 'CLOSE', 'OPEN', 'CLOSE']),
  'pir':       fakeDeviceHistory(['ON', 'OFF', 'ON', 'OFF', 'ON', 'OFF']),
  'rgb':       fakeDeviceHistory(['0', '15', '0', '15']),
  'light-pwm': fakeDeviceHistory(['0', '50', '0', '50']),
};

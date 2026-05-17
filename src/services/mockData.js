// Mock responses that mirror the real API shape.
// Used when DEV_MODE = true in api.js.

// Mirrors the unwrapped shape returned by GET /api/sensors after the BE middleware strips { success, data }
export const MOCK_SENSORS = {
  sensors: [
    { feed_key: 'temperature', name: 'temperature', type: 'TEMPERATURE',    current_value: '27.4', last_recorded_at: '2026-05-08T07:26:43+00:00' },
    { feed_key: 'humidity',    name: 'humidity',    type: 'HUMIDITY',        current_value: '65.2', last_recorded_at: '2026-05-08T07:26:43+00:00' },
    { feed_key: 'rain',        name: 'rain',        type: 'RAIN',            current_value: '85',   last_recorded_at: '2026-05-08T07:26:43+00:00' },
    { feed_key: 'gas',         name: 'gas',         type: 'GAS',             current_value: '312',  last_recorded_at: '2026-05-08T07:26:43+00:00' },
    { feed_key: 'themis',      name: 'themis',      type: 'LIGHT_INTENSITY', current_value: '48.0', last_recorded_at: '2026-05-08T07:26:43+00:00' },
  ],
  count: 5,
};

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

// Mirrors the unwrapped shape returned by GET /api/devices (feed_key + value, not key + last_value)
export const MOCK_DEVICES = {
  devices: [
    { feed_key: 'lb1',       name: 'Light Bulb 1',  type: 'LIGHT',  value: 'ON'    },
    { feed_key: 'door',      name: 'Front Door',    type: 'DOOR',   value: 'CLOSE' },
    { feed_key: 'pir',       name: 'Motion Sensor', type: 'MOTION', value: 'OFF'   },
    { feed_key: 'rgb',       name: 'RGB Strip',     type: 'RGB',    value: 'OFF'   },
    { feed_key: 'light-pwm', name: 'Dimmer Light',  type: 'DIMMER', value: 'OFF'   },
  ],
  count: 5,
};

// Assumed shape from GET /api/alerts/list:
// [{ id, sensor_key, value, message, level, created_at }]
// level: 'danger' | 'warn' | 'info'
export const MOCK_ALERTS = [
  {
    id:         1,
    sensor_key: 'temperature',
    value:      31.2,
    message:    'Temperature Alert',
    level:      'warn',
    created_at: new Date(Date.now() - 2  * 60 * 1000).toISOString(),
  },
  {
    id:         2,
    sensor_key: 'gas',
    value:      620,
    message:    'Gas Level Alert',
    level:      'warn',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

export const MOCK_SCHEDULES = [
  {
    id: 1,
    setting_profile_id: 1,
    device_id: 1,
    action: 'TURN_ON',
    payload: null,
    trigger_time: '2026-05-05T07:00:00Z',
  },
  {
    id: 2,
    setting_profile_id: 1,
    device_id: 2,
    action: 'TURN_OFF',
    payload: null,
    trigger_time: '2026-05-05T22:00:00Z',
  },
];

// Generates 30 fake history points ending now, spread over the last hour
function fakeHistory(base, variance) {
  const now = Date.now();
  return Array.from({ length: 30 }, (_, i) => ({
    value: parseFloat((base + (Math.random() - 0.5) * variance).toFixed(2)),
    time: new Date(now - (29 - i) * 2 * 60 * 1000), // 2-min intervals
  }));
}

export const MOCK_HISTORY = {
  temperature: fakeHistory(27, 4),
  humidity: fakeHistory(65, 10),
  themis: fakeHistory(48, 20),
};

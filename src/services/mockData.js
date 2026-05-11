// Mock responses that mirror the real API shape.
// Used when DEV_MODE = true in api.js.

export const MOCK_SENSORS = {
  success: true,
  data: {
    sensors: [
      { feed_key: 'temperature', name: 'temperature', type: 'TEMPERATURE',    current_value: '27.4', last_recorded_at: '2026-05-08T07:26:43+00:00' },
      { feed_key: 'humidity',    name: 'humidity',    type: 'HUMIDITY',        current_value: '65.2', last_recorded_at: '2026-05-08T07:26:43+00:00' },
      { feed_key: 'rain',        name: 'rain',        type: 'RAIN',            current_value: '85',   last_recorded_at: '2026-05-08T07:26:43+00:00' },
      { feed_key: 'gas',         name: 'gas',         type: 'GAS',             current_value: '312',  last_recorded_at: '2026-05-08T07:26:43+00:00' },
      { feed_key: 'themis',      name: 'themis',      type: 'LIGHT_INTENSITY', current_value: '48.0', last_recorded_at: '2026-05-08T07:26:43+00:00' },
    ],
    count: 5,
  },
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

export const MOCK_DEVICES = {
  devices: [
    { key: 'lb1', name: 'Light Bulb 1', type: 'LIGHT', last_value: 'ON' },
    { key: 'door', name: 'Front Door', type: 'DOOR', last_value: 'CLOSE' },
    { key: 'pir', name: 'Motion Sensor', type: 'MOTION', last_value: 'OFF' },
    { key: 'rgb', name: 'RGB Strip', type: 'RGB', last_value: 'OFF' },
    {
      key: 'light-pwm',
      name: 'Dimmer Light',
      type: 'DIMMER',
      last_value: 'OFF',
    },
  ],
  count: 5,
};

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

// Mock responses that mirror the real API shape.
// Used when DEV_MODE = true in api.js.

export const MOCK_SENSORS = {
  sensors: [
    { key: 'temperature', name: 'Temperature', last_value: '27.4' },
    { key: 'humidity', name: 'Humidity', last_value: '65.2' },
    { key: 'gas', name: 'Gas', last_value: '312' },
    { key: 'rain', name: 'Rain', last_value: '85' },
    { key: 'themis', name: 'Light', last_value: '48.0' },
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

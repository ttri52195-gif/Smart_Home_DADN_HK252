// Adafruit IO service — used only for feed history (charts).
// Device control and current values go through the backend API.

import { DEV_MODE } from './api';
import { MOCK_HISTORY } from './mockData';

const AIO_CONFIG = {
  KEY:      'aio_jrEp46FfMS3HVaJjyZA4ZrxzTFEJ',
  USERNAME: 'tri555',
  BASE_URL: 'https://io.adafruit.com/api/v2',
};

const AIO_HEADERS = {
  'X-AIO-Key': AIO_CONFIG.KEY,
  'Content-Type': 'application/json',
};

async function aioFetch(url) {
  const res = await fetch(url, { headers: AIO_HEADERS });
  if (!res.ok) throw new Error(`AIO ${res.status}`);
  return res.json();
}

export async function getFeedHistory(feedKey, limit = 30) {
  if (DEV_MODE) return (MOCK_HISTORY[feedKey] ?? []).slice(-limit);
  try {
    const data = await aioFetch(
      `${AIO_CONFIG.BASE_URL}/${AIO_CONFIG.USERNAME}/feeds/${feedKey}/data?limit=${limit}`
    );
    return data.reverse().map(d => ({
      value: parseFloat(d.value),
      time:  new Date(d.created_at),
    }));
  } catch {
    return [];
  }
}

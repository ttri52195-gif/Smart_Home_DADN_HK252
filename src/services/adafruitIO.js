export const AIO_CONFIG = {
  USERNAME: 'tri555',
  KEY: 'aio_jrEp46FfMS3HVaJjyZA4ZrxzTFEJ',
  BASE_URL: 'https://io.adafruit.com/api/v2',
};

const headers = {
  'X-AIO-Key': AIO_CONFIG.KEY,
  'Content-Type': 'application/json',
};

export async function publishFeed(feedKey, value) {
  const res = await fetch(
    `${AIO_CONFIG.BASE_URL}/${AIO_CONFIG.USERNAME}/feeds/${feedKey}/data`,
    { method: 'POST', headers, body: JSON.stringify({ value: String(value) }) }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Lỗi ${res.status} feed "${feedKey}": ${err}`);
  }
  return res.json();
}

export async function getFeedValue(feedKey) {
  const res = await fetch(
    `${AIO_CONFIG.BASE_URL}/${AIO_CONFIG.USERNAME}/feeds/${feedKey}/data/last`,
    { headers }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.value ?? null;
}

export async function getFeedHistory(feedKey, limit = 30) {
  const res = await fetch(
    `${AIO_CONFIG.BASE_URL}/${AIO_CONFIG.USERNAME}/feeds/${feedKey}/data?limit=${limit}`,
    { headers }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.reverse().map(d => ({
    value: parseFloat(d.value),
    time: new Date(d.created_at),
  }));
}

// ── Feed keys đúng với Adafruit IO của bạn ──────────────────────
// Sensor (Arduino → App)
export const FEED_TEMPERATURE = 'temperature';
export const FEED_HUMIDITY    = 'humidity';
export const FEED_THEMIS      = 'themis';

// Control (App → Arduino) — key chữ THƯỜNG theo Adafruit IO
export const FEED_LB1   = 'lb1';    // đèn LED  (key: lb1)
export const FEED_RGB   = 'rgb';    // NeoPixel  (key: rgb)
export const FEED_DOOR  = 'door';   // servo cửa (key: door)
export const FEED_PIR   = 'pir';    // PIR mode  (key: pir)

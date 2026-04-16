
// ── CONFIG ──────────────────────────────────────────────────────
export const AIO_CONFIG = {
  KEY: 'aio_jrEp46FfMS3HVaJjyZA4ZrxzTFEJ',
  USERNAME: 'tri555',
  BASE_URL: 'https://io.adafruit.com/api/v2',
};

const headers = {
  'X-AIO-Key': AIO_CONFIG.KEY,
  'Content-Type': 'application/json',
};

async function aioFetch(url, options = {}) {
  const res = await fetch(url, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }

  return res.json();
}

// ── FEED API ────────────────────────────────────────────────────

export async function publishFeed(feedKey, value) {
  return aioFetch(
    `${AIO_CONFIG.BASE_URL}/${AIO_CONFIG.USERNAME}/feeds/${feedKey}/data`,
    {
      method: 'POST',
      body: JSON.stringify({ value: String(value) }),
    }
  );
}

export async function getFeedValue(feedKey) {
  try {
    const data = await aioFetch(
      `${AIO_CONFIG.BASE_URL}/${AIO_CONFIG.USERNAME}/feeds/${feedKey}/data/last`
    );
    return data.value ?? null;
  } catch {
    return null;
  }
}

export async function getFeedHistory(feedKey, limit = 30) {
  try {
    const data = await aioFetch(
      `${AIO_CONFIG.BASE_URL}/${AIO_CONFIG.USERNAME}/feeds/${feedKey}/data?limit=${limit}`
    );

    return data.reverse().map(d => ({
      value: parseFloat(d.value),
      time: new Date(d.created_at),
    }));
  } catch {
    return [];
  }
}


export async function getAllFeeds() {
  return aioFetch(
    `${AIO_CONFIG.BASE_URL}/${AIO_CONFIG.USERNAME}/feeds`
  );
}

export async function getFeedInfo(feedKey) {
  try {
    return await aioFetch(
      `${AIO_CONFIG.BASE_URL}/${AIO_CONFIG.USERNAME}/feeds/${feedKey}`
    );
  } catch {
    return null;
  }
}

// ── NEW: DEVICE DASHBOARD ───────────────────────────────────────

export async function getAllDeviceStates() {
  try {
    const feeds = await getAllFeeds();

    const results = await Promise.all(
      feeds.map(async (feed) => {
        const value = await getFeedValue(feed.key);
        return { key: feed.key, value };
      })
    );

    return Object.fromEntries(
      results.map(item => [item.key, item.value])
    );
  } catch {
    return {};
  }
}

// ── FEED KEYS ───────────────────────────────────────────────────

// Sensor (Arduino → App)
export const FEED_TEMPERATURE = 'temperature';
export const FEED_HUMIDITY    = 'humidity';
export const FEED_THEMIS      = 'themis';
export const FEED_GAS         = 'gas';
export const FEED_RAIN        = 'rain';

// Control (App → Arduino)
export const FEED_LB1  = 'lb1';
export const FEED_RGB  = 'rgb';
export const FEED_DOOR = 'door';
export const FEED_PIR  = 'pir';
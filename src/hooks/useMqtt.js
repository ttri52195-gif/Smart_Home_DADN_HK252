import { useEffect, useState } from 'react';
import { getFeedValue } from '../services/adafruitIO';

export function useMqtt() {
  const [connected, setConnected] = useState(false);
  const [sensorData, setSensorData] = useState({
    temperature: '--',
    humidity: '--',
    themis: '--',
  });

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const [temp, hum, light] = await Promise.all([
          getFeedValue('temperature'),
          getFeedValue('humidity'),
          getFeedValue('themis'),
        ]);
        if (!active) return;
        setSensorData({
          temperature: temp !== null ? parseFloat(temp).toFixed(1) : '--',
          humidity:    hum  !== null ? parseInt(hum)               : '--',
          themis:      light!== null ? parseInt(light)             : '--',
        });
        setConnected(true);
      } catch {
        if (active) setConnected(false);
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return { connected, sensorData };
}

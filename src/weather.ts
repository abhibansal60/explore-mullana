// Mullana weather and air from Open-Meteo (free, no key). Cached for 30 minutes so a
// reload on patchy 4G costs nothing.
const URL_WX =
  "https://api.open-meteo.com/v1/forecast?latitude=30.2755&longitude=77.047&timezone=Asia%2FKolkata&forecast_days=2" +
  "&current=temperature_2m,weather_code&hourly=precipitation_probability" +
  "&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset";
const URL_AIR =
  "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=30.2755&longitude=77.047&timezone=Asia%2FKolkata&current=pm2_5";

// WMO weather codes, grouped the way people talk about the sky.
export function sky(code: number) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  if (code >= 95) return "Thunderstorm";
  return "";
}

// India's National AQI bands for PM2.5 (µg/m³). Officially a 24-hour average; this is the current hour.
export function airBand(pm25: number) {
  if (pm25 <= 30) return "Good";
  if (pm25 <= 60) return "Satisfactory";
  if (pm25 <= 90) return "Moderate";
  if (pm25 <= 120) return "Poor";
  if (pm25 <= 250) return "Very poor";
  return "Severe";
}

// First hour from `now` (IST "YYYY-MM-DDTHH:00") in the next 12 with a 50%+ chance of rain.
export function rainAt(times: string[], probs: number[], now: string) {
  const i = times.findIndex((t) => t >= now.slice(0, 13));
  if (i < 0) return undefined;
  for (let j = i; j < Math.min(i + 12, times.length); j++) if (probs[j] >= 50) return times[j];
  return undefined;
}

export type Weather = {
  temp: number;
  sky: string;
  max: number;
  min: number;
  sunrise: string; // "06:18"
  sunset: string;
  rain?: string; // "16:00"
  pm25?: number;
};

export async function loadWeather(): Promise<Weather> {
  const key = "wx1";
  try {
    const hit = JSON.parse(localStorage.getItem(key) ?? "null");
    if (hit && Date.now() - hit.at < 30 * 60e3) return hit.w;
  } catch {}
  const [wx, air] = await Promise.all([
    fetch(URL_WX).then((r) => r.json()),
    fetch(URL_AIR).then((r) => r.json()).catch(() => undefined),
  ]);
  const hm = (iso: string) => iso.slice(11, 16);
  const rain = rainAt(wx.hourly.time, wx.hourly.precipitation_probability, wx.current.time);
  const w: Weather = {
    temp: Math.round(wx.current.temperature_2m),
    sky: sky(wx.current.weather_code),
    max: Math.round(wx.daily.temperature_2m_max[0]),
    min: Math.round(wx.daily.temperature_2m_min[0]),
    sunrise: hm(wx.daily.sunrise[0]),
    sunset: hm(wx.daily.sunset[0]),
    rain: rain && hm(rain),
    pm25: air?.current?.pm2_5 != null ? Math.round(air.current.pm2_5) : undefined,
  };
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), w }));
  } catch {}
  return w;
}

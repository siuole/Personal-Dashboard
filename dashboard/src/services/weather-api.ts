const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const FALLBACK_LAT = import.meta.env.VITE_OPENWEATHER_LAT;
const FALLBACK_LON = import.meta.env.VITE_OPENWEATHER_LON;

const GEO_CACHE_KEY = 'weather_geo_cache';
const GEO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export interface CurrentWeather {
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  cityName: string;
  conditionId: number;
}

export interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  icon: string;
  description: string;
  conditionId: number;
}

async function getCoords(): Promise<{ lat: number; lon: number }> {
  const cached = localStorage.getItem(GEO_CACHE_KEY);
  if (cached) {
    const { lat, lon, ts } = JSON.parse(cached);
    if (Date.now() - ts < GEO_CACHE_TTL) return { lat, lon };
  }

  // 1. Try browser geolocation
  const browserCoords = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 6000 }
    );
  });

  if (browserCoords) {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ...browserCoords, ts: Date.now() }));
    return browserCoords;
  }

  // 2. Fallback: IP-based geolocation (no key needed)
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const coords = { lat: data.latitude, lon: data.longitude };
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ...coords, ts: Date.now() }));
        return coords;
      }
    }
  } catch { /* ignore */ }

  // 3. Last resort: env var fallback
  return { lat: Number(FALLBACK_LAT), lon: Number(FALLBACK_LON) };
}

export async function fetchCurrentWeather(): Promise<CurrentWeather> {
  const { lat, lon } = await getCoords();
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=de`
  );
  if (!res.ok) throw new Error('Weather fetch failed');
  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    humidity: data.main.humidity,
    windSpeed: Math.round(data.wind.speed * 3.6),
    cityName: data.name,
    conditionId: data.weather[0].id,
  };
}

export async function fetchForecast(): Promise<ForecastDay[]> {
  const { lat, lon } = await getCoords();
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=de`
  );
  if (!res.ok) throw new Error('Forecast fetch failed');
  const data = await res.json();

  const byDay: Record<string, typeof data.list[0][]> = {};
  for (const entry of data.list) {
    const day = entry.dt_txt.split(' ')[0];
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(entry);
  }

  return Object.entries(byDay)
    .slice(0, 5)
    .map(([day, entries]) => {
      const midday = entries.find((e) => e.dt_txt.includes('12:00')) ?? entries[Math.floor(entries.length / 2)];
      const temps = entries.map((e) => e.main.temp);
      return {
        date: day,
        tempMin: Math.round(Math.min(...temps)),
        tempMax: Math.round(Math.max(...temps)),
        icon: midday.weather[0].icon,
        description: midday.weather[0].description,
        conditionId: midday.weather[0].id,
      };
    });
}

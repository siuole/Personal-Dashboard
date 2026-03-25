const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

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

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ lat, lon, ts: Date.now() }));
        resolve({ lat, lon });
      },
      () => reject(new Error('Standort nicht verfügbar')),
      { timeout: 8000 }
    );
  });
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

  const today = new Date().toISOString().split('T')[0];

  return Object.entries(byDay)
    .filter(([day]) => day !== today)
    .slice(0, 3)
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

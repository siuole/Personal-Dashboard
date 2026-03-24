const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const LAT = import.meta.env.VITE_OPENWEATHER_LAT;
const LON = import.meta.env.VITE_OPENWEATHER_LON;

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

export async function fetchCurrentWeather(): Promise<CurrentWeather> {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric&lang=de`
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
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric&lang=de`
  );
  if (!res.ok) throw new Error('Forecast fetch failed');
  const data = await res.json();

  // Group by day, pick midday entry
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

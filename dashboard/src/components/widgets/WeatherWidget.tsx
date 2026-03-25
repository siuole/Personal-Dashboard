import { useState, useEffect, useCallback } from 'react';
import { fetchCurrentWeather, fetchForecast } from '../../services/weather-api';
import type { CurrentWeather, ForecastDay } from '../../services/weather-api';
import ErrorState from '../layout/ErrorState';

function getWeatherCategory(id: number): 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'mist' {
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'mist';
  if (id === 800) return 'clear';
  return 'cloudy';
}

// Glassmorphism day icon: cloud with sun peeking out (pure CSS/SVG, no emoji)
function DayIcon({ category }: { category: ReturnType<typeof getWeatherCategory> }) {
  if (category === 'clear') {
    return (
      <div style={{ width: 72, height: 72, position: 'relative', flexShrink: 0 }}>
        <style>{`
          @keyframes sun-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes sun-pulse  { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.85; transform:scale(1.06); } }
          .sun-rays { animation: sun-rotate 12s linear infinite; transform-origin: 36px 36px; }
          .sun-core { animation: sun-pulse 3s ease-in-out infinite; transform-origin: 36px 36px; }
        `}</style>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <g className="sun-rays">
            {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => (
              <line key={i} x1="36" y1="6" x2="36" y2="14"
                stroke="rgba(255,220,80,0.9)" strokeWidth="2.5" strokeLinecap="round"
                transform={`rotate(${deg} 36 36)`} />
            ))}
          </g>
          <circle className="sun-core" cx="36" cy="36" r="15" fill="rgba(255,220,80,0.95)" />
          <circle cx="36" cy="36" r="11" fill="#FFD040" />
        </svg>
      </div>
    );
  }

  if (category === 'rain' || category === 'storm') {
    return (
      <div style={{ width: 72, height: 72, position: 'relative', flexShrink: 0 }}>
        <style>{`
          @keyframes rain-fall { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(10px);opacity:0} }
          .r1{animation:rain-fall 1.1s ease-in infinite;}
          .r2{animation:rain-fall 1.1s ease-in .25s infinite;}
          .r3{animation:rain-fall 1.1s ease-in .5s infinite;}
          .r4{animation:rain-fall 1.1s ease-in .75s infinite;}
        `}</style>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          {/* Glassmorphism cloud shape */}
          <path d="M14 42a14 14 0 0 1 14-14h4a14 14 0 1 1 0 28H28A14 14 0 0 1 14 42Z" fill="rgba(255,255,255,0.25)" />
          <path d="M40 28a12 12 0 1 1 0 24" fill="rgba(255,255,255,0.15)" />
          <path d="M14 42a14 14 0 0 1 14-14h4a14 14 0 1 1 0 28H28A14 14 0 0 1 14 42Z" stroke="rgba(255,255,255,0.4)" strokeWidth="1" fill="none" />
          {/* Rain drops */}
          <line className="r1" x1="24" y1="57" x2="21" y2="65" stroke="rgba(180,220,255,0.9)" strokeWidth="2" strokeLinecap="round" />
          <line className="r2" x1="34" y1="57" x2="31" y2="65" stroke="rgba(180,220,255,0.9)" strokeWidth="2" strokeLinecap="round" />
          <line className="r3" x1="44" y1="57" x2="41" y2="65" stroke="rgba(180,220,255,0.9)" strokeWidth="2" strokeLinecap="round" />
          <line className="r4" x1="54" y1="57" x2="51" y2="65" stroke="rgba(180,220,255,0.9)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (category === 'snow') {
    return (
      <div style={{ width: 72, height: 72, position: 'relative', flexShrink: 0 }}>
        <style>{`
          @keyframes snow-fall { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(10px) rotate(60deg);opacity:0} }
          .s1{animation:snow-fall 1.5s ease-in infinite;}
          .s2{animation:snow-fall 1.5s ease-in .5s infinite;}
          .s3{animation:snow-fall 1.5s ease-in 1s infinite;}
        `}</style>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <path d="M14 38a14 14 0 0 1 14-14h4a14 14 0 1 1 0 28H28A14 14 0 0 1 14 38Z" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <text className="s1" x="18" y="66" fontSize="12" fill="rgba(200,230,255,0.9)">✦</text>
          <text className="s2" x="32" y="66" fontSize="12" fill="rgba(200,230,255,0.9)">✦</text>
          <text className="s3" x="46" y="66" fontSize="12" fill="rgba(200,230,255,0.9)">✦</text>
        </svg>
      </div>
    );
  }

  // Cloudy / mist — glassmorphism cloud with sun peeking from behind
  return (
    <div style={{ width: 72, height: 72, position: 'relative', flexShrink: 0 }}>
      <style>{`
        @keyframes cloud-drift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }
        .cloud-main { animation: cloud-drift 5s ease-in-out infinite; }
      `}</style>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        {/* Sun behind cloud */}
        <circle cx="52" cy="24" r="14" fill="rgba(255,210,60,0.7)" />
        <circle cx="52" cy="24" r="10" fill="rgba(255,220,80,0.85)" />
        {/* Glassmorphism cloud */}
        <g className="cloud-main">
          <path d="M10 44a16 16 0 0 1 16-16h6a16 16 0 1 1 0 32H26A16 16 0 0 1 10 44Z"
            fill="rgba(255,255,255,0.30)" />
          <path d="M10 44a16 16 0 0 1 16-16h6a16 16 0 1 1 0 32H26A16 16 0 0 1 10 44Z"
            stroke="rgba(255,255,255,0.5)" strokeWidth="1" fill="none" />
        </g>
      </svg>
    </div>
  );
}

// CSS moon icon — gradient sphere with shine
function MoonIcon() {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
      background: 'radial-gradient(circle at 35% 35%, #E8E0C8, #C8B878 50%, #8B7A40)',
      boxShadow: 'inset -4px -4px 8px rgba(0,0,0,0.4), inset 2px 2px 6px rgba(255,255,200,0.3), 0 0 16px rgba(200,180,80,0.25)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* shine highlight */}
      <div style={{
        position: 'absolute', top: 6, left: 8, width: 12, height: 8, borderRadius: '50%',
        background: 'rgba(255,255,220,0.45)',
        transform: 'rotate(-20deg)',
      }} />
      {/* crater */}
      <div style={{
        position: 'absolute', bottom: 10, right: 9, width: 8, height: 8, borderRadius: '50%',
        background: 'rgba(0,0,0,0.12)',
        boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

function StatPill({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(8px)',
      borderRadius: 20, padding: '4px 10px',
      border: '1px solid rgba(255,255,255,0.2)',
    }}>
      {icon}
      <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: 500, letterSpacing: 0.2 }}>{value}</span>
    </div>
  );
}

// SVG stat icons
function WindIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2M12.59 19.41A2 2 0 1 0 14 16H2M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2"/>
    </svg>
  );
}
function DropIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)" stroke="none">
      <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0C19 10 12 2 12 2Z"/>
    </svg>
  );
}
function RainIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round">
      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2M12 15v2"/>
    </svg>
  );
}

function forecastEmoji(cat: ReturnType<typeof getWeatherCategory>): string {
  if (cat === 'clear') return '☀️';
  if (cat === 'rain') return '🌧️';
  if (cat === 'storm') return '⛈️';
  if (cat === 'snow') return '❄️';
  if (cat === 'mist') return '🌫️';
  return '⛅';
}

function ForecastSection({ forecast }: { forecast: ForecastDay[] }) {
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const todayIdx = new Date().getDay();

  return (
    <div style={{
      flex: '0 0 auto',
      background: 'linear-gradient(145deg, #1e3a5f 0%, #152a45 100%)',
      padding: '10px 16px',
      display: 'flex', alignItems: 'stretch',
    }}>
      {forecast.map((day, i) => {
        const date = new Date(day.date + 'T12:00:00');
        const isToday = date.getDay() === todayIdx && i === 0;
        const name = isToday ? 'Heute' : dayNames[date.getDay()];
        const cat = getWeatherCategory(day.conditionId);

        return (
          <div key={day.date} style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 5, padding: '4px 0',
            borderRight: i < forecast.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: isToday ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
              letterSpacing: 0.5,
            }}>
              {name}
            </span>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{forecastEmoji(cat)}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                {day.tempMax}°
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                {day.tempMin}°
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [current, days] = await Promise.all([fetchCurrentWeather(), fetchForecast()]);
      setWeather(current);
      setForecast(days);
    } catch {
      setError('Wetterdaten nicht verfügbar');
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  if (error) {
    return (
      <div className="h-full p-4 flex flex-col">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const category = getWeatherCategory(weather.conditionId);

  return (
    <div style={{
      height: '100%', borderRadius: 16, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── DAY SECTION ── */}
      <div style={{
        flex: '1 1 0',
        background: 'linear-gradient(145deg, #4A9FE8 0%, #2D7DD2 60%, #1A5FAA 100%)',
        padding: '20px 20px 16px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 54, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: -2 }}>
              {weather.temp}°
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginTop: 4, letterSpacing: 0.5 }}>
              {weather.cityName}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2, textTransform: 'capitalize' }}>
              {weather.description}
            </div>
          </div>
          <DayIcon category={category} />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          <StatPill icon={<WindIcon />} value={`${weather.windSpeed} km/h`} />
          <StatPill icon={<DropIcon />} value={`${weather.humidity}%`} />
          <StatPill icon={<RainIcon />} value={`Gefühlt ${weather.feelsLike}°`} />
        </div>
      </div>

      {/* ── FORECAST SECTION ── */}
      {forecast.length > 0 && <ForecastSection forecast={forecast} />}
    </div>
  );
}

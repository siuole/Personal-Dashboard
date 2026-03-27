import { useState, useEffect, useCallback } from 'react';
import { fetchCurrentWeather, fetchForecast } from '../../services/weather-api';
import type { CurrentWeather, ForecastDay } from '../../services/weather-api';
import ErrorState from '../layout/ErrorState';

type WeatherCat = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'mist';

function getCategory(id: number): WeatherCat {
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'mist';
  if (id === 800) return 'clear';
  return 'cloudy';
}

// Subtle tint per condition — sits on top of the glassmorphism base
function getTint(cat: WeatherCat): string {
  switch (cat) {
    case 'clear':  return 'rgba(255,195,30,0.09)';
    case 'rain':   return 'rgba(70,120,210,0.09)';
    case 'storm':  return 'rgba(70,70,95,0.11)';
    case 'snow':   return 'rgba(100,180,255,0.1)';
    case 'mist':   return 'rgba(150,160,175,0.1)';
    default:       return 'rgba(100,130,170,0.08)';
  }
}

// ── Large animated weather icon (for light background) ──────────────────────

function WeatherIcon({ cat }: { cat: WeatherCat }) {
  if (cat === 'clear') return (
    <svg width="76" height="76" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes wl-spin { to { transform: rotate(360deg); } }
        .wl-rays { animation: wl-spin 18s linear infinite; transform-origin: 40px 40px; }
      `}</style>
      <g className="wl-rays">
        {[0,45,90,135,180,225,270,315].map((d, i) => (
          <line key={i} x1="40" y1="10" x2="40" y2="20"
            stroke="rgba(230,160,0,0.55)" strokeWidth="3" strokeLinecap="round"
            transform={`rotate(${d} 40 40)`} />
        ))}
      </g>
      <circle cx="40" cy="40" r="18" fill="rgba(255,195,30,0.2)" />
      <circle cx="40" cy="40" r="14" fill="#F5A623" />
      <circle cx="40" cy="40" r="10" fill="#FFBE3D" />
    </svg>
  );

  if (cat === 'rain') return (
    <svg width="76" height="76" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes wl-drop { 0%{transform:translateY(0);opacity:.8} 100%{transform:translateY(14px);opacity:0} }
        .wld1{animation:wl-drop 1.1s ease-in infinite;}
        .wld2{animation:wl-drop 1.1s .28s ease-in infinite;}
        .wld3{animation:wl-drop 1.1s .55s ease-in infinite;}
        .wld4{animation:wl-drop 1.1s .82s ease-in infinite;}
      `}</style>
      <path d="M16 42a16 16 0 0 1 16-16h6a16 16 0 1 1 0 32H32A16 16 0 0 1 16 42Z"
        fill="rgba(100,140,200,0.2)" stroke="rgba(80,120,185,0.45)" strokeWidth="1.5"/>
      <line className="wld1" x1="24" y1="62" x2="20" y2="72" stroke="rgba(60,110,210,0.7)" strokeWidth="2.2" strokeLinecap="round"/>
      <line className="wld2" x1="36" y1="62" x2="32" y2="72" stroke="rgba(60,110,210,0.7)" strokeWidth="2.2" strokeLinecap="round"/>
      <line className="wld3" x1="48" y1="62" x2="44" y2="72" stroke="rgba(60,110,210,0.7)" strokeWidth="2.2" strokeLinecap="round"/>
      <line className="wld4" x1="60" y1="62" x2="56" y2="72" stroke="rgba(60,110,210,0.7)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );

  if (cat === 'storm') return (
    <svg width="76" height="76" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes wl-flash { 0%,88%,100%{opacity:1} 92%{opacity:0.15} }
        .wl-bolt { animation: wl-flash 2.8s ease-in-out infinite; }
      `}</style>
      <path d="M14 40a16 16 0 0 1 16-16h6a16 16 0 1 1 0 32H30A16 16 0 0 1 14 40Z"
        fill="rgba(100,100,130,0.18)" stroke="rgba(80,80,110,0.35)" strokeWidth="1.5"/>
      <path className="wl-bolt" d="M44 56 L36 68 L42 68 L34 80 L52 62 L46 62 L54 50Z"
        fill="rgba(230,160,0,0.9)" />
    </svg>
  );

  if (cat === 'snow') return (
    <svg width="76" height="76" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes wl-snow { 0%{transform:translateY(0) rotate(0);opacity:.8} 100%{transform:translateY(14px) rotate(60deg);opacity:0} }
        .wls1{animation:wl-snow 2s ease-in infinite;}
        .wls2{animation:wl-snow 2s .65s ease-in infinite;}
        .wls3{animation:wl-snow 2s 1.3s ease-in infinite;}
      `}</style>
      <path d="M16 40a16 16 0 0 1 16-16h6a16 16 0 1 1 0 32H32A16 16 0 0 1 16 40Z"
        fill="rgba(100,170,240,0.18)" stroke="rgba(80,150,220,0.4)" strokeWidth="1.5"/>
      {[24, 40, 56].map((x, i) => (
        <g key={i} className={`wls${i+1}`}>
          <line x1={x} y1="62" x2={x} y2="74" stroke="rgba(70,130,220,0.65)" strokeWidth="2" strokeLinecap="round"/>
          <line x1={x-6} y1="68" x2={x+6} y2="68" stroke="rgba(70,130,220,0.65)" strokeWidth="2" strokeLinecap="round"/>
        </g>
      ))}
    </svg>
  );

  if (cat === 'mist') return (
    <svg width="76" height="76" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes wl-mist { 0%,100%{transform:translateX(0)} 50%{transform:translateX(5px)} }
        .wl-mist { animation: wl-mist 4s ease-in-out infinite; }
      `}</style>
      <g className="wl-mist">
        {[22, 32, 42, 52].map((y, i) => (
          <line key={i} x1={10 + i * 2} y1={y} x2={70 - i * 2} y2={y}
            stroke={`rgba(120,130,145,${0.45 - i * 0.07})`} strokeWidth="3.5" strokeLinecap="round"/>
        ))}
      </g>
    </svg>
  );

  // cloudy
  return (
    <svg width="76" height="76" viewBox="0 0 80 80" fill="none">
      <style>{`
        @keyframes wl-drift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(5px)} }
        .wl-cloud { animation: wl-drift 6s ease-in-out infinite; }
      `}</style>
      <circle cx="56" cy="26" r="14" fill="rgba(245,166,35,0.5)"/>
      <circle cx="56" cy="26" r="10" fill="rgba(255,190,50,0.75)"/>
      <g className="wl-cloud">
        <path d="M12 48a18 18 0 0 1 18-18h8a18 18 0 1 1 0 36H30A18 18 0 0 1 12 48Z"
          fill="rgba(200,210,230,0.55)" stroke="rgba(160,175,200,0.55)" strokeWidth="1.5"/>
      </g>
    </svg>
  );
}

// ── Small forecast icon ──────────────────────────────────────────────────────

function SmallIcon({ cat }: { cat: WeatherCat }) {
  if (cat === 'clear') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {[0,60,120,180,240,300].map((d, i) => (
        <line key={i} x1="12" y1="2" x2="12" y2="5"
          stroke="rgba(210,140,0,0.65)" strokeWidth="1.8" strokeLinecap="round"
          transform={`rotate(${d} 12 12)`}/>
      ))}
      <circle cx="12" cy="12" r="5" fill="#F5A623"/>
    </svg>
  );
  if (cat === 'rain') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 16a8 8 0 1 1 14 0" fill="rgba(100,140,200,0.2)" stroke="rgba(80,120,185,0.5)" strokeWidth="1.3"/>
      <line x1="9" y1="19" x2="7" y2="23" stroke="rgba(60,110,210,0.65)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="14" y1="19" x2="12" y2="23" stroke="rgba(60,110,210,0.65)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="19" y1="19" x2="17" y2="23" stroke="rgba(60,110,210,0.65)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
  if (cat === 'storm') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 14a7 7 0 1 1 12 0" fill="rgba(100,100,130,0.15)" stroke="rgba(80,80,110,0.4)" strokeWidth="1.3"/>
      <path d="M13 16 L10 20 L12 20 L9 24 L16 18 L14 18 L17 14Z" fill="rgba(220,150,0,0.85)"/>
    </svg>
  );
  if (cat === 'snow') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 14a8 8 0 1 1 16 0" fill="rgba(100,170,240,0.18)" stroke="rgba(70,130,220,0.4)" strokeWidth="1.3"/>
      <line x1="9" y1="18" x2="9" y2="23" stroke="rgba(70,130,220,0.65)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="15" y1="18" x2="15" y2="23" stroke="rgba(70,130,220,0.65)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
  if (cat === 'mist') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {[7, 12, 17].map((y, i) => (
        <line key={i} x1={3 + i} y1={y} x2={21 - i} y2={y}
          stroke={`rgba(120,130,145,${0.5 - i * 0.1})`} strokeWidth="2" strokeLinecap="round"/>
      ))}
    </svg>
  );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="17" cy="8" r="5" fill="rgba(245,166,35,0.5)"/>
      <path d="M4 16a6 6 0 0 1 6-6h3a6 6 0 1 1 0 12H10A6 6 0 0 1 4 16Z"
        fill="rgba(190,200,220,0.5)" stroke="rgba(160,175,200,0.55)" strokeWidth="1.2"/>
    </svg>
  );
}

// ── Stat row ─────────────────────────────────────────────────────────────────

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {icon}
      <span style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', letterSpacing: 0.1 }}>
        {label}
      </span>
    </div>
  );
}

function WindSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2M12.59 19.41A2 2 0 1 0 14 16H2M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2"/>
    </svg>
  );
}
function HumiditySvg() {
  return (
    <svg width="11" height="13" viewBox="0 0 24 24" fill="#9CA3AF" stroke="none">
      <path d="M12 2C12 2 4 11 4 16a8 8 0 0 0 16 0C20 11 12 2 12 2Z"/>
    </svg>
  );
}
function TempSvg() {
  return (
    <svg width="11" height="13" viewBox="0 0 24 24" fill="none"
      stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z"/>
    </svg>
  );
}

// ── Forecast row ─────────────────────────────────────────────────────────────

function ForecastRow({ forecast }: { forecast: ForecastDay[] }) {
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const todayIdx = new Date().getDay();

  return (
    <div style={{
      borderTop: '1px solid rgba(0,0,0,0.07)',
      padding: '10px 16px 12px',
      display: 'flex',
      background: 'rgba(0,0,0,0.025)',
    }}>
      {forecast.map((day, i) => {
        const date = new Date(day.date + 'T12:00:00');
        const isToday = i === 0 && date.getDay() === todayIdx;
        const name = isToday ? 'Heute' : dayNames[date.getDay()];
        const cat = getCategory(day.conditionId);

        return (
          <div key={day.date} style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            borderRight: i < forecast.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 0.4,
              color: isToday ? '#374151' : '#9CA3AF',
            }}>
              {name}
            </span>
            <SmallIcon cat={cat} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>
              {day.tempMax}°
            </span>
            <span style={{ fontSize: 11, color: '#C4C9D4' }}>
              {day.tempMin}°
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

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
    const id = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  if (error) return (
    <div className="h-full p-4 flex flex-col">
      <ErrorState message={error} onRetry={load} />
    </div>
  );

  if (!weather) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const cat = getCategory(weather.conditionId);
  const tint = getTint(cat);

  return (
    <div style={{
      height: '100%', borderRadius: 16, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Current weather */}
      <div style={{
        flex: '1 1 0', padding: '20px 20px 14px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
        background: tint,
      }}>
        {/* Subtle circle decoration */}
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 130, height: 130, borderRadius: '50%',
          background: 'rgba(255,255,255,0.35)',
          pointerEvents: 'none',
        }}/>

        {/* Top row: temp + icon */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontSize: 58, fontWeight: 700, color: '#1A1D23',
              lineHeight: 1, letterSpacing: -3,
            }}>
              {weather.temp}°
            </div>
            <div style={{
              fontSize: 14, fontWeight: 600, color: '#374151',
              marginTop: 5, letterSpacing: 0.1,
            }}>
              {weather.cityName}
            </div>
            <div style={{
              fontSize: 12, color: '#6B7280',
              marginTop: 2, textTransform: 'capitalize',
            }}>
              {weather.description}
            </div>
          </div>
          <div style={{ marginTop: -4, marginRight: -4 }}>
            <WeatherIcon cat={cat} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Stat icon={<WindSvg />}     label={`${weather.windSpeed} km/h`} />
          <Stat icon={<HumiditySvg />} label={`${weather.humidity}%`} />
          <Stat icon={<TempSvg />}     label={`Gefühlt ${weather.feelsLike}°`} />
        </div>
      </div>

      {/* Forecast */}
      {forecast.length > 0 && <ForecastRow forecast={forecast} />}
    </div>
  );
}

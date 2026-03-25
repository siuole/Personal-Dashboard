import { useState, useEffect } from 'react';

function getGreeting(hour: number): string {
  if (hour < 5)  return 'Gute Nacht';
  if (hour < 12) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}


function formatTime(date: Date): string {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function DayProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    function calc() {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      setPct(Math.min((mins / (24 * 60)) * 100, 100));
    }
    calc();
    const t = setInterval(calc, 60 * 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        flex: 1, height: 4, borderRadius: 99,
        background: 'rgba(0,0,0,0.08)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 99,
          background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)',
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 0 10px rgba(99,102,241,0.5)',
        }} />
      </div>
      <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, whiteSpace: 'nowrap' }}>
        {Math.round(pct)}% des Tages
      </span>
    </div>
  );
}

export default function GreetingWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          fontSize: 32, fontWeight: 700, color: '#111827',
          letterSpacing: -0.8, lineHeight: 1.15,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {getGreeting(now.getHours())}, Louis
        </h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 3, fontWeight: 400 }}>
          {formatDate(now)}
        </p>
        <DayProgress />
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: 52, fontWeight: 200, color: '#111827',
          letterSpacing: -3, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatTime(now)}
        </div>
      </div>
    </div>
  );
}

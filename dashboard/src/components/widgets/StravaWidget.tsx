import { useState, useEffect, useCallback } from 'react';
import { fetchWeekActivities } from '../../services/strava';
import type { WeekStats } from '../../services/strava';
import {
  isStravaAuthenticated, initiateStravaAuth,
  exchangeStravaCode, clearStravaTokens,
} from '../../services/strava-auth';
import { SkeletonBlock, SkeletonLine } from '../layout/Skeleton';
import ErrorState from '../layout/ErrorState';

const SPORT_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  Run:           { label: 'Lauf',      color: '#16A34A', bg: 'rgba(22,163,74,0.1)',   icon: '🏃' },
  Ride:          { label: 'Radfahren', color: '#2563EB', bg: 'rgba(37,99,235,0.1)',   icon: '🚴' },
  VirtualRide:   { label: 'Indoor',    color: '#7C3AED', bg: 'rgba(124,58,237,0.1)',  icon: '🚴' },
  Swim:          { label: 'Schwimmen', color: '#0891B2', bg: 'rgba(8,145,178,0.1)',   icon: '🏊' },
  Walk:          { label: 'Spazieren', color: '#65A30D', bg: 'rgba(101,163,13,0.1)',  icon: '🚶' },
  Hike:          { label: 'Wandern',   color: '#92400E', bg: 'rgba(146,64,14,0.1)',   icon: '🥾' },
  WeightTraining:{ label: 'Kraft',     color: '#DC2626', bg: 'rgba(220,38,38,0.1)',   icon: '🏋️' },
  Workout:       { label: 'Training',  color: '#EA580C', bg: 'rgba(234,88,12,0.1)',   icon: '💪' },
  Yoga:          { label: 'Yoga',      color: '#DB2777', bg: 'rgba(219,39,119,0.1)',  icon: '🧘' },
  Soccer:        { label: 'Fußball',   color: '#16A34A', bg: 'rgba(22,163,74,0.1)',   icon: '⚽' },
};
function getSportMeta(type: string) {
  return SPORT_META[type] ?? { label: type, color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: '⚡' };
}

function GoalRing({ progress, goal }: { progress: number; goal: number }) {
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(progress / goal, 1);
  const ringColor = '#FC4C02';
  return (
    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
      <svg width="48" height="48" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={ringColor} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${filled * circumference} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: progress >= goal ? '#F97316' : '#111827', lineHeight: 1 }}>{progress}</span>
        <span style={{ fontSize: 8, color: '#9CA3AF' }}>/{goal}</span>
      </div>
    </div>
  );
}

function LineChart({ weeklyUnits }: { weeklyUnits: { label: string; count: number }[] }) {
  // x positions at centers of equal quarters → aligns with the 4 KPI tiles above
  const W = 320, plotH = 60;
  const n = weeklyUnits.length;
  const max = Math.max(...weeklyUnits.map((w) => w.count), 1);

  // Center of each quarter: (2i+1)/(2n) * W
  const xs = weeklyUnits.map((_, i) => ((2 * i + 1) / (2 * n)) * W);
  const ys = weeklyUnits.map((w) => 8 + (1 - w.count / max) * (plotH - 16));

  const path = xs.reduce((acc, x, i) => {
    if (i === 0) return `M${x},${ys[i]}`;
    const cpX = (xs[i - 1] + x) / 2;
    return `${acc} C${cpX},${ys[i - 1]} ${cpX},${ys[i]} ${x},${ys[i]}`;
  }, '');

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${plotH}`} preserveAspectRatio="none"
        style={{ width: '100%', height: plotH, display: 'block' }}>
        {/* X-axis */}
        <line x1={0} y1={plotH - 1} x2={W} y2={plotH - 1} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
        {/* Ticks at data points */}
        {xs.map((x, i) => (
          <line key={i} x1={x} y1={plotH - 1} x2={x} y2={plotH + 3} stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        ))}
        {/* Line */}
        <path d={path} fill="none" stroke="#FC4C02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots + count */}
        {xs.map((x, i) => {
          const isLast = i === n - 1;
          return (
            <g key={i}>
              <circle cx={x} cy={ys[i]} r={isLast ? 3.5 : 2.5}
                fill={isLast ? '#FC4C02' : '#fff'} stroke="#FC4C02" strokeWidth="1.5" />
              {weeklyUnits[i].count > 0 && (
                <text x={x} y={ys[i] - 6} textAnchor="middle"
                  style={{ fontSize: '8px', fill: '#9CA3AF', fontFamily: 'inherit' }}>
                  {weeklyUnits[i].count}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Labels — 4 equal columns, aligned with KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 3 }}>
        {weeklyUnits.map((w, i) => {
          const isLast = i === n - 1;
          return (
            <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: isLast ? 600 : 400, color: isLast ? '#FC4C02' : '#9CA3AF' }}>
              {w.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StravaSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <SkeletonLine className="w-32 h-3" />
      <div style={{ display: 'flex', gap: 8 }}>
        {[0,1,2,3].map(i => <SkeletonBlock key={i} className="flex-1 h-16 rounded-xl" />)}
      </div>
      <SkeletonBlock className="flex-1 rounded-xl" />
    </div>
  );
}

function StravaLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FC4C02">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

export default function StravaWidget() {
  const [authed, setAuthed] = useState(isStravaAuthenticated());
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [weekOffset] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const scope = params.get('scope');
    if (code && scope?.includes('activity')) {
      setExchanging(true);
      window.history.replaceState({}, '', window.location.pathname);
      exchangeStravaCode(code)
        .then(() => { setAuthed(true); setExchanging(false); })
        .catch(() => { setError('Strava-Verbindung fehlgeschlagen'); setExchanging(false); });
    }
  }, []);

  const load = useCallback((offset: number) => {
    if (!isStravaAuthenticated()) return;
    setLoading(true);
    setError(null);
    fetchWeekActivities(offset)
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => { clearStravaTokens(); setAuthed(false); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!authed) return;
    load(weekOffset);
    if (weekOffset !== 0) return;
    const interval = setInterval(() => load(0), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authed, weekOffset, load]);

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
      <a href="https://www.strava.com/dashboard" target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
        <StravaLogo />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {stats?.weekLabel ?? 'Strava'}
        </span>
      </a>
    </div>
  );

  if (exchanging) return (
    <div style={wrap}>{header}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!authed) return (
    <div style={wrap}>{header}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>Verbinde dein Strava-Konto</p>
        <button onClick={initiateStravaAuth} style={connectBtnStyle}
          onMouseDown={e => { e.currentTarget.style.translate = '0 0.225em'; e.currentTarget.style.boxShadow = SHOP; }}
          onMouseUp={e => { e.currentTarget.style.translate = ''; e.currentTarget.style.boxShadow = SHO; }}
          onMouseLeave={e => { e.currentTarget.style.translate = ''; e.currentTarget.style.boxShadow = SHO; }}
        >
          <StravaLogo size={16} /> Mit Strava verbinden
        </button>
      </div>
    </div>
  );

  if (loading && !stats) return <StravaSkeleton />;
  if (error) return <div style={wrap}>{header}<ErrorState message={error} onRetry={() => load(weekOffset)} /></div>;
  if (!stats) return null;

  const totalHours = Math.floor(stats.totalMinutes / 60);
  const totalMins  = stats.totalMinutes % 60;
  const timeLabel  = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

  return (
    <div style={wrap}>
      {header}

      {/* KPI row — 4 equal tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 10 }}>

        {/* Ziel */}
        <div style={tile}>
          <span style={lbl}>Ziel</span>
          <GoalRing progress={stats.goalProgress} goal={stats.weekGoal} />
          <span style={sub}>{stats.goalProgress >= stats.weekGoal ? '✓ Done' : `noch ${stats.weekGoal - stats.goalProgress}`}</span>
        </div>

        {/* Streak */}
        <div style={tile}>
          <span style={lbl}>Streak</span>
          <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: stats.streak >= 4 ? '#EA580C' : '#111827' }}>
            {stats.streak}
          </span>
          <span style={sub}>{stats.streak >= 4 ? '🔥' : stats.streak >= 1 ? '⚡' : '💤'}&nbsp;Wo.</span>
        </div>

        {/* KM */}
        <div style={tile}>
          <span style={lbl}>KM</span>
          <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: '#111827' }}>{stats.totalKm}</span>
          <span style={sub}>km</span>
        </div>

        {/* Zeit */}
        <div style={tile}>
          <span style={lbl}>Zeit</span>
          <span style={{ fontSize: stats.totalMinutes >= 600 ? 16 : 22, fontWeight: 700, lineHeight: 1, color: '#111827' }}>{timeLabel}</span>
          <span style={sub}>aktiv</span>
        </div>
      </div>

      {/* Activity tags */}
      {stats.activities.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8, minHeight: 24 }}>
          {stats.activities.map((a, i) => {
            const meta = getSportMeta(a.type);
            return (
              <span key={i} style={{ fontSize: 11, fontWeight: 500, color: meta.color, background: meta.bg, borderRadius: 99, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                {meta.icon} {meta.label}{a.km > 0 ? ` · ${a.km}km` : ` · ${a.minutes}m`}
              </span>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end' }}>
        <LineChart weeklyUnits={stats.weeklyUnits} />
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' };

const tile: React.CSSProperties = {
  background: 'rgba(0,0,0,0.04)', borderRadius: 10,
  padding: '8px 6px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
  minWidth: 0, overflow: 'hidden',
};
const lbl: React.CSSProperties = { fontSize: 8.5, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.7, textTransform: 'uppercase' };
const sub: React.CSSProperties = { fontSize: 9.5, color: '#9CA3AF', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%', textAlign: 'center' };

const SHO = 'inset 0 0.0625em 0 0 rgba(255,255,255,0.25), 0 0.0625em 0 0 #d94002, 0 0.125em 0 0 #d03c00, 0 0.25em 0 0 #c43800, 0 0.3125em 0 0 #b83400, 0 0.375em 0 0 #ac3000, 0 0.425em 0 0 #9a2c00, 0 0.425em 0.5em 0 #9e2e00';
const SHOP = 'inset 0 0.03em 0 0 rgba(255,255,255,0.25), 0 0.03em 0 0 #d94002, 0 0.0625em 0 0 #d03c00, 0 0.125em 0 0 #c43800, 0 0.125em 0 0 #b83400, 0 0.2em 0 0 #ac3000, 0 0.225em 0 0 #9a2c00, 0 0.225em 0.375em 0 #9e2e00';

const connectBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: '#FC4C02', color: 'white', border: 'none',
  borderRadius: '0.5em', padding: '0.5em 1em', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  textShadow: '0 0.0625em 0 rgba(0,0,0,0.3)',
  boxShadow: SHO, transition: '0.15s ease',
};

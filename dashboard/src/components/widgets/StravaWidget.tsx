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
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(progress / goal, 1);
  const dash = filled * circumference;
  const ringColor = progress >= goal ? '#F97316' : '#6366F1';

  return (
    <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
      <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="5" />
        <circle
          cx="30" cy="30" r={r} fill="none"
          stroke={ringColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.6s ease', filter: `drop-shadow(0 0 4px ${ringColor}88)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: progress >= goal ? '#F97316' : '#111827', lineHeight: 1 }}>
          {progress}
        </span>
        <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 500 }}>/{goal}</span>
      </div>
    </div>
  );
}

function LineChart({ weeklyUnits }: { weeklyUnits: { label: string; count: number }[] }) {
  const W = 400, H = 80, padX = 20, padTop = 16, padBottom = 20;
  const chartH = H - padTop - padBottom;
  const max = Math.max(...weeklyUnits.map((w) => w.count), 1);
  const n = weeklyUnits.length;

  const pts = weeklyUnits.map((w, i) => ({
    x: padX + (i / (n - 1)) * (W - padX * 2),
    y: padTop + (1 - w.count / max) * chartH,
    count: w.count,
    label: w.label,
  }));

  const path = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`;
    const prev = pts[i - 1];
    const cpX = (prev.x + pt.x) / 2;
    return `${acc} C${cpX},${prev.y} ${cpX},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const areaPath = `${path} L${pts[n - 1].x},${H - padBottom} L${pts[0].x},${H - padBottom} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="strava-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FC4C02" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FC4C02" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#strava-area)" />
      <path d={path} fill="none" stroke="#FC4C02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {pts.map((pt, i) => {
        const isLast = i === n - 1;
        return (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={isLast ? 3.5 : 2.5}
              fill={isLast ? '#FC4C02' : 'white'}
              stroke="#FC4C02" strokeWidth="1.5" />
            {pt.count > 0 && (
              <text x={pt.x} y={pt.y - 6} textAnchor="middle" fontSize="9" fontWeight="500" fill="#6B7280" fontFamily="inherit">
                {pt.count}
              </text>
            )}
            <text x={pt.x} y={H - 4} textAnchor="middle" fontSize="9" fontWeight={isLast ? '600' : '400'} fill={isLast ? '#FC4C02' : '#9CA3AF'} fontFamily="inherit">
              {pt.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StravaSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <SkeletonLine className="w-32 h-3" />
      <div style={{ display: 'flex', gap: 10 }}>
        <SkeletonBlock className="w-14 h-14 rounded-full" />
        <SkeletonBlock className="flex-1 h-14 rounded-2xl" />
        <SkeletonBlock className="flex-1 h-14 rounded-2xl" />
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <a href="https://www.strava.com/dashboard" target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }} className="group">
        <StravaLogo />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase' }}
          className="group-hover:text-gray-600 transition-colors">
          {stats?.weekLabel ?? 'Strava'}
        </span>
      </a>
    </div>
  );

  if (exchanging) return (
    <div style={wrapperStyle}>{header}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!authed) return (
    <div style={wrapperStyle}>{header}
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

  if (error) return (
    <div style={wrapperStyle}>{header}
      <ErrorState message={error} onRetry={() => load(weekOffset)} />
    </div>
  );

  if (!stats) return null;

  const totalHours = Math.floor(stats.totalMinutes / 60);
  const totalMins  = stats.totalMinutes % 60;
  const timeLabel  = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

  return (
    <div style={wrapperStyle}>
      {header}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <GoalRing progress={stats.goalProgress} goal={stats.weekGoal} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase' }}>Wochenziel</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 2 }}>
              {stats.goalProgress >= stats.weekGoal ? '🎉 Erreicht!' : `noch ${stats.weekGoal - stats.goalProgress}`}
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{stats.activityCount} Einheit{stats.activityCount !== 1 ? 'en' : ''}</div>
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <span style={{ fontSize: 26 }}>{stats.streak >= 4 ? '🔥' : stats.streak >= 1 ? '⚡' : '💤'}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase' }}>Streak</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: stats.streak >= 4 ? '#EA580C' : '#111827', lineHeight: 1.1 }}>
              {stats.streak} <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>Wo.</span>
            </div>
          </div>
        </div>
        <KpiTile label="km" value={`${stats.totalKm}`} />
        <KpiTile label="Zeit" value={timeLabel} />
      </div>
      {stats.activities.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {stats.activities.map((a, i) => {
            const meta = getSportMeta(a.type);
            return (
              <span key={i} style={{ fontSize: 11, fontWeight: 500, color: meta.color, background: meta.bg, borderRadius: 99, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{meta.icon}</span>
                <span>{meta.label}{a.km > 0 ? ` · ${a.km} km` : ` · ${a.minutes}m`}</span>
              </span>
            );
          })}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <LineChart weeklyUnits={stats.weeklyUnits} />
      </div>
    </div>
  );
}

const wrapperStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 };

function KpiTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: accent ? 'rgba(252,76,2,0.08)' : 'rgba(0,0,0,0.04)', borderRadius: 12, padding: '12px 14px', flex: 1 }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: accent ? '#F97316' : '#9CA3AF', letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent ? '#EA580C' : '#111827', lineHeight: 1.3, letterSpacing: -0.3 }}>{value}</div>
    </div>
  );
}

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

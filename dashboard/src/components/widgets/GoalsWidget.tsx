import { useState, useEffect, useRef } from 'react';

type Period = 'month' | 'week';

interface Goal {
  id: string;
  text: string;
  done: boolean;
}

function loadGoals(period: Period): Goal[] {
  try {
    const raw = localStorage.getItem(`goals_${period}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGoals(period: Period, goals: Goal[]) {
  localStorage.setItem(`goals_${period}`, JSON.stringify(goals));
}

function timeElapsed(period: Period): number {
  const now = new Date();
  if (period === 'month') {
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return day / daysInMonth;
  } else {
    const dow = (now.getDay() + 6) % 7;
    const minutesIntoDay = now.getHours() * 60 + now.getMinutes();
    return Math.min((dow + minutesIntoDay / (24 * 60)) / 7, 1);
  }
}

function progressSubtitle(period: Period): string {
  const now = new Date();
  if (period === 'month') {
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${day} von ${daysInMonth} Tagen`;
  } else {
    const dow = (now.getDay() + 6) % 7;
    const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return `${names[dow]} · Tag ${dow + 1} von 7`;
  }
}

function ProgressRing({ fraction, size = 62 }: { fraction: number; size?: number }) {
  const strokeWidth = 6;
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = fraction * circumference;
  const cx = size / 2;
  const pct = Math.round(fraction * 100);
  const ringColor = pct > 80 ? '#A855F7' : pct > 50 ? '#8B5CF6' : '#6366F1';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={ringColor} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease', filter: `drop-shadow(0 0 4px ${ringColor}88)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#374151' }}>
        {pct}%
      </div>
    </div>
  );
}

export default function GoalsWidget({ period }: { period: Period }) {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals(period));
  const [inputVal, setInputVal] = useState('');
  const [elapsed, setElapsed] = useState(() => timeElapsed(period));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed(timeElapsed(period)), 60_000);
    return () => clearInterval(t);
  }, [period]);

  function update(next: Goal[]) { setGoals(next); saveGoals(period, next); }
  function toggleGoal(id: string) { update(goals.map((g) => g.id === id ? { ...g, done: !g.done } : g)); }
  function addGoal() {
    const text = inputVal.trim();
    if (!text) return;
    update([...goals, { id: Date.now().toString(), text, done: false }]);
    setInputVal('');
    inputRef.current?.focus();
  }
  function deleteGoal(id: string) { update(goals.filter((g) => g.id !== id)); }

  const label = period === 'month' ? 'Monatsziele' : 'Wochenziele';
  const doneCount = goals.filter((g) => g.done).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</span>
        {goals.length > 0 && <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>{doneCount}/{goals.length}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, padding: '10px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: 14, border: '1px solid rgba(99,102,241,0.1)' }}>
        <ProgressRing fraction={elapsed} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{period === 'month' ? 'Monatsverlauf' : 'Wochenverlauf'}</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{progressSubtitle(period)}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {goals.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>Noch keine Ziele</div>
        )}
        {goals.map((goal, idx) => (
          <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: idx < goals.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
            <button onClick={() => toggleGoal(goal.id)} style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: 0, fontSize: '14px',
              background: goal.done ? '#6366F1' : '#f0f0f0', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textShadow: '0 0.0625em 0 #fff',
              boxShadow: goal.done
                ? 'inset 0 0.0625em 0 0 rgba(255,255,255,0.3), 0 0.0625em 0 0 #4f52d4, 0 0.125em 0 0 #4a4dcc, 0 0.25em 0 0 #4446c0, 0 0.3125em 0 0 #4042b8, 0 0.375em 0 0 #3b3db0, 0 0.425em 0 0 #3234a0, 0 0.425em 0.5em 0 #3436a8'
                : 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece',
              transition: '0.15s ease', outline: 'none',
            }}
              onMouseEnter={e => { if (!goal.done) { e.currentTarget.style.background = '#6366F1'; e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 rgba(255,255,255,0.3), 0 0.0625em 0 0 #4f52d4, 0 0.125em 0 0 #4a4dcc, 0 0.25em 0 0 #4446c0, 0 0.3125em 0 0 #4042b8, 0 0.375em 0 0 #3b3db0, 0 0.425em 0 0 #3234a0, 0 0.425em 0.5em 0 #3436a8'; const svg = e.currentTarget.querySelector('svg') as SVGElement | null; if (svg) svg.style.opacity = '1'; } }}
              onMouseLeave={e => { e.currentTarget.style.translate = ''; if (!goal.done) { e.currentTarget.style.background = '#f0f0f0'; e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece'; const svg = e.currentTarget.querySelector('svg') as SVGElement | null; if (svg) svg.style.opacity = '0'; } }}
              onMouseDown={e => { e.currentTarget.style.translate = '0 0.225em'; }}
              onMouseUp={e => { e.currentTarget.style.translate = ''; }}
              aria-label="Ziel abhaken"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: goal.done ? 1 : 0, transition: 'opacity 0.1s ease', pointerEvents: 'none' }}>
                <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span style={{ flex: 1, fontSize: 13, color: goal.done ? '#9CA3AF' : '#374151', fontWeight: 500, textDecoration: goal.done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.2s ease' }}>
              {goal.text}
            </span>
            <button onClick={() => deleteGoal(goal.id)} style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.18)', fontSize: 15, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.18)'; }}
              aria-label="Ziel löschen">×</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <input ref={inputRef} value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addGoal(); }}
          placeholder="Neues Ziel..."
          style={{ flex: 1, fontSize: 12, color: '#374151', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '6px 10px', outline: 'none', fontFamily: 'inherit', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        <button onClick={addGoal} disabled={!inputVal.trim()} style={{ padding: '0.375em 0.8em', fontSize: '14px', fontWeight: 600, color: inputVal.trim() ? '#242424' : 'rgba(0,0,0,0.2)', background: inputVal.trim() ? '#f0f0f0' : 'rgba(0,0,0,0.04)', border: 0, borderRadius: '0.5em', cursor: inputVal.trim() ? 'pointer' : 'default', fontFamily: 'inherit', textShadow: inputVal.trim() ? '0 0.0625em 0 #fff' : 'none', boxShadow: inputVal.trim() ? 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece' : 'none', transition: '0.15s ease' }}
          onMouseDown={e => { if (!inputVal.trim()) return; e.currentTarget.style.translate = '0 0.225em'; }}
          onMouseUp={e => { e.currentTarget.style.translate = ''; }}
          onMouseLeave={e => { e.currentTarget.style.translate = ''; }}>+</button>
      </div>
    </div>
  );
}

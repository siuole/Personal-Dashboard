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
  } catch {
    return [];
  }
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

// Apple Watch-style ring
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
        {/* Track */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{
            transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease',
            filter: `drop-shadow(0 0 4px ${ringColor}88)`,
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: '#374151',
      }}>
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

  function update(next: Goal[]) {
    setGoals(next);
    saveGoals(period, next);
  }

  function toggleGoal(id: string) {
    update(goals.map((g) => g.id === id ? { ...g, done: !g.done } : g));
  }

  function addGoal() {
    const text = inputVal.trim();
    if (!text) return;
    update([...goals, { id: Date.now().toString(), text, done: false }]);
    setInputVal('');
    inputRef.current?.focus();
  }

  function deleteGoal(id: string) {
    update(goals.filter((g) => g.id !== id));
  }

  const label = period === 'month' ? 'Monatsziele' : 'Wochenziele';
  const doneCount = goals.filter((g) => g.done).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {label}
        </span>
        {goals.length > 0 && (
          <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
            {doneCount}/{goals.length}
          </span>
        )}
      </div>

      {/* Ring + time info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 14, padding: '10px 12px',
        background: 'rgba(99,102,241,0.06)',
        borderRadius: 14,
        border: '1px solid rgba(99,102,241,0.1)',
      }}>
        <ProgressRing fraction={elapsed} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {period === 'month' ? 'Monatsverlauf' : 'Wochenverlauf'}
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            {progressSubtitle(period)}
          </div>
        </div>
      </div>

      {/* Goal list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {goals.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>
            Noch keine Ziele
          </div>
        )}
        {goals.map((goal, idx) => (
          <div
            key={goal.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 4px',
              borderBottom: idx < goals.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <button
              onClick={() => toggleGoal(goal.id)}
              style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${goal.done ? '#6366F1' : 'rgba(99,102,241,0.3)'}`,
                background: goal.done ? '#6366F1' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease', outline: 'none',
                boxShadow: goal.done ? '0 0 8px rgba(99,102,241,0.35)' : 'none',
              }}
              aria-label="Ziel abhaken"
            >
              {goal.done && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span style={{
              flex: 1, fontSize: 13,
              color: goal.done ? '#9CA3AF' : '#374151',
              fontWeight: 500,
              textDecoration: goal.done ? 'line-through' : 'none',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              transition: 'color 0.2s ease',
            }}>
              {goal.text}
            </span>
            <button
              onClick={() => deleteGoal(goal.id)}
              style={{
                width: 18, height: 18, borderRadius: 4, border: 'none',
                background: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.18)',
                fontSize: 15, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.18)'; }}
              aria-label="Ziel löschen"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add goal input */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addGoal(); }}
          placeholder="Neues Ziel..."
          style={{
            flex: 1, fontSize: 12, color: '#374151',
            border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
            padding: '6px 10px', outline: 'none',
            fontFamily: 'inherit',
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(8px)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={addGoal}
          disabled={!inputVal.trim()}
          style={{
            padding: '6px 14px', fontSize: 14, fontWeight: 600,
            color: inputVal.trim() ? 'white' : 'rgba(0,0,0,0.2)',
            background: inputVal.trim() ? '#6366F1' : 'rgba(0,0,0,0.06)',
            border: 'none', borderRadius: 10,
            cursor: inputVal.trim() ? 'pointer' : 'default',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            boxShadow: inputVal.trim() ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTasks, completeTask } from '../../services/google-tasks';
import type { Task } from '../../services/google-tasks';
import { SkeletonLine } from '../layout/Skeleton';
import ErrorState from '../layout/ErrorState';
import WidgetLink from '../layout/WidgetLink';

function formatDue(iso?: string): string | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Überfällig';
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Morgen';
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function dueBadge(iso?: string): { label: string; color: string; bg: string } | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: 'Überfällig', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' };
  if (diff === 0) return { label: 'Heute',     color: '#EA580C', bg: 'rgba(234,88,12,0.1)' };
  if (diff === 1) return { label: 'Morgen',    color: '#D97706', bg: 'rgba(217,119,6,0.1)' };
  return { label: formatDue(iso)!, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
}

interface TimerState {
  preset: number;    // minutes
  remaining: number; // seconds
  active: boolean;
  done: boolean;
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TasksSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SkeletonLine className="w-20 h-3 mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.07)', flexShrink: 0 }} />
          <SkeletonLine className={`h-3 ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
        </div>
      ))}
    </div>
  );
}

function MiniTimer({ taskId, timers, setTimers }: {
  taskId: string;
  timers: Map<string, TimerState>;
  setTimers: React.Dispatch<React.SetStateAction<Map<string, TimerState>>>;
}) {
  const t = timers.get(taskId) ?? { preset: 25, remaining: 25 * 60, active: false, done: false };
  const progress = t.remaining / (t.preset * 60);
  const [inputVal, setInputVal] = useState(String(t.preset));

  function update(patch: Partial<TimerState>) {
    setTimers(prev => {
      const next = new Map(prev);
      next.set(taskId, { ...t, ...patch });
      return next;
    });
  }

  function setPreset(mins: number) {
    const clamped = Math.max(1, Math.min(999, mins));
    setInputVal(String(clamped));
    update({ preset: clamped, remaining: clamped * 60, active: false, done: false });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputVal(e.target.value);
    const v = parseInt(e.target.value);
    if (!isNaN(v) && v > 0) {
      update({ preset: v, remaining: v * 60, active: false, done: false });
    }
  }

  function togglePlay() {
    if (t.done) {
      update({ remaining: t.preset * 60, active: true, done: false });
    } else {
      update({ active: !t.active });
    }
  }

  const barColor = t.done ? '#6366F1' : t.remaining < 60 ? '#EF4444' : '#6366F1';

  return (
    <div style={{ paddingTop: 6, paddingBottom: 2 }}>
      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(0,0,0,0.07)', borderRadius: 99, marginBottom: 6, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${t.done ? 100 : (1 - progress) * 100}%`,
          background: barColor,
          borderRadius: 99,
          transition: 'width 1s linear, background 0.3s',
        }} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {/* - */}
        <button
          onClick={() => setPreset(t.preset - 5)}
          disabled={t.active}
          style={btnStyle(t.active)}
        >−</button>

        {/* Time display / input */}
        {t.active || t.done ? (
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            color: t.done ? '#6366F1' : t.remaining < 60 ? '#EF4444' : '#374151',
            minWidth: 36, textAlign: 'center',
            animation: t.done ? 'pulse 0.6s ease 3' : 'none',
          }}>
            {t.done ? '✓' : fmt(t.remaining)}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <input
              type="number"
              value={inputVal}
              onChange={handleInputChange}
              onBlur={() => setInputVal(String(t.preset))}
              min={1} max={999}
              style={{
                width: 32, textAlign: 'center', fontSize: 11, fontWeight: 600,
                border: '1px solid rgba(0,0,0,0.12)', borderRadius: 5,
                padding: '2px 3px', background: 'rgba(255,255,255,0.7)',
                color: '#374151', outline: 'none', fontFamily: 'inherit',
                MozAppearance: 'textfield',
              }}
            />
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>min</span>
          </div>
        )}

        {/* + */}
        <button
          onClick={() => setPreset(t.preset + 5)}
          disabled={t.active}
          style={btnStyle(t.active)}
        >+</button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          style={{
            marginLeft: 2,
            width: 22, height: 22, borderRadius: 6,
            border: 'none', cursor: 'pointer',
            background: t.active ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.9)',
            color: t.active ? '#6366F1' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700,
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
          title={t.active ? 'Pausieren' : 'Starten'}
        >
          {t.active ? (
            <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor">
              <rect x="0" y="0" width="3" height="9" rx="1"/>
              <rect x="5" y="0" width="3" height="9" rx="1"/>
            </svg>
          ) : (
            <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor">
              <path d="M1 0.5L7.5 4.5L1 8.5V0.5Z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 20, height: 20, borderRadius: 5, border: '1px solid rgba(0,0,0,0.1)',
    background: disabled ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.8)',
    color: disabled ? '#9CA3AF' : '#374151',
    fontSize: 13, lineHeight: 1, cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontWeight: 500, padding: 0,
  };
}

export default function TasksWidget({ authenticated }: { authenticated: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [timers, setTimers] = useState<Map<string, TimerState>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Global tick for all active timers
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(prev => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, t] of next) {
          if (t.active && t.remaining > 0) {
            next.set(id, { ...t, remaining: t.remaining - 1 });
            changed = true;
          } else if (t.active && t.remaining === 0) {
            next.set(id, { ...t, active: false, done: true });
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const load = useCallback(() => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    fetchTasks()
      .then((data) => { setTasks(data); setLoading(false); })
      .catch(() => { setError('Tasks nicht verfügbar'); setLoading(false); });
  }, [authenticated]);

  useEffect(() => { load(); }, [load]);

  async function handleComplete(taskId: string) {
    const removed = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setCompleting((prev) => new Set(prev).add(taskId));
    try {
      await completeTask(taskId);
    } catch {
      if (removed) setTasks((prev) => [...prev, removed]);
    } finally {
      setCompleting((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
    }
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!authenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <WidgetLink label="Aufgaben" href="https://tasks.google.com" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>
          Anmeldung erforderlich
        </div>
      </div>
    );
  }

  if (loading && tasks.length === 0) return <TasksSkeleton />;

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <WidgetLink label="Aufgaben" href="https://tasks.google.com" />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  const sortedTasks = (() => {
    const topLevel = tasks.filter((t) => !t.parent);
    const subtaskMap = tasks.reduce<Record<string, Task[]>>((acc, t) => {
      if (t.parent) { acc[t.parent] = [...(acc[t.parent] ?? []), t]; }
      return acc;
    }, {});
    return topLevel.flatMap((t) => [t, ...(subtaskMap[t.id] ?? [])]);
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <style>{`
        @keyframes task-done-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
          50% { box-shadow: 0 0 0 6px rgba(99,102,241,0.15); }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
      <WidgetLink label="Aufgaben" href="https://tasks.google.com" />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: 4 }}>
        {sortedTasks.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ fontSize: 22, color: '#6366F1' }}>✓</div>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Alles erledigt!</p>
          </div>
        )}
        {sortedTasks.map((task, idx) => {
          const badge = dueBadge(task.due);
          const isCompleting = completing.has(task.id);
          const isSubtask = !!task.parent;
          const isExpanded = expanded.has(task.id);
          const timer = timers.get(task.id);
          const isDone = timer?.done ?? false;

          return (
            <div
              key={task.id}
              style={{
                borderBottom: idx < sortedTasks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                opacity: isCompleting ? 0.3 : 1,
                transition: 'opacity 0.2s ease',
                borderLeft: isSubtask ? '2px solid rgba(99,102,241,0.08)' : '2px solid rgba(99,102,241,0.2)',
                borderRadius: '0 8px 8px 0',
                marginBottom: idx < sortedTasks.length - 1 ? 2 : 0,
                background: isDone ? 'rgba(99,102,241,0.04)' : isSubtask ? 'rgba(0,0,0,0.015)' : 'transparent',
                padding: isSubtask ? '6px 8px 6px 28px' : '8px 8px 8px 10px',
                animation: isDone ? 'task-done-pulse 0.5s ease 2' : 'none',
              }}
            >
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={isCompleting}
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: 0, background: '#f0f0f0',
                    flexShrink: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textShadow: '0 0.0625em 0 #fff',
                    boxShadow: 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece',
                    transition: '0.15s ease', outline: 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#6366F1';
                    e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 rgba(255,255,255,0.3), 0 0.0625em 0 0 #4f52d4, 0 0.125em 0 0 #4a4dcc, 0 0.25em 0 0 #4446c0, 0 0.3125em 0 0 #4042b8, 0 0.375em 0 0 #3b3db0, 0 0.425em 0 0 #3234a0, 0 0.425em 0.5em 0 #3436a8';
                    const svg = e.currentTarget.querySelector('svg') as SVGElement | null;
                    if (svg) svg.style.opacity = '1';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#f0f0f0';
                    e.currentTarget.style.translate = '';
                    e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece';
                    const svg = e.currentTarget.querySelector('svg') as SVGElement | null;
                    if (svg) svg.style.opacity = '0';
                  }}
                  onMouseDown={e => {
                    e.currentTarget.style.translate = '0 0.225em';
                    e.currentTarget.style.boxShadow = 'inset 0 0.03em 0 0 rgba(255,255,255,0.3), 0 0.03em 0 0 #4f52d4, 0 0.0625em 0 0 #4a4dcc, 0 0.125em 0 0 #4446c0, 0 0.125em 0 0 #4042b8, 0 0.2em 0 0 #3b3db0, 0 0.225em 0 0 #3234a0, 0 0.225em 0.375em 0 #3436a8';
                  }}
                  onMouseUp={e => { e.currentTarget.style.translate = ''; }}
                  aria-label="Als erledigt markieren"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
                    style={{ opacity: 0, transition: 'opacity 0.1s ease', pointerEvents: 'none' }}>
                    <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: isSubtask ? 12 : 13, color: isSubtask ? '#6B7280' : '#374151', fontWeight: isSubtask ? 400 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.title}
                  </p>
                </div>

                {badge && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: badge.color, background: badge.bg, borderRadius: 99, padding: '2px 7px', flexShrink: 0 }}>
                    {badge.label}
                  </span>
                )}

                {/* Timer toggle button */}
                <button
                  onClick={() => toggleExpanded(task.id)}
                  title="Timer"
                  style={{
                    width: 20, height: 20, borderRadius: 5, border: 'none',
                    background: isExpanded ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: isExpanded ? '#6366F1' : '#9CA3AF',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'background 0.15s, color 0.15s',
                    padding: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/><path d="M12 2v3"/>
                  </svg>
                </button>
              </div>

              {/* Timer panel */}
              {isExpanded && (
                <MiniTimer taskId={task.id} timers={timers} setTimers={setTimers} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

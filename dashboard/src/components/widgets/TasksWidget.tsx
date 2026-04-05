import { useState, useEffect, useCallback } from 'react';
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
  if (diff < 0) return { label: 'Überfällig', color: '#F87171', bg: 'rgba(239,68,68,0.15)' };
  if (diff === 0) return { label: 'Heute',     color: '#FB923C', bg: 'rgba(234,88,12,0.15)' };
  if (diff === 1) return { label: 'Morgen',    color: '#FCD34D', bg: 'rgba(217,119,6,0.15)' };
  return { label: formatDue(iso)!, color: '#6B7280', bg: 'rgba(107,114,128,0.15)' };
}

function TasksSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SkeletonLine className="w-20 h-3 mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
          <SkeletonLine className={`h-3 ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
        </div>
      ))}
    </div>
  );
}

export default function TasksWidget({ authenticated }: { authenticated: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Set<string>>(new Set());

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

  if (!authenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <WidgetLink label="Aufgaben" href="https://tasks.google.com" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: 13 }}>
          Anmeldung erforderlich
        </div>
      </div>
    );
  }

  if (loading && tasks.length === 0) return <TasksSkeleton />;

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <WidgetLink label="Aufgaben" href="https://tasks.google.com" />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <WidgetLink label="Aufgaben" href="https://tasks.google.com" />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        {tasks.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ fontSize: 22, color: '#818CF8' }}>✓</div>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Alles erledigt!</p>
          </div>
        )}
        {tasks.map((task, idx) => {
          const badge = dueBadge(task.due);
          const isCompleting = completing.has(task.id);
          return (
            <div
              key={task.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 8px 9px 10px',
                borderBottom: idx < tasks.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                opacity: isCompleting ? 0.3 : 1,
                transition: 'opacity 0.2s ease',
                borderLeft: '2px solid rgba(99,102,241,0.35)',
                borderRadius: '0 8px 8px 0',
                marginBottom: idx < tasks.length - 1 ? 2 : 0,
              }}
            >
              <button
                onClick={() => handleComplete(task.id)}
                disabled={isCompleting}
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.07)',
                  flexShrink: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px',
                  transition: '0.15s ease',
                  outline: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#6366F1';
                  e.currentTarget.style.borderColor = '#6366F1';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(99,102,241,0.5)';
                  const svg = e.currentTarget.querySelector('svg') as SVGElement | null;
                  if (svg) svg.style.opacity = '1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                  const svg = e.currentTarget.querySelector('svg') as SVGElement | null;
                  if (svg) svg.style.opacity = '0';
                }}
                aria-label="Als erledigt markieren"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
                  style={{ opacity: 0, transition: 'opacity 0.1s ease', pointerEvents: 'none' }}>
                  <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.title}
                </p>
              </div>
              {badge && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: badge.color, background: badge.bg,
                  borderRadius: 99, padding: '2px 7px', flexShrink: 0,
                }}>
                  {badge.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

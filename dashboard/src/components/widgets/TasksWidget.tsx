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
  if (diff < 0) return { label: 'Überfällig', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' };
  if (diff === 0) return { label: 'Heute',     color: '#EA580C', bg: 'rgba(234,88,12,0.1)' };
  if (diff === 1) return { label: 'Morgen',    color: '#D97706', bg: 'rgba(217,119,6,0.1)' };
  return { label: formatDue(iso)!, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
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
    // Optimistic: remove immediately for instant feedback
    const removed = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setCompleting((prev) => new Set(prev).add(taskId));
    try {
      await completeTask(taskId);
    } catch {
      // Restore task if API call failed
      if (removed) setTasks((prev) => [...prev, removed]);
    } finally {
      setCompleting((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
    }
  }

  if (!authenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            <div style={{ fontSize: 22, color: '#6366F1' }}>✓</div>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Alles erledigt!</p>
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
                borderBottom: idx < tasks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                opacity: isCompleting ? 0.3 : 1,
                transition: 'opacity 0.2s ease',
                borderLeft: '2px solid rgba(99,102,241,0.2)',
                borderRadius: '0 8px 8px 0',
                marginBottom: idx < tasks.length - 1 ? 2 : 0,
              }}
            >
              <button
                onClick={() => handleComplete(task.id)}
                disabled={isCompleting}
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: 0,
                  background: '#f0f0f0',
                  flexShrink: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px',
                  textShadow: '0 0.0625em 0 #fff',
                  boxShadow: 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece',
                  transition: '0.15s ease',
                  outline: 'none',
                }}
                onMouseDown={e => {
                  e.currentTarget.style.translate = '0 0.225em';
                  e.currentTarget.style.boxShadow = 'inset 0 0.03em 0 0 #f4f4f4, 0 0.03em 0 0 #efefef, 0 0.0625em 0 0 #ececec, 0 0.125em 0 0 #e0e0e0, 0 0.125em 0 0 #dedede, 0 0.2em 0 0 #dcdcdc, 0 0.225em 0 0 #cacaca, 0 0.225em 0.375em 0 #cecece';
                }}
                onMouseUp={e => {
                  e.currentTarget.style.translate = '';
                  e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.translate = '';
                  e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece';
                }}
                aria-label="Als erledigt markieren"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

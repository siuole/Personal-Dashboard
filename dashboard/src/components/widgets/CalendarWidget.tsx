import { useState, useEffect, useCallback } from 'react';
import { fetchWeekEvents } from '../../services/google-calendar';
import type { CalendarEvent } from '../../services/google-calendar';
import { SkeletonBlock } from '../layout/Skeleton';
import ErrorState from '../layout/ErrorState';
import WidgetLink from '../layout/WidgetLink';

const DAY_START = 7;
const DAY_END = 22;
const TOTAL_HOURS = DAY_END - DAY_START;

// Event colors for light glass cards
const EVENT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  '1':  { bg: 'rgba(59,130,246,0.14)',  border: '#3B82F6', text: '#1e40af' },
  '2':  { bg: 'rgba(34,197,94,0.14)',   border: '#22C55E', text: '#166534' },
  '3':  { bg: 'rgba(139,92,246,0.14)',  border: '#8B5CF6', text: '#5b21b6' },
  '4':  { bg: 'rgba(239,68,68,0.14)',   border: '#EF4444', text: '#991b1b' },
  '5':  { bg: 'rgba(234,179,8,0.14)',   border: '#CA8A04', text: '#78350f' },
  '6':  { bg: 'rgba(249,115,22,0.14)',  border: '#F97316', text: '#9a3412' },
  '7':  { bg: 'rgba(20,184,166,0.14)',  border: '#14B8A6', text: '#134e4a' },
  '9':  { bg: 'rgba(99,102,241,0.14)',  border: '#6366F1', text: '#3730a3' },
  '10': { bg: 'rgba(34,197,94,0.14)',   border: '#22C55E', text: '#166534' },
  '11': { bg: 'rgba(239,68,68,0.14)',   border: '#EF4444', text: '#991b1b' },
};
const DEFAULT_EVENT_STYLE = { bg: 'rgba(99,102,241,0.14)', border: '#6366F1', text: '#3730a3' };

function getEventStyle(colorId?: string) {
  return EVENT_STYLES[colorId ?? ''] ?? DEFAULT_EVENT_STYLE;
}

function isPastDay(day: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return day < today;
}

function getWeekDays(): Date[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function timeToPercent(iso: string): number {
  const d = new Date(iso);
  const hours = d.getHours() + d.getMinutes() / 60;
  return ((Math.min(Math.max(hours, DAY_START), DAY_END) - DAY_START) / TOTAL_HOURS) * 100;
}

function eventHeightPercent(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const durationHours = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
  return Math.max((durationHours / TOTAL_HOURS) * 100, 2);
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function CalendarSkeleton() {
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex gap-1 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <SkeletonBlock className="w-5 h-2 rounded" />
            <SkeletonBlock className="w-7 h-7 rounded-full" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="flex-1 w-full rounded-2xl" />
    </div>
  );
}

function NowLine() {
  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60;
      setVisible(hours >= DAY_START && hours <= DAY_END);
      setPct(((hours - DAY_START) / TOTAL_HOURS) * 100);
    }
    update();
    const t = setInterval(update, 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (!visible) return null;
  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
      style={{ top: `${pct}%` }}
    >
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', marginLeft: -3, flexShrink: 0 }} />
      <div style={{ flex: 1, height: 1, background: 'rgba(239,68,68,0.55)' }} />
    </div>
  );
}

export default function CalendarWidget({ authenticated }: { authenticated: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const days = getWeekDays();
  const today = new Date();

  const load = useCallback(() => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    fetchWeekEvents()
      .then((data) => { setEvents(data); setLoading(false); })
      .catch(() => { setError('Kalender nicht verfügbar'); setLoading(false); });
  }, [authenticated]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const allDayEvents = events.filter((e) => e.isAllDay);
  const timedEvents = events.filter((e) => !e.isAllDay);

  if (!authenticated) {
    return (
      <div className="flex flex-col h-full">
        <WidgetLink label="Kalender" href="https://calendar.google.com" />
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#6B7280' }}>
          Anmeldung erforderlich
        </div>
      </div>
    );
  }

  if (loading && events.length === 0) return <CalendarSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <WidgetLink label="Kalender" href="https://calendar.google.com" />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <WidgetLink label="Kalender" href="https://calendar.google.com" />

      {/* Day headers */}
      <div className="flex pl-10 mb-1 flex-shrink-0">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const isPast = isPastDay(day);
          return (
            <div key={day.toISOString()} className="flex-1 flex flex-col items-center" style={{ borderLeft: '1px solid transparent' }}>
              <span style={{ fontSize: 10, color: isPast ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase' }}>
                {day.toLocaleDateString('de-DE', { weekday: 'short' })}
              </span>
              <span
                className="text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mt-0.5"
                style={isToday
                  ? { background: '#6366F1', color: 'white' }
                  : isPast
                    ? { color: '#9CA3AF' }
                    : { color: '#374151' }
                }
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <div
          className="flex pl-10 mb-1 flex-shrink-0 pb-1"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
        >
          {days.map((day) => {
            const isPast = isPastDay(day);
            const dayAllDay = allDayEvents.filter((e) => isSameDay(new Date(e.start), day));
            return (
              <div key={day.toISOString()} className="flex-1 px-0.5 flex flex-col gap-0.5" style={{ borderLeft: '1px solid transparent' }}>
                {dayAllDay.map((e) => {
                  const s = getEventStyle(e.colorId);
                  return (
                    <div
                      key={e.id}
                      className="truncate text-[10px] font-medium px-1 py-0.5"
                      style={{ borderRadius: 6, background: s.bg, color: s.text, opacity: isPast ? 0.55 : 1 }}
                      title={e.summary}
                    >
                      {e.summary}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="flex h-full">

          {/* Time labels */}
          <div className="w-10 flex-shrink-0 relative select-none">
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-1 -translate-y-1/2"
                style={{ top: `${(i / TOTAL_HOURS) * 100}%`, fontSize: 9, color: '#4B5563', lineHeight: 1 }}
              >
                {String(DAY_START + i).padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            const isPast = isPastDay(day);
            const dayEvents = timedEvents.filter((e) => isSameDay(new Date(e.start), day));

            return (
              <div
                key={day.toISOString()}
                className="flex-1 relative"
                style={{
                  borderLeft: '1px solid rgba(0,0,0,0.07)',
                  background: isToday ? 'rgba(99,102,241,0.05)' : 'transparent',
                }}
              >
                {/* Hour lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0"
                    style={{ top: `${(i / TOTAL_HOURS) * 100}%`, borderTop: '1px solid rgba(0,0,0,0.05)' }}
                  />
                ))}

                {isToday && <NowLine />}

                {/* Events */}
                {dayEvents.map((e) => {
                  const top = timeToPercent(e.start);
                  const height = eventHeightPercent(e.start, e.end);
                  const s = getEventStyle(e.colorId);
                  return (
                    <div
                      key={e.id}
                      className="absolute text-[10px] leading-tight overflow-hidden z-10"
                      style={{
                        top: `${top}%`, height: `${height}%`,
                        left: 2, right: 2,
                        borderRadius: 8,
                        background: s.bg,
                        borderLeft: `2px solid ${s.border}`,
                        padding: '2px 4px',
                        color: s.text,
                        opacity: isPast ? 0.55 : 1,
                      }}
                      title={`${e.summary} • ${formatShort(e.start)}–${formatShort(e.end)}`}
                    >
                      <span className="font-medium block truncate">{e.summary}</span>
                      {height > 4 && (
                        <span style={{ opacity: 0.75 }}>{formatShort(e.start)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWeekEvents } from '../../services/google-calendar';
import type { CalendarEvent } from '../../services/google-calendar';
import { SkeletonBlock } from '../layout/Skeleton';
import ErrorState from '../layout/ErrorState';
import WidgetLink from '../layout/WidgetLink';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAY_START      = 7;
const DAY_END        = 22;
const TOTAL_HOURS    = DAY_END - DAY_START;
const TIME_COL_PX    = 44;
const HOUR_HEIGHT_PX = 56; // controls zoom level — increase to spread events
const MAX_ALL_DAY    = 3;

// ─── Color map ────────────────────────────────────────────────────────────────
const EVENT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  '1':  { bg: 'rgba(59,130,246,0.12)',  border: '#3B82F6', text: '#1e3a8a' },
  '2':  { bg: 'rgba(34,197,94,0.12)',   border: '#22C55E', text: '#14532d' },
  '3':  { bg: 'rgba(139,92,246,0.12)',  border: '#8B5CF6', text: '#4c1d95' },
  '4':  { bg: 'rgba(239,68,68,0.12)',   border: '#EF4444', text: '#7f1d1d' },
  '5':  { bg: 'rgba(234,179,8,0.12)',   border: '#CA8A04', text: '#713f12' },
  '6':  { bg: 'rgba(249,115,22,0.12)',  border: '#F97316', text: '#7c2d12' },
  '7':  { bg: 'rgba(20,184,166,0.12)',  border: '#14B8A6', text: '#134e4a' },
  '9':  { bg: 'rgba(99,102,241,0.12)',  border: '#6366F1', text: '#312e81' },
  '10': { bg: 'rgba(34,197,94,0.12)',   border: '#22C55E', text: '#14532d' },
  '11': { bg: 'rgba(239,68,68,0.12)',   border: '#EF4444', text: '#7f1d1d' },
};
const DEFAULT_STYLE = { bg: 'rgba(99,102,241,0.12)', border: '#6366F1', text: '#312e81' };

function getEventStyle(colorId?: string, calendarColor?: string) {
  if (EVENT_STYLES[colorId ?? '']) return EVENT_STYLES[colorId!];
  if (calendarColor?.startsWith('#') && calendarColor.length === 7) {
    const r = parseInt(calendarColor.slice(1, 3), 16);
    const g = parseInt(calendarColor.slice(3, 5), 16);
    const b = parseInt(calendarColor.slice(5, 7), 16);
    return {
      bg: `rgba(${r},${g},${b},0.12)`,
      border: calendarColor,
      text: `rgb(${Math.round(r * 0.45)},${Math.round(g * 0.45)},${Math.round(b * 0.45)})`,
    };
  }
  return DEFAULT_STYLE;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
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

function isPastDay(day: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return day < today;
}

// ─── Positioning helpers ──────────────────────────────────────────────────────
function timeToPercent(iso: string): number {
  const d = new Date(iso);
  const hours = d.getHours() + d.getMinutes() / 60;
  return ((Math.min(Math.max(hours, DAY_START), DAY_END) - DAY_START) / TOTAL_HOURS) * 100;
}

function eventHeightPercent(start: string, end: string): number {
  const durationHours = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
  return Math.max((durationHours / TOTAL_HOURS) * 100, 100 / TOTAL_HOURS / 2); // min = 30 min equivalent
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// ─── Overlap detection ────────────────────────────────────────────────────────
interface PositionedEvent extends CalendarEvent {
  lane: number;
  totalLanes: number;
}

function computeOverlaps(events: CalendarEvent[]): PositionedEvent[] {
  if (!events.length) return [];

  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  // Assign each event a lane (column within the day)
  const laneEnd: number[] = []; // end-time of the last event in each lane
  const lanes = sorted.map((e) => {
    const startMs = new Date(e.start).getTime();
    const endMs   = new Date(e.end).getTime();
    let lane = 0;
    while (laneEnd[lane] !== undefined && laneEnd[lane] > startMs) lane++;
    laneEnd[lane] = endMs;
    return lane;
  });

  // Calculate totalLanes for each event = max lane among all overlapping events + 1
  const result: PositionedEvent[] = sorted.map((e, i) => ({ ...e, lane: lanes[i], totalLanes: 1 }));

  for (let i = 0; i < result.length; i++) {
    const startI = new Date(result[i].start).getTime();
    const endI   = new Date(result[i].end).getTime();
    let maxLane  = result[i].lane;

    for (let j = 0; j < result.length; j++) {
      if (i === j) continue;
      const startJ = new Date(result[j].start).getTime();
      const endJ   = new Date(result[j].end).getTime();
      if (startJ < endI && endJ > startI) maxLane = Math.max(maxLane, result[j].lane);
    }
    result[i].totalLanes = maxLane + 1;
  }

  return result;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
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
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  if (!visible) return null;
  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
      style={{ top: `${pct}%` }}
    >
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginLeft: -3.5 }} />
      <div style={{ flex: 1, height: 1.5, background: 'rgba(239,68,68,0.55)' }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CalendarWidget({ authenticated }: { authenticated: boolean }) {
  const [events, setEvents]           = useState<CalendarEvent[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const scrollRef   = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const days  = getWeekDays();
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
    const interval = setInterval(load, 10 * 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // Auto-scroll to ~1h before current time on first load
  useEffect(() => {
    if (loading || !scrollRef.current || hasScrolled.current) return;
    const now   = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    if (hours < DAY_START || hours > DAY_END) return;
    hasScrolled.current = true;
    const pct = Math.max(0, (hours - 1.5 - DAY_START) / TOTAL_HOURS);
    scrollRef.current.scrollTop = pct * scrollRef.current.scrollHeight;
  }, [loading]);

  const allDayEvents = events.filter((e) => e.isAllDay);
  const timedEvents  = events.filter((e) => !e.isAllDay);

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

      {/* ── Fixed header: day names + all-day events ── */}
      <div className="flex-shrink-0">

        {/* Day headers */}
        <div className="flex mb-1" style={{ paddingLeft: TIME_COL_PX }}>
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            const isPast  = isPastDay(day);
            return (
              <div key={day.toISOString()} className="flex-1 flex flex-col items-center">
                <span style={{ fontSize: 10, color: isPast ? '#C4C9D4' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                </span>
                <span
                  className="text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mt-0.5"
                  style={isToday
                    ? { background: '#6366F1', color: '#fff' }
                    : isPast ? { color: '#C4C9D4' } : { color: '#374151' }}
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
            className="flex pb-1.5 mb-1"
            style={{ paddingLeft: TIME_COL_PX, borderBottom: '1px solid rgba(0,0,0,0.07)' }}
          >
            {days.map((day) => {
              const isPast     = isPastDay(day);
              const dayKey     = day.toISOString();
              const dayEvents  = allDayEvents.filter((e) => isSameDay(new Date(e.start), day));
              const isExpanded = expandedDays.has(dayKey);
              const visible    = isExpanded ? dayEvents : dayEvents.slice(0, MAX_ALL_DAY);
              const hiddenCt   = dayEvents.length - MAX_ALL_DAY;

              return (
                <div key={dayKey} className="flex-1 px-0.5 flex flex-col gap-0.5">
                  {visible.map((e) => {
                    const s = getEventStyle(e.colorId, e.calendarColor);
                    return (
                      <div
                        key={e.id}
                        className="truncate font-medium px-1 py-0.5"
                        style={{
                          fontSize: 9.5,
                          borderRadius: 4,
                          background: s.bg,
                          borderLeft: `2px solid ${s.border}`,
                          color: s.text,
                          opacity: isPast ? 0.5 : 1,
                        }}
                        title={e.summary}
                      >
                        {e.summary}
                      </div>
                    );
                  })}
                  {!isExpanded && hiddenCt > 0 && (
                    <button
                      onClick={() => setExpandedDays((prev) => { const n = new Set(prev); n.add(dayKey); return n; })}
                      style={{ fontSize: 9, color: '#6366F1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '1px 2px' }}
                    >
                      +{hiddenCt} mehr
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Scrollable time grid ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div
          className="flex relative"
          style={{ minHeight: TOTAL_HOURS * HOUR_HEIGHT_PX }}
        >

          {/* Time labels */}
          <div className="flex-shrink-0 relative select-none" style={{ width: TIME_COL_PX }}>
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  top: `${(i / TOTAL_HOURS) * 100}%`,
                  right: 8,
                  fontSize: 9,
                  fontWeight: 500,
                  color: '#B0B7C3',
                  lineHeight: 1,
                  transform: 'translateY(-50%)',
                  userSelect: 'none',
                }}
              >
                {String(DAY_START + i).padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const isToday  = isSameDay(day, today);
            const isPast   = isPastDay(day);
            const dayEvts  = timedEvents.filter((e) => isSameDay(new Date(e.start), day));
            const posEvts  = computeOverlaps(dayEvts);

            return (
              <div
                key={day.toISOString()}
                className="flex-1 relative"
                style={{
                  borderLeft: '1px solid rgba(0,0,0,0.06)',
                  background: isToday ? 'rgba(99,102,241,0.03)' : 'transparent',
                }}
              >
                {/* Hour lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: `${(i / TOTAL_HOURS) * 100}%`, borderTop: '1px solid rgba(0,0,0,0.045)' }}
                  />
                ))}

                {isToday && <NowLine />}

                {/* Events */}
                {posEvts.map((e) => {
                  const top    = timeToPercent(e.start);
                  const height = eventHeightPercent(e.start, e.end);
                  const s      = getEventStyle(e.colorId, e.calendarColor);
                  const laneW  = 100 / e.totalLanes;
                  const laneL  = e.lane * laneW;
                  // Show time label when event is tall enough (>= ~25 min)
                  const showTime = height >= (100 / TOTAL_HOURS) * 0.42;

                  return (
                    <div
                      key={e.id}
                      className="absolute z-10 overflow-hidden"
                      title={`${e.summary} · ${formatShort(e.start)}–${formatShort(e.end)}`}
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        left: `calc(${laneL}% + 2px)`,
                        width: `calc(${laneW}% - 4px)`,
                        minHeight: 20,
                        borderRadius: 6,
                        background: s.bg,
                        borderLeft: `2.5px solid ${s.border}`,
                        padding: '2px 5px',
                        color: s.text,
                        opacity: isPast ? 0.48 : 1,
                        cursor: 'default',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: showTime ? 2 : 3,
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        } as React.CSSProperties}
                      >
                        {e.summary}
                      </span>
                      {showTime && (
                        <span style={{ fontSize: 9, display: 'block', opacity: 0.75, lineHeight: 1.2, marginTop: 1 }}>
                          {formatShort(e.start)}
                        </span>
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

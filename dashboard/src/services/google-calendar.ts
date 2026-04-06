import { getToken } from './google-auth';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO string
  end: string;
  isAllDay: boolean;
  colorId?: string;
  calendarColor?: string;
}

async function fetchCalendarList(token: string): Promise<{ id: string; backgroundColor: string }[]> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [{ id: 'primary', backgroundColor: '#6366F1' }];
  const data = await res.json();
  return (data.items ?? [])
    .filter((c: Record<string, unknown>) => c.selected !== false)
    .map((c: Record<string, unknown>) => ({
      id: c.id as string,
      backgroundColor: (c.backgroundColor as string) ?? '#6366F1',
    }));
}

async function fetchEventsForCalendar(
  token: string,
  calendarId: string,
  calendarColor: string,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.items ?? []).map((item: Record<string, unknown>) => {
    const startObj = item.start as Record<string, string>;
    const endObj = item.end as Record<string, string>;
    const isAllDay = Boolean(startObj.date);
    return {
      id: `${calendarId}::${item.id as string}`,
      summary: (item.summary as string) ?? '(Kein Titel)',
      start: startObj.dateTime ?? startObj.date,
      end: endObj.dateTime ?? endObj.date,
      isAllDay,
      colorId: item.colorId as string | undefined,
      calendarColor,
    };
  });
}

export async function fetchWeekEvents(): Promise<CalendarEvent[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const timeMin = startOfWeek.toISOString();
  const timeMax = endOfWeek.toISOString();

  const calendars = await fetchCalendarList(token);

  const results = await Promise.all(
    calendars.map((cal) => fetchEventsForCalendar(token, cal.id, cal.backgroundColor, timeMin, timeMax))
  );

  return results.flat();
}

import { getToken } from './google-auth';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO string
  end: string;
  isAllDay: boolean;
  colorId?: string;
}

export async function fetchWeekEvents(): Promise<CalendarEvent[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    timeMin: startOfWeek.toISOString(),
    timeMax: endOfWeek.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Calendar fetch failed');
  const data = await res.json();

  return (data.items ?? []).map((item: Record<string, unknown>) => {
    const startObj = item.start as Record<string, string>;
    const endObj = item.end as Record<string, string>;
    const isAllDay = Boolean(startObj.date);
    return {
      id: item.id as string,
      summary: (item.summary as string) ?? '(Kein Titel)',
      start: startObj.dateTime ?? startObj.date,
      end: endObj.dateTime ?? endObj.date,
      isAllDay,
      colorId: item.colorId as string | undefined,
    };
  });
}

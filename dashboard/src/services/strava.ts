import { getStravaToken } from './strava-auth';

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date: string;
  average_speed: number;
  total_elevation_gain: number;
}

export interface WeekStats {
  totalKm: number;
  activityCount: number;
  longestKm: number;
  elevationGain: number;
  totalMinutes: number;
  dailyKm: Record<string, number>;
  weekLabel: string;
  activities: { type: string; km: number; minutes: number }[];
  // gamification
  streak: number;          // consecutive weeks with ≥1 activity
  weekGoal: number;        // target = 3
  goalProgress: number;    // 0–3 (capped)
  weeklyUnits: { label: string; count: number }[]; // last 4 weeks
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEK_GOAL = 3;

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekBounds(weekOffset: number): { after: number; before: number; label: string } {
  const now = new Date();
  const monday = getMondayOf(now);
  monday.setDate(monday.getDate() + weekOffset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const fmt = (d: Date) => d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

  let label: string;
  if (weekOffset === 0) label = 'Diese Woche';
  else if (weekOffset === -1) label = 'Letzte Woche';
  else label = `${fmt(monday)} – ${fmt(sunday)}`;

  return {
    after: Math.floor(monday.getTime() / 1000),
    before: Math.floor(sunday.getTime() / 1000),
    label,
  };
}

function computeStreak(allActivities: StravaActivity[]): number {
  if (allActivities.length === 0) return 0;

  const now = new Date();
  let streak = 0;
  let checkOffset = -1; // start from last week

  // If current week already has an activity, count it
  const currentMonday = getMondayOf(now).getTime();
  const currentSunday = currentMonday + 7 * 24 * 60 * 60 * 1000;
  const currentWeekHasActivity = allActivities.some((a) => {
    const t = new Date(a.start_date).getTime();
    return t >= currentMonday && t < currentSunday;
  });
  if (currentWeekHasActivity) {
    streak = 1;
    checkOffset = -1;
  }

  // Walk backwards week by week (up to 52 weeks)
  for (let offset = checkOffset; offset >= -52; offset--) {
    const monday = getMondayOf(now);
    monday.setDate(monday.getDate() + offset * 7);
    const after = monday.getTime();
    const before = after + 7 * 24 * 60 * 60 * 1000;

    const hasActivity = allActivities.some((a) => {
      const t = new Date(a.start_date).getTime();
      return t >= after && t < before;
    });

    if (hasActivity) streak++;
    else break;
  }

  return streak;
}

export async function fetchWeekActivities(weekOffset = 0): Promise<WeekStats> {
  const token = await getStravaToken();
  const { after, before, label } = getWeekBounds(weekOffset);

  // For current week fetch past 52 weeks for streak calculation
  const streakAfter = weekOffset === 0
    ? Math.floor((Date.now() / 1000) - 52 * 7 * 24 * 60 * 60)
    : after;

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${streakAfter}&before=${before}&per_page=200&page=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Strava activities fetch failed');
  const allActivities: StravaActivity[] = await res.json();

  // Filter to current week only for stats
  const weekActivities = allActivities.filter((a) => {
    const t = new Date(a.start_date).getTime() / 1000;
    return t >= after && t <= before;
  });

  // Daily km for all activity types
  const dailyKm: Record<string, number> = Object.fromEntries(DAY_LABELS.map((d) => [d, 0]));
  for (const a of weekActivities) {
    const day = new Date(a.start_date);
    const dayIndex = (day.getDay() + 6) % 7;
    dailyKm[DAY_LABELS[dayIndex]] = (dailyKm[DAY_LABELS[dayIndex]] ?? 0) + a.distance / 1000;
  }

  const totalKm = weekActivities.reduce((s, a) => s + a.distance / 1000, 0);
  const totalMinutes = Math.round(weekActivities.reduce((s, a) => s + a.moving_time, 0) / 60);
  const longestKm = weekActivities.reduce((m, a) => Math.max(m, a.distance / 1000), 0);
  const elevationGain = weekActivities.reduce((s, a) => s + a.total_elevation_gain, 0);

  const activities = weekActivities.map((a) => ({
    type: a.type,
    km: Math.round((a.distance / 1000) * 10) / 10,
    minutes: Math.round(a.moving_time / 60),
  }));

  const streak = weekOffset === 0 ? computeStreak(allActivities) : 0;

  // Last 4 weeks activity counts (offset 0 = this week, -1 = last week, ...)
  const now = new Date();
  const weeklyUnits = [-3, -2, -1, 0].map((offset) => {
    const monday = getMondayOf(now);
    monday.setDate(monday.getDate() + offset * 7);
    const after = monday.getTime();
    const before = after + 7 * 24 * 60 * 60 * 1000;
    const count = allActivities.filter((a) => {
      const t = new Date(a.start_date).getTime();
      return t >= after && t < before;
    }).length;
    const label = offset === 0 ? 'Diese W.' : offset === -1 ? 'Letzte W.' : `KW${getISOWeek(monday)}`;
    return { label, count };
  });

  return {
    totalKm: Math.round(totalKm * 10) / 10,
    activityCount: weekActivities.length,
    longestKm: Math.round(longestKm * 10) / 10,
    elevationGain: Math.round(elevationGain),
    totalMinutes,
    dailyKm,
    weekLabel: label,
    activities,
    streak,
    weekGoal: WEEK_GOAL,
    goalProgress: Math.min(weekActivities.length, WEEK_GOAL),
    weeklyUnits,
  };
}

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

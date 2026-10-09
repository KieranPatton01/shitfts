import { DayKey } from '../types';

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_NAMES: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
};

export const DAY_SHORT_NAMES: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun'
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Return ISO 8601 week number and year for a date.
 * ISO weeks start on Monday. The first week of the year contains Jan 4th.
 */
export function getISOWeekDetails(date: Date): { year: number; weekNumber: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Day 0 is Sunday in JS, change to 7
  const dayNumber = target.getUTCDay() || 7;
  // Set to nearest Thursday: current date + 4 - current day number
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return {
    year: target.getUTCFullYear(),
    weekNumber
  };
}

/**
 * Generates ISO week ID, e.g. "2026-W42"
 */
export function getISOWeekId(date: Date = new Date()): string {
  const { year, weekNumber } = getISOWeekDetails(date);
  const paddedWeek = weekNumber.toString().padStart(2, '0');
  return `${year}-W${paddedWeek}`;
}

export function getCurrentISOWeekId(): string {
  return getISOWeekId(new Date());
}

/**
 * Parses "YYYY-Www" into the Monday date of that ISO week.
 */
export function getMondayOfISOWeek(isoWeekId: string): Date {
  const match = isoWeekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid ISO week ID: ${isoWeekId}. Expected format YYYY-Www`);
  }
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  // Jan 4th is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7; // Monday = 1, Sunday = 7
  
  // Find Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4DayOfWeek - 1));

  // Add (week - 1) * 7 days
  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return targetMonday;
}

export interface DayInfo {
  dayKey: DayKey;
  dateStr: string;      // "YYYY-MM-DD"
  dayName: string;      // "Wednesday"
  shortName: string;    // "Wed"
  dayOfMonth: number;   // 14
  monthName: string;    // "Oct"
  formatted: string;    // "Wednesday, Oct 14"
  dateObj: Date;
}

/**
 * Returns the 7 days of the specified ISO week (Monday through Sunday)
 */
export function getWeekDays(isoWeekId: string): DayInfo[] {
  const monday = getMondayOfISOWeek(isoWeekId);
  const result: DayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);

    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayKey = DAY_KEYS[i];
    const monthName = MONTH_NAMES[d.getUTCMonth()];
    const dayOfMonth = d.getUTCDate();

    result.push({
      dayKey,
      dateStr,
      dayName: DAY_NAMES[dayKey],
      shortName: DAY_SHORT_NAMES[dayKey],
      dayOfMonth,
      monthName,
      formatted: `${DAY_NAMES[dayKey]}, ${monthName} ${dayOfMonth}`,
      dateObj: d
    });
  }

  return result;
}

/**
 * Returns previous or next ISO week id
 */
export function getAdjacentWeek(isoWeekId: string, offset: number): string {
  const monday = getMondayOfISOWeek(isoWeekId);
  const targetMonday = new Date(monday);
  targetMonday.setUTCDate(monday.getUTCDate() + offset * 7);
  return getISOWeekId(targetMonday);
}

/**
 * Returns human label for week range, e.g. "Oct 12 – 18" or "Dec 28 – Jan 3"
 */
export function formatWeekRange(isoWeekId: string): string {
  const days = getWeekDays(isoWeekId);
  const first = days[0];
  const last = days[6];

  if (first.monthName === last.monthName) {
    return `${first.monthName} ${first.dayOfMonth} – ${last.dayOfMonth}`;
  }
  return `${first.monthName} ${first.dayOfMonth} – ${last.monthName} ${last.dayOfMonth}`;
}

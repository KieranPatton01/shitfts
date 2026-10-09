import { DayKey, DayShiftData, ShiftType, SynergyTier } from '../types';
import { DAY_KEYS, getISOWeekId } from './isoWeek';

export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export type DayVisualState = 'past' | 'unentered' | 'inputted';

export type AvailabilityType =
  | 'both_free'
  | 'my_free'
  | 'partner_free'
  | 'evening_free'
  | 'both_working'
  | 'busy'
  | 'my_input_only'
  | 'partner_input_only';

export interface MonthCalendarCell {
  dateStr: string;           // "YYYY-MM-DD"
  dayOfMonth: number;        // 1..31
  dayKey: DayKey;            // 'mon'..'sun'
  isoWeekId: string;         // "2026-W42"
  isCurrentMonth: boolean;   // true for days in the target month, false for padding
  isToday: boolean;          // true if matches today's date
  isPast: boolean;           // true if dateStr < todayDateStr
}

export interface DayAvailabilityInfo {
  visualState: DayVisualState;
  hasInput: boolean;
  isPast: boolean;
  isToday: boolean;
  availabilityType?: AvailabilityType;
  badgeText?: string;
  statusLabel?: string;
  summaryDescription?: string;
  myStatus?: ShiftType;
  partnerStatus?: ShiftType;
  myHours?: string;
  partnerHours?: string;
  synergyTier?: SynergyTier;
}

/**
 * Returns month title, e.g. "October 2026"
 */
export function formatMonthTitle(year: number, monthIndex: number): string {
  return `${MONTH_NAMES_FULL[monthIndex]} ${year}`;
}

/**
 * Navigate months forwards or backwards, handling year boundaries cleanly.
 */
export function getAdjacentMonth(
  year: number,
  monthIndex: number,
  offset: number
): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + offset, 1);
  return {
    year: d.getFullYear(),
    monthIndex: d.getMonth()
  };
}

/**
 * Returns all unique ISO week IDs (e.g. ['2026-W40', '2026-W41', ...])
 * covering every day of the given month.
 */
export function getMonthWeeks(year: number, monthIndex: number): string[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekSet = new Set<string>();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day, 12, 0, 0);
    weekSet.add(getISOWeekId(d));
  }

  return Array.from(weekSet);
}

/**
 * Convert Date or year/month/day to YYYY-MM-DD string
 */
export function formatIsoDateStr(year: number, monthIndex: number, dayOfMonth: number): string {
  const y = String(year);
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(dayOfMonth).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates the full 7-column calendar grid for a month (Monday through Sunday).
 * Leading slots before the 1st of the month are included as isCurrentMonth: false cells.
 * Trailing slots to complete the final 7-day row are also included as isCurrentMonth: false cells.
 */
export function getMonthCalendarCells(
  year: number,
  monthIndex: number,
  todayDateStr: string
): MonthCalendarCell[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // 1st of month: find day of week (Monday = 0, Sunday = 6)
  const firstDate = new Date(year, monthIndex, 1, 12, 0, 0);
  const firstDayOfWeekIndex = (firstDate.getDay() + 6) % 7;

  const cells: MonthCalendarCell[] = [];

  // 1. Leading padding cells (days from previous month)
  if (firstDayOfWeekIndex > 0) {
    const prevMonthDays = new Date(year, monthIndex, 0).getDate();
    const prevMonthAdjacent = getAdjacentMonth(year, monthIndex, -1);

    for (let i = firstDayOfWeekIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const dateStr = formatIsoDateStr(prevMonthAdjacent.year, prevMonthAdjacent.monthIndex, dayNum);
      const dateObj = new Date(prevMonthAdjacent.year, prevMonthAdjacent.monthIndex, dayNum, 12, 0, 0);
      const dayKey = DAY_KEYS[(dateObj.getDay() + 6) % 7];
      const isoWeekId = getISOWeekId(dateObj);

      cells.push({
        dateStr,
        dayOfMonth: dayNum,
        dayKey,
        isoWeekId,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        isPast: dateStr < todayDateStr
      });
    }
  }

  // 2. Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatIsoDateStr(year, monthIndex, day);
    const dateObj = new Date(year, monthIndex, day, 12, 0, 0);
    const dayKey = DAY_KEYS[(dateObj.getDay() + 6) % 7];
    const isoWeekId = getISOWeekId(dateObj);

    cells.push({
      dateStr,
      dayOfMonth: day,
      dayKey,
      isoWeekId,
      isCurrentMonth: true,
      isToday: dateStr === todayDateStr,
      isPast: dateStr < todayDateStr
    });
  }

  // 3. Trailing padding cells to complete the 7-day row
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const trailingCount = 7 - remainder;
    const nextMonthAdjacent = getAdjacentMonth(year, monthIndex, 1);

    for (let day = 1; day <= trailingCount; day++) {
      const dateStr = formatIsoDateStr(nextMonthAdjacent.year, nextMonthAdjacent.monthIndex, day);
      const dateObj = new Date(nextMonthAdjacent.year, nextMonthAdjacent.monthIndex, day, 12, 0, 0);
      const dayKey = DAY_KEYS[(dateObj.getDay() + 6) % 7];
      const isoWeekId = getISOWeekId(dateObj);

      cells.push({
        dateStr,
        dayOfMonth: day,
        dayKey,
        isoWeekId,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        isPast: dateStr < todayDateStr
      });
    }
  }

  return cells;
}

/**
 * Computes availability details and visual state for a calendar day.
 * - Days in the past: greyed out ('past')
 * - Days not yet inputted: white ('unentered')
 * - The rest: contains information on who is available ('inputted')
 */
export function getDayAvailability(
  cell: MonthCalendarCell,
  myShift?: DayShiftData,
  partnerShift?: DayShiftData,
  partnerName: string = 'Partner',
  synergyTier?: SynergyTier,
  isPaired: boolean = true
): DayAvailabilityInfo {
  const isPast = cell.isPast;
  const isToday = cell.isToday;

  const hasMyInput = Boolean(myShift?.status);
  const hasPartnerInput = Boolean(partnerShift?.status);
  const hasInput = hasMyInput || hasPartnerInput;

  let visualState: DayVisualState;
  if (isPast) {
    visualState = 'past';
  } else if (!hasInput) {
    visualState = 'unentered';
  } else {
    visualState = 'inputted';
  }

  const myStatus = myShift?.status;
  const partnerStatus = partnerShift?.status;
  const partnerDisplayName = partnerName.trim() || 'Partner';

  let availabilityType: AvailabilityType | undefined;
  let badgeText: string | undefined;
  let statusLabel: string | undefined;
  let summaryDescription: string | undefined;

  if (hasMyInput && hasPartnerInput) {
    // Both users have inputted
    if (myStatus === 'free' && partnerStatus === 'free') {
      availabilityType = 'both_free';
      badgeText = '✨ Both free';
      statusLabel = 'Both Free All Day';
      summaryDescription = `Both you and ${partnerDisplayName} are completely free all day!`;
    } else if (myStatus === 'free') {
      availabilityType = 'my_free';
      badgeText = '☀️ You free';
      statusLabel = 'You Are Free';
      const label = partnerStatus === 'work' ? 'working' : partnerStatus === 'college' ? 'in college' : 'busy';
      summaryDescription = `You are free all day. ${partnerDisplayName} is ${label}.`;
    } else if (partnerStatus === 'free') {
      availabilityType = 'partner_free';
      badgeText = `☀️ ${partnerDisplayName} free`;
      statusLabel = `${partnerDisplayName} Is Free`;
      const label = myStatus === 'work' ? 'working' : myStatus === 'college' ? 'in college' : 'busy';
      summaryDescription = `${partnerDisplayName} is free all day. You are ${label}.`;
    } else if (myStatus === 'busy' || partnerStatus === 'busy') {
      availabilityType = 'busy';
      badgeText = '🚫 Busy';
      statusLabel = 'Committed / Busy';
      summaryDescription = 'Personal commitments scheduled today.';
    } else if (synergyTier === 'evening') {
      availabilityType = 'evening_free';
      badgeText = '🌙 Eve free';
      statusLabel = 'Both Free This Evening';
      summaryDescription = `Both finished late afternoon. Great evening overlap together!`;
    } else {
      availabilityType = 'both_working';
      badgeText = '🫩 Both work';
      statusLabel = 'Both Working';
      summaryDescription = 'Both working today (misaligned/offset shifts).';
    }
  } else if (hasMyInput && !hasPartnerInput) {
    // Only current user has inputted
    if (myStatus === 'free') {
      availabilityType = 'my_free';
      badgeText = '☀️ You free';
      statusLabel = 'You Are Free';
      summaryDescription = isPaired
        ? `You are free all day. Awaiting ${partnerDisplayName}'s shifts.`
        : 'You are free all day. Connect a partner to see shared free time.';
    } else if (myStatus === 'work' || myStatus === 'college') {
      availabilityType = 'my_input_only';
      badgeText = myStatus === 'work' ? '🫩 Work' : '🎓 College';
      statusLabel = myStatus === 'work' ? 'You: Work' : 'You: College';
      const myPrep = myStatus === 'work' ? 'at work' : 'in college';
      summaryDescription = isPaired
        ? `You are ${myPrep}. ${partnerDisplayName} hasn't inputted yet.`
        : `You are ${myPrep}.`;
    } else {
      availabilityType = 'busy';
      badgeText = '🚫 Busy';
      statusLabel = 'You: Busy';
      summaryDescription = isPaired
        ? `You are busy. ${partnerDisplayName} hasn't inputted yet.`
        : 'You have personal commitments scheduled today.';
    }
  } else if (!hasMyInput && hasPartnerInput) {
    // Only partner has inputted
    if (partnerStatus === 'free') {
      availabilityType = 'partner_free';
      badgeText = `☀️ ${partnerDisplayName} free`;
      statusLabel = `${partnerDisplayName} Is Free`;
      summaryDescription = `${partnerDisplayName} is free all day. Add your shift to see your overlap!`;
    } else if (partnerStatus === 'work' || partnerStatus === 'college') {
      availabilityType = 'partner_input_only';
      badgeText = partnerStatus === 'work' ? `🫩 ${partnerDisplayName}` : `🎓 ${partnerDisplayName}`;
      statusLabel = `${partnerDisplayName}: ${partnerStatus === 'work' ? 'Work' : 'College'}`;
      const partnerPrep = partnerStatus === 'work' ? 'at work' : 'in college';
      summaryDescription = `${partnerDisplayName} is ${partnerPrep}. Add your shift to see your overlap!`;
    } else {
      availabilityType = 'busy';
      badgeText = `🚫 ${partnerDisplayName} busy`;
      statusLabel = `${partnerDisplayName}: Busy`;
      summaryDescription = `${partnerDisplayName} has commitments today.`;
    }
  }

  return {
    visualState,
    hasInput,
    isPast,
    isToday,
    availabilityType,
    badgeText,
    statusLabel,
    summaryDescription,
    myStatus,
    partnerStatus,
    myHours: myShift?.customHours,
    partnerHours: partnerShift?.customHours,
    synergyTier
  };
}

export interface MonthSummaryStats {
  bothFreeCount: number;
  myFreeCount: number;
  partnerFreeCount: number;
  eveningOverlapCount: number;
  unenteredFutureDaysCount: number;
  totalDaysInMonth: number;
  nextBothFreeDateStr?: string;
}

/**
 * Computes month-wide availability statistics for the summary card.
 */
export function computeMonthSummaryStats(
  cells: MonthCalendarCell[],
  availabilityMap: Record<string, DayAvailabilityInfo>
): MonthSummaryStats {
  let bothFreeCount = 0;
  let myFreeCount = 0;
  let partnerFreeCount = 0;
  let eveningOverlapCount = 0;
  let unenteredFutureDaysCount = 0;
  let totalDaysInMonth = 0;
  let nextBothFreeDateStr: string | undefined;

  for (const cell of cells) {
    if (!cell.isCurrentMonth) continue;
    totalDaysInMonth++;

    const info = availabilityMap[cell.dateStr];
    if (!info) continue;

    if (info.visualState === 'unentered') {
      unenteredFutureDaysCount++;
    }

    if (info.availabilityType === 'both_free') {
      bothFreeCount++;
      if (!cell.isPast && !nextBothFreeDateStr) {
        nextBothFreeDateStr = cell.dateStr;
      }
    } else if (info.availabilityType === 'evening_free') {
      eveningOverlapCount++;
      if (!cell.isPast && !nextBothFreeDateStr) {
        nextBothFreeDateStr = cell.dateStr;
      }
    }

    if (info.myStatus === 'free') {
      myFreeCount++;
    }
    if (info.partnerStatus === 'free') {
      partnerFreeCount++;
    }
  }

  return {
    bothFreeCount,
    myFreeCount,
    partnerFreeCount,
    eveningOverlapCount,
    unenteredFutureDaysCount,
    totalDaysInMonth,
    nextBothFreeDateStr
  };
}

import { describe, it, expect } from 'vitest';
import {
  getMonthWeeks,
  getMonthCalendarCells,
  getAdjacentMonth,
  formatMonthTitle,
  getDayAvailability,
  computeMonthSummaryStats,
  MonthCalendarCell
} from './calendarMonth';
import { DayShiftData } from '../types';

describe('calendarMonth utilities', () => {
  describe('formatMonthTitle & getAdjacentMonth', () => {
    it('formats month title correctly', () => {
      expect(formatMonthTitle(2026, 9)).toBe('October 2026');
      expect(formatMonthTitle(2027, 0)).toBe('January 2027');
    });

    it('navigates adjacent months forward and backward across year boundaries', () => {
      expect(getAdjacentMonth(2026, 9, 1)).toEqual({ year: 2026, monthIndex: 10 });
      expect(getAdjacentMonth(2026, 9, -1)).toEqual({ year: 2026, monthIndex: 8 });
      // Year transition
      expect(getAdjacentMonth(2026, 11, 1)).toEqual({ year: 2027, monthIndex: 0 });
      expect(getAdjacentMonth(2027, 0, -1)).toEqual({ year: 2026, monthIndex: 11 });
    });
  });

  describe('getMonthWeeks', () => {
    it('returns all unique ISO weeks spanning October 2026', () => {
      const weeks = getMonthWeeks(2026, 9);
      // October 2026 starts on Thursday (Week 40) and ends on Saturday (Week 44)
      expect(weeks).toEqual(['2026-W40', '2026-W41', '2026-W42', '2026-W43', '2026-W44']);
    });

    it('handles February in leap year (2024)', () => {
      const weeks = getMonthWeeks(2024, 1);
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks[0]).toBe('2024-W05');
    });
  });

  describe('getMonthCalendarCells', () => {
    it('generates grid aligned to Monday with leading and trailing padding', () => {
      const today = '2026-10-14';
      const cells = getMonthCalendarCells(2026, 9, today);

      // October 1, 2026 is Thursday.
      // Monday-based index: Mon=0, Tue=1, Wed=2, Thu=3.
      // So there should be 3 leading padding cells (Sep 28, 29, 30).
      expect(cells[0].isCurrentMonth).toBe(false);
      expect(cells[0].dayKey).toBe('mon');
      expect(cells[0].dateStr).toBe('2026-09-28');

      expect(cells[1].isCurrentMonth).toBe(false);
      expect(cells[1].dayKey).toBe('tue');
      expect(cells[1].dateStr).toBe('2026-09-29');

      expect(cells[2].isCurrentMonth).toBe(false);
      expect(cells[2].dayKey).toBe('wed');
      expect(cells[2].dateStr).toBe('2026-09-30');

      // October 1st is the 4th cell (index 3)
      expect(cells[3].isCurrentMonth).toBe(true);
      expect(cells[3].dayOfMonth).toBe(1);
      expect(cells[3].dayKey).toBe('thu');
      expect(cells[3].dateStr).toBe('2026-10-01');

      // Total cells must be a multiple of 7
      expect(cells.length % 7).toBe(0);

      // Current month cells count must be 31
      const currentMonthCells = cells.filter(c => c.isCurrentMonth);
      expect(currentMonthCells).toHaveLength(31);

      // Today should be flagged
      const todayCell = cells.find(c => c.dateStr === today);
      expect(todayCell?.isToday).toBe(true);

      // Past vs Future
      const pastCell = cells.find(c => c.dateStr === '2026-10-05');
      expect(pastCell?.isPast).toBe(true);
      const futureCell = cells.find(c => c.dateStr === '2026-10-25');
      expect(futureCell?.isPast).toBe(false);
    });
  });

  describe('getDayAvailability - Prompt Requirements', () => {
    const today = '2026-10-14';

    const createCell = (dateStr: string): MonthCalendarCell => {
      return {
        dateStr,
        dayOfMonth: parseInt(dateStr.split('-')[2], 10),
        dayKey: 'wed',
        isoWeekId: '2026-W42',
        isCurrentMonth: true,
        isToday: dateStr === today,
        isPast: dateStr < today
      };
    };

    it('greys out days in the past (visualState: "past")', () => {
      const pastCell = createCell('2026-10-05'); // past
      const myShift: DayShiftData = {
        date: '2026-10-05',
        dayOfWeek: 'mon',
        status: 'work'
      };
      const result = getDayAvailability(pastCell, myShift, undefined, 'Alex');
      expect(result.visualState).toBe('past');
      expect(result.isPast).toBe(true);
    });

    it('marks non-past days that have not been inputted yet as white (visualState: "unentered")', () => {
      const futureCell = createCell('2026-10-20'); // future, no input
      const result = getDayAvailability(futureCell, undefined, undefined, 'Alex');
      expect(result.visualState).toBe('unentered');
      expect(result.hasInput).toBe(false);
      expect(result.isPast).toBe(false);
    });

    it('marks today as unentered if not yet inputted', () => {
      const todayCell = createCell(today);
      const result = getDayAvailability(todayCell, undefined, undefined, 'Alex');
      expect(result.visualState).toBe('unentered');
      expect(result.hasInput).toBe(false);
      expect(result.isToday).toBe(true);
    });

    it('contains information on who is available when both are free', () => {
      const futureCell = createCell('2026-10-20');
      const myShift: DayShiftData = { date: '2026-10-20', dayOfWeek: 'tue', status: 'free' };
      const partnerShift: DayShiftData = { date: '2026-10-20', dayOfWeek: 'tue', status: 'free' };

      const result = getDayAvailability(futureCell, myShift, partnerShift, 'Alex');
      expect(result.visualState).toBe('inputted');
      expect(result.availabilityType).toBe('both_free');
      expect(result.badgeText).toBe('✨ Both free');
      expect(result.statusLabel).toBe('Both Free All Day');
    });

    it('contains information when only user is free', () => {
      const futureCell = createCell('2026-10-21');
      const myShift: DayShiftData = { date: '2026-10-21', dayOfWeek: 'wed', status: 'free' };
      const partnerShift: DayShiftData = { date: '2026-10-21', dayOfWeek: 'wed', status: 'work' };

      const result = getDayAvailability(futureCell, myShift, partnerShift, 'Alex');
      expect(result.visualState).toBe('inputted');
      expect(result.availabilityType).toBe('my_free');
      expect(result.badgeText).toBe('☀️ You free');
      expect(result.statusLabel).toBe('You Are Free');
    });

    it('contains information when only partner is free', () => {
      const futureCell = createCell('2026-10-22');
      const myShift: DayShiftData = { date: '2026-10-22', dayOfWeek: 'thu', status: 'work' };
      const partnerShift: DayShiftData = { date: '2026-10-22', dayOfWeek: 'thu', status: 'free' };

      const result = getDayAvailability(futureCell, myShift, partnerShift, 'Alex');
      expect(result.visualState).toBe('inputted');
      expect(result.availabilityType).toBe('partner_free');
      expect(result.badgeText).toBe('☀️ Alex free');
      expect(result.statusLabel).toBe('Alex Is Free');
    });

    it('contains evening overlap information when both work daytime shifts', () => {
      const futureCell = createCell('2026-10-23');
      const myShift: DayShiftData = { date: '2026-10-23', dayOfWeek: 'fri', status: 'work' };
      const partnerShift: DayShiftData = { date: '2026-10-23', dayOfWeek: 'fri', status: 'work' };

      const result = getDayAvailability(futureCell, myShift, partnerShift, 'Alex', 'evening');
      expect(result.visualState).toBe('inputted');
      expect(result.availabilityType).toBe('evening_free');
      expect(result.badgeText).toBe('🌙 Eve free');
    });

    it('handles single user input gracefully', () => {
      const futureCell = createCell('2026-10-24');
      const myShift: DayShiftData = { date: '2026-10-24', dayOfWeek: 'sat', status: 'work' };

      const result = getDayAvailability(futureCell, myShift, undefined, 'Alex');
      expect(result.visualState).toBe('inputted');
      expect(result.availabilityType).toBe('my_input_only');
      expect(result.badgeText).toBe('🫩 Work');
    });

    it('handles unpaired user mode cleanly without referring to a non-existent partner', () => {
      const futureCell = createCell('2026-10-25');
      const myShift: DayShiftData = { date: '2026-10-25', dayOfWeek: 'sun', status: 'free' };

      const result = getDayAvailability(futureCell, myShift, undefined, 'Partner', undefined, false);
      expect(result.visualState).toBe('inputted');
      expect(result.summaryDescription).toBe('You are free all day. Connect a partner to see shared free time.');
      expect(result.summaryDescription).not.toContain("Awaiting Partner's shifts");
    });
  });

  describe('getMonthCalendarCells edge cases', () => {
    it('handles a month starting on Sunday generating 6 rows / 42 cells (e.g. March 2026)', () => {
      // March 1, 2026 is Sunday. Monday-based index = 6. 6 leading padding days + 31 days = 37. + 5 trailing = 42 cells.
      const cells = getMonthCalendarCells(2026, 2, '2026-03-15');
      expect(cells).toHaveLength(42);
      expect(cells[0].isCurrentMonth).toBe(false);
      expect(cells[0].dayKey).toBe('mon');
      expect(cells[6].isCurrentMonth).toBe(true);
      expect(cells[6].dayOfMonth).toBe(1);
    });

    it('handles February in a non-leap year starting on Monday with 0 padding cells (e.g. Feb 2021)', () => {
      // Feb 1, 2021 is Monday. Exactly 28 days -> 4 rows = 28 cells.
      const cells = getMonthCalendarCells(2021, 1, '2021-02-15');
      expect(cells).toHaveLength(28);
      expect(cells[0].isCurrentMonth).toBe(true);
      expect(cells[0].dayOfMonth).toBe(1);
      expect(cells[27].isCurrentMonth).toBe(true);
      expect(cells[27].dayOfMonth).toBe(28);
    });
  });

  describe('computeMonthSummaryStats', () => {
    it('aggregates monthly statistics accurately', () => {
      const cells = getMonthCalendarCells(2026, 9, '2026-10-14');
      const availabilityMap: Record<string, any> = {};

      cells.forEach(cell => {
        if (!cell.isCurrentMonth) return;
        if (cell.dateStr === '2026-10-18') {
          availabilityMap[cell.dateStr] = {
            visualState: 'inputted',
            availabilityType: 'both_free',
            myStatus: 'free',
            partnerStatus: 'free'
          };
        } else if (cell.dateStr === '2026-10-20') {
          availabilityMap[cell.dateStr] = {
            visualState: 'inputted',
            availabilityType: 'my_free',
            myStatus: 'free',
            partnerStatus: 'work'
          };
        } else if (cell.isPast) {
          availabilityMap[cell.dateStr] = { visualState: 'past' };
        } else {
          availabilityMap[cell.dateStr] = { visualState: 'unentered' };
        }
      });

      const stats = computeMonthSummaryStats(cells, availabilityMap);
      expect(stats.totalDaysInMonth).toBe(31);
      expect(stats.bothFreeCount).toBe(1);
      expect(stats.myFreeCount).toBe(2);
      expect(stats.nextBothFreeDateStr).toBe('2026-10-18');
      expect(stats.unenteredFutureDaysCount).toBeGreaterThan(0);
    });
  });
});

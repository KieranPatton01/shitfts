import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { 
  getRecurringRules, 
  saveRecurringRule, 
  deleteRecurringRule, 
  applyRecurringRules 
} from './recurringService';
import { DayInfo } from '../utils/isoWeek';
import { DayShiftData } from '../types';

const mockWeekDays: DayInfo[] = [
  { dayKey: 'mon', dateStr: '2026-10-12', dayName: 'Monday', shortName: 'Mon', dayOfMonth: 12, monthName: 'Oct', formatted: 'Monday, Oct 12', dateObj: new Date() },
  { dayKey: 'tue', dateStr: '2026-10-13', dayName: 'Tuesday', shortName: 'Tue', dayOfMonth: 13, monthName: 'Oct', formatted: 'Tuesday, Oct 13', dateObj: new Date() },
  { dayKey: 'wed', dateStr: '2026-10-14', dayName: 'Wednesday', shortName: 'Wed', dayOfMonth: 14, monthName: 'Oct', formatted: 'Wednesday, Oct 14', dateObj: new Date() },
  { dayKey: 'thu', dateStr: '2026-10-15', dayName: 'Thursday', shortName: 'Thu', dayOfMonth: 15, monthName: 'Oct', formatted: 'Thursday, Oct 15', dateObj: new Date() },
  { dayKey: 'fri', dateStr: '2026-10-16', dayName: 'Friday', shortName: 'Fri', dayOfMonth: 16, monthName: 'Oct', formatted: 'Friday, Oct 16', dateObj: new Date() },
  { dayKey: 'sat', dateStr: '2026-10-17', dayName: 'Saturday', shortName: 'Sat', dayOfMonth: 17, monthName: 'Oct', formatted: 'Saturday, Oct 17', dateObj: new Date() },
  { dayKey: 'sun', dateStr: '2026-10-18', dayName: 'Sunday', shortName: 'Sun', dayOfMonth: 18, monthName: 'Oct', formatted: 'Sunday, Oct 18', dateObj: new Date() },
];

describe('Recurring Shifts Service (Single Day Mode)', () => {
  const testUid = 'user_test_123';

  beforeAll(() => {
    let store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true
    });
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('saves recurring rule for a single day at a time', () => {
    const rule = saveRecurringRule(testUid, {
      type: 'college',
      days: ['mon'],
      customHours: '10:00 AM – 3:00 PM'
    });

    expect(rule.id).toBeDefined();
    const all = getRecurringRules(testUid);
    expect(all).toHaveLength(1);
    expect(all[0].type).toBe('college');
    expect(all[0].days).toEqual(['mon']);
  });

  it('updates existing rule if adding for the same day again', () => {
    // First save: Monday Work 9-5
    saveRecurringRule(testUid, {
      type: 'work',
      days: ['mon'],
      customHours: '9:00 AM – 5:00 PM'
    });

    // Update: Monday College 10-3
    saveRecurringRule(testUid, {
      type: 'college',
      days: ['mon'],
      customHours: '10:00 AM – 3:00 PM'
    });

    const all = getRecurringRules(testUid);
    expect(all).toHaveLength(1);
    expect(all[0].type).toBe('college');
    expect(all[0].customHours).toBe('10:00 AM – 3:00 PM');
  });

  it('allows different days to be added sequentially', () => {
    saveRecurringRule(testUid, {
      type: 'work',
      days: ['mon'],
      customHours: '9:00 AM – 5:00 PM'
    });
    saveRecurringRule(testUid, {
      type: 'college',
      days: ['tue'],
      customHours: '10:00 AM – 3:00 PM'
    });

    const all = getRecurringRules(testUid);
    expect(all).toHaveLength(2);
  });

  it('automatically applies recurring rules to empty days', () => {
    const rules = [
      {
        id: 'r1',
        type: 'work' as const,
        days: ['mon'] as const,
        customHours: '9:00 AM – 5:30 PM'
      }
    ];

    const result = applyRecurringRules(undefined, rules as any, mockWeekDays);

    expect(result.mon).toBeDefined();
    expect(result.mon.status).toBe('work');
    expect(result.mon.isRecurring).toBe(true);

    // Tuesday had no rule
    expect(result.tue).toBeUndefined();
  });

  it('preserves manual overrides over recurring templates', () => {
    const rules = [
      {
        id: 'r1',
        type: 'work' as const,
        days: ['mon'] as const,
        customHours: '9:00 AM – 5:30 PM'
      }
    ];

    const manualDays: Record<string, DayShiftData> = {
      mon: {
        date: '2026-10-12',
        dayOfWeek: 'mon',
        status: 'free',
        customHours: '100% Free',
        isRecurring: false
      }
    };

    const result = applyRecurringRules(manualDays, rules as any, mockWeekDays);
    expect(result.mon.status).toBe('free');
    expect(result.mon.isRecurring).toBe(false);
  });

  it('deletes recurring rules properly', () => {
    const rule = saveRecurringRule(testUid, {
      type: 'work',
      days: ['sat'],
      customHours: '10:00 AM – 4:00 PM'
    });

    expect(getRecurringRules(testUid)).toHaveLength(1);

    deleteRecurringRule(testUid, rule.id);
    expect(getRecurringRules(testUid)).toHaveLength(0);
  });
});

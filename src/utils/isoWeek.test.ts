import { describe, it, expect } from 'vitest';
import { 
  getISOWeekDetails, 
  getISOWeekId, 
  getWeekDays, 
  getAdjacentWeek, 
  formatWeekRange 
} from './isoWeek';

describe('ISO Week Utilities', () => {
  it('correctly calculates ISO week for specific dates', () => {
    // 2026-10-14 is Wednesday of Week 42
    const date = new Date(Date.UTC(2026, 9, 14));
    const details = getISOWeekDetails(date);
    expect(details.year).toBe(2026);
    expect(details.weekNumber).toBe(42);
    expect(getISOWeekId(date)).toBe('2026-W42');
  });

  it('generates exactly 7 days starting from Monday', () => {
    const days = getWeekDays('2026-W42');
    expect(days).toHaveLength(7);
    expect(days[0].dayKey).toBe('mon');
    expect(days[0].shortName).toBe('Mon');
    expect(days[0].dateStr).toBe('2026-10-12');

    expect(days[6].dayKey).toBe('sun');
    expect(days[6].shortName).toBe('Sun');
    expect(days[6].dateStr).toBe('2026-10-18');
  });

  it('navigates weeks forwards and backwards', () => {
    expect(getAdjacentWeek('2026-W42', 1)).toBe('2026-W43');
    expect(getAdjacentWeek('2026-W42', -1)).toBe('2026-W41');
  });

  it('formats week ranges cleanly', () => {
    expect(formatWeekRange('2026-W42')).toBe('Oct 12 – 18');
  });
});

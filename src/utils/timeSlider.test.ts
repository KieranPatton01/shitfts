import { describe, it, expect } from 'vitest';
import { formatHourToString, formatTimeRange, decimalToTimeRange } from './timeSlider';

describe('Time Slider Utilities', () => {
  it('formats decimal hours into AM/PM strings', () => {
    expect(formatHourToString(9)).toBe('9:00 AM');
    expect(formatHourToString(9.5)).toBe('9:30 AM');
    expect(formatHourToString(12)).toBe('12:00 PM');
    expect(formatHourToString(17.5)).toBe('5:30 PM');
    expect(formatHourToString(0)).toBe('12:00 AM');
  });

  it('formats time ranges correctly', () => {
    expect(formatTimeRange(9, 17.5)).toBe('9:00 AM – 5:30 PM');
    expect(formatTimeRange(12, 20.5)).toBe('12:00 PM – 8:30 PM');
  });

  it('converts decimals to TimeRange objects', () => {
    const range = decimalToTimeRange(9.5, 17.25);
    expect(range.startHour).toBe(9);
    expect(range.startMinute).toBe(30);
    expect(range.endHour).toBe(17);
    expect(range.endMinute).toBe(15);
  });
});

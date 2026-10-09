import { describe, it, expect } from 'vitest';
import { formatHoursShort } from './shiftDisplay';

describe('formatHoursShort', () => {
  it('compacts standard ranges', () => {
    expect(formatHoursShort('9:00 AM – 5:30 PM')).toBe('9am–5:30pm');
    expect(formatHoursShort('2:00 PM – 10:00 PM')).toBe('2pm–10pm');
  });

  it('drops the overnight suffix', () => {
    expect(formatHoursShort('10:00 PM – 6:00 AM (Overnight)')).toBe('10pm–6am');
  });

  it('handles legacy short format', () => {
    expect(formatHoursShort('9:00A – 5:30P')).toBe('9am–5:30pm');
  });

  it('hides non-time labels', () => {
    expect(formatHoursShort('All Day')).toBe('');
    expect(formatHoursShort('Committed')).toBe('');
    expect(formatHoursShort(undefined)).toBe('');
  });

  it('passes OCR 24h ranges through', () => {
    expect(formatHoursShort('09:00 – 17:30')).toBe('09–17:30');
  });
});

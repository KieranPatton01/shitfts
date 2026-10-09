import { describe, it, expect } from 'vitest';
import { 
  isValid24hTime, 
  format24hTo12h, 
  validateAndFormatTimeRange, 
  sanitizeTimePreset 
} from './timeValidation';

describe('Time Validation and Sanitization', () => {
  describe('isValid24hTime', () => {
    it('accepts valid 24h clock strings', () => {
      expect(isValid24hTime('00:00')).toBe(true);
      expect(isValid24hTime('09:30')).toBe(true);
      expect(isValid24hTime('12:00')).toBe(true);
      expect(isValid24hTime('23:59')).toBe(true);
    });

    it('rejects invalid or malformed times', () => {
      expect(isValid24hTime('24:00')).toBe(false);
      expect(isValid24hTime('25:15')).toBe(false);
      expect(isValid24hTime('12:60')).toBe(false);
      expect(isValid24hTime('99:99')).toBe(false);
      expect(isValid24hTime('-01:00')).toBe(false);
      expect(isValid24hTime('abc')).toBe(false);
      expect(isValid24hTime('')).toBe(false);
    });
  });

  describe('format24hTo12h', () => {
    it('formats 24h into canonical 12h AM/PM strings', () => {
      expect(format24hTo12h('00:00')).toBe('12:00 AM');
      expect(format24hTo12h('09:05')).toBe('9:05 AM');
      expect(format24hTo12h('12:00')).toBe('12:00 PM');
      expect(format24hTo12h('14:30')).toBe('2:30 PM');
      expect(format24hTo12h('23:45')).toBe('11:45 PM');
    });

    it('throws on invalid input', () => {
      expect(() => format24hTo12h('invalid')).toThrow();
    });
  });

  describe('validateAndFormatTimeRange', () => {
    it('validates and formats daytime shift ranges', () => {
      const result = validateAndFormatTimeRange('09:00', '17:30');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('9:00 AM – 5:30 PM');
      expect(result.durationHours).toBe(8.5);
    });

    it('handles overnight shifts properly', () => {
      const result = validateAndFormatTimeRange('22:00', '06:00');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('10:00 PM – 6:00 AM (Overnight)');
      expect(result.durationHours).toBe(8);
    });

    it('rejects identical start and end times', () => {
      const result = validateAndFormatTimeRange('09:00', '09:00');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be identical');
    });

    it('rejects invalid time components', () => {
      const result1 = validateAndFormatTimeRange('bad', '17:00');
      expect(result1.isValid).toBe(false);

      const result2 = validateAndFormatTimeRange('09:00', '99:00');
      expect(result2.isValid).toBe(false);
    });
  });

  describe('sanitizeTimePreset', () => {
    it('preserves valid keywords and formatted ranges', () => {
      expect(sanitizeTimePreset('100% Free')).toBe('100% Free');
      expect(sanitizeTimePreset('All Day')).toBe('All Day');
      expect(sanitizeTimePreset('9:00 AM – 5:30 PM')).toBe('9:00 AM – 5:30 PM');
      expect(sanitizeTimePreset('10:00 AM – 3:00 PM')).toBe('10:00 AM – 3:00 PM');
    });

    it('sanitizes and replaces invalid/gibberish strings with safe fallback', () => {
      expect(sanitizeTimePreset('hacker<script>')).toBe('9:00 AM – 5:30 PM');
      expect(sanitizeTimePreset('asdfghjkl')).toBe('9:00 AM – 5:30 PM');
      expect(sanitizeTimePreset('99:99 - 100:00')).toBe('9:00 AM – 5:30 PM');
    });
  });
});

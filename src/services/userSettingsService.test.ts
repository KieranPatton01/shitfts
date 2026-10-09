import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  parseHoursInput,
  getUserSettings,
  saveUserSettings,
  validateAndSanitizeHoursInput,
  DEFAULT_USER_SETTINGS
} from './userSettingsService';

describe('userSettingsService', () => {
  beforeAll(() => {
    let store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    global.localStorage = mockStorage as any;
  });

  beforeEach(() => {
    localStorage.clear();
  });

  describe('validateAndSanitizeHoursInput', () => {
    it('rejects arbitrary text like "hello", "foo", "random"', () => {
      expect(validateAndSanitizeHoursInput('hello').isValid).toBe(false);
      expect(validateAndSanitizeHoursInput('foo').isValid).toBe(false);
      expect(validateAndSanitizeHoursInput('random text').isValid).toBe(false);
      expect(validateAndSanitizeHoursInput('').isValid).toBe(false);
    });

    it('rejects invalid numbers like "25:99 - 30:00" and identical times', () => {
      expect(validateAndSanitizeHoursInput('25:99').isValid).toBe(false);
      expect(validateAndSanitizeHoursInput('9:00 - 9:00').isValid).toBe(false);
    });

    it('validates and sanitizes standard formats', () => {
      const res1 = validateAndSanitizeHoursInput('9-5:30');
      expect(res1.isValid).toBe(true);
      expect(res1.formatted).toBe('9:00 AM – 5:30 PM');
      expect(res1.short).toBe('9–5:30');

      const res2 = validateAndSanitizeHoursInput('9-12:30');
      expect(res2.isValid).toBe(true);
      expect(res2.formatted).toBe('9:00 AM – 12:30 PM');
      expect(res2.short).toBe('9–12:30');

      const res3 = validateAndSanitizeHoursInput('All Day');
      expect(res3.isValid).toBe(true);
      expect(res3.formatted).toBe('All Day');
      expect(res3.short).toBe('All Day');
    });
  });

  describe('parseHoursInput', () => {
    it('parses typical college hours like 9-5:30', () => {
      const res = parseHoursInput('9-5:30');
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe('9:00 AM – 5:30 PM');
      expect(res.short).toBe('9–5:30');
    });

    it('parses typical work hours like 9-12:30', () => {
      const res = parseHoursInput('9-12:30');
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe('9:00 AM – 12:30 PM');
      expect(res.short).toBe('9–12:30');
    });

    it('parses 10-3', () => {
      const res = parseHoursInput('10-3');
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe('10:00 AM – 3:00 PM');
      expect(res.short).toBe('10–3');
    });

    it('parses 8-4', () => {
      const res = parseHoursInput('8-4');
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe('8:00 AM – 4:00 PM');
      expect(res.short).toBe('8–4');
    });

    it('handles All Day', () => {
      const res = parseHoursInput('All Day');
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe('All Day');
      expect(res.short).toBe('All Day');
    });

    it('rejects invalid text and returns fallback with isValid=false', () => {
      const res = parseHoursInput('invalid text');
      expect(res.isValid).toBe(false);
      expect(res.formatted).toBe(DEFAULT_USER_SETTINGS.typicalCollegeHours);
    });
  });

  describe('getUserSettings and saveUserSettings', () => {
    it('returns default settings when not saved', () => {
      const settings = getUserSettings('user1');
      expect(settings.setupCompleted).toBe(false);
      expect(settings.typicalCollegeHours).toBe(DEFAULT_USER_SETTINGS.typicalCollegeHours);
      expect(settings.typicalWorkHours).toBe(DEFAULT_USER_SETTINGS.typicalWorkHours);
    });

    it('saves and retrieves updated settings', async () => {
      await saveUserSettings('user1', {
        typicalCollegeHours: '10:00 AM – 3:00 PM',
        typicalCollegeShort: '10–3',
        typicalWorkHours: '9:00 AM – 1:00 PM',
        typicalWorkShort: '9–1',
        setupCompleted: true,
      });

      const loaded = getUserSettings('user1');
      expect(loaded.setupCompleted).toBe(true);
      expect(loaded.typicalCollegeShort).toBe('10–3');
      expect(loaded.typicalWorkShort).toBe('9–1');
    });
  });
});

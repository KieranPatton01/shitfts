import { describe, it, expect } from 'vitest';
import { computeSynergy } from './synergyEngine';
import { DayKey, DayShiftData } from '../types';

describe('Synergy Engine & Witty Calculations', () => {
  it('detects Golden Windows when both partners are free', () => {
    const scheduleA: Record<DayKey, DayShiftData> = {
      mon: { date: '2026-10-12', dayOfWeek: 'mon', status: 'free' },
      tue: { date: '2026-10-13', dayOfWeek: 'tue', status: 'work' },
      wed: { date: '2026-10-14', dayOfWeek: 'wed', status: 'free' },
      thu: { date: '2026-10-15', dayOfWeek: 'thu', status: 'busy' },
      fri: { date: '2026-10-16', dayOfWeek: 'fri', status: 'free' },
      sat: { date: '2026-10-17', dayOfWeek: 'sat', status: 'free' },
      sun: { date: '2026-10-18', dayOfWeek: 'sun', status: 'free' }
    };

    const scheduleB: Record<DayKey, DayShiftData> = {
      mon: { date: '2026-10-12', dayOfWeek: 'mon', status: 'work' },
      tue: { date: '2026-10-13', dayOfWeek: 'tue', status: 'work' },
      wed: { date: '2026-10-14', dayOfWeek: 'wed', status: 'free' },
      thu: { date: '2026-10-15', dayOfWeek: 'thu', status: 'work' },
      fri: { date: '2026-10-16', dayOfWeek: 'fri', status: 'college' },
      sat: { date: '2026-10-17', dayOfWeek: 'sat', status: 'free' },
      sun: { date: '2026-10-18', dayOfWeek: 'sun', status: 'free' }
    };

    const result = computeSynergy(scheduleA, scheduleB, 'Kieran', 'Elena');

    // Wed, Sat, Sun are all Golden Windows
    expect(result.goldenDays).toEqual(['wed', 'sat', 'sun']);
    expect(result.goldenCount).toBe(3);
    expect(result.mutualHours).toBeGreaterThan(30);
    expect(result.dayAlignments.wed.tier).toBe('golden');
    expect(result.dayAlignments.thu.tier).toBe('blackout');

    // Witty mode copy test
    expect(result.wittyHeadline).toContain('Trapped Together');
    expect(result.wittyExcusesLeft).toBe('0 left');
  });

  it('handles partial evening alignment when both work daytime shifts', () => {
    const scheduleA: Record<DayKey, DayShiftData> = {
      mon: { date: '2026-10-12', dayOfWeek: 'mon', status: 'work', customHours: '9:00A – 5:00P' }
    } as any;

    const scheduleB: Record<DayKey, DayShiftData> = {
      mon: { date: '2026-10-12', dayOfWeek: 'mon', status: 'work', customHours: '8:00A – 4:00P' }
    } as any;

    const result = computeSynergy(scheduleA, scheduleB, 'Kieran', 'Elena');
    expect(result.dayAlignments.mon.tier).toBe('evening');
    expect(result.dayAlignments.mon.badgeLabel).toBe('Evening Free');
  });
});

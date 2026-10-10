import { describe, it, expect } from 'vitest';
import { pickPartner, findScheduleKey, getScheduleDays, MemberProfile } from './memberService';
import { WeekDocument } from '../types';

const week = (names: string[]): WeekDocument => ({
  id: '2026-W41',
  coupleId: 'shared',
  members: [],
  year: 2026,
  weekNumber: 41,
  startDate: '2026-10-05',
  endDate: '2026-10-11',
  schedules: Object.fromEntries(
    names.map(n => [n, { submitted: false, submittedAt: null, lastUpdatedAt: 0, days: { mon: { status: 'free' } } as any }])
  )
});

describe('memberService', () => {
  const me: MemberProfile = { uid: 'u1', scheduleName: 'Kieran' };
  const partner: MemberProfile = { uid: 'u2', scheduleName: 'Elena' };

  it('picks the other registered user, never me', () => {
    expect(pickPartner([me, partner], 'u1', 'Kieran', [])?.uid).toBe('u2');
    expect(pickPartner([me], 'u1', 'Kieran', [])).toBeNull();
  });

  it('ignores another account using my name', () => {
    const dupe: MemberProfile = { uid: 'u3', scheduleName: 'kieran' };
    expect(pickPartner([me, dupe], 'u1', 'Kieran', [])).toBeNull();
  });

  it('prefers the user who has shifts in loaded weeks when several exist', () => {
    const stale: MemberProfile = { uid: 'u3', scheduleName: 'Test', lastSeenAt: 999 };
    expect(pickPartner([me, stale, partner], 'u1', 'Kieran', [week(['Elena'])])?.uid).toBe('u2');
  });

  it('falls back to most recently active user', () => {
    const older: MemberProfile = { uid: 'u3', scheduleName: 'Test', lastSeenAt: 1 };
    const newer: MemberProfile = { uid: 'u2', scheduleName: 'Elena', lastSeenAt: 5 };
    expect(pickPartner([me, older, newer], 'u1', 'Kieran', [])?.uid).toBe('u2');
  });

  it('finds schedule keys case/whitespace-insensitively', () => {
    const w = week(['Elena ']);
    expect(findScheduleKey(w, 'elena')).toBe('Elena ');
    expect(getScheduleDays(w, 'ELENA')?.mon?.status).toBe('free');
    expect(getScheduleDays(w, 'Nobody')).toBeUndefined();
  });
});

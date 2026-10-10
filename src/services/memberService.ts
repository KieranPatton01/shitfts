import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebase';
import { RecurringShiftRule, WeekDocument, DayKey, DayShiftData } from '../types';

/**
 * Public profile of an app user, read from `users/{uid}`.
 * `scheduleName` is the key that user's shifts are stored under in `weeks/{id}.schedules`.
 */
export interface MemberProfile {
  uid: string;
  scheduleName: string;
  /** undefined = this user's device has never synced its weekly pattern */
  recurringRules?: RecurringShiftRule[];
  lastSeenAt?: number;
}

function deriveScheduleName(data: Record<string, any>): string {
  if (typeof data.scheduleName === 'string' && data.scheduleName.trim()) return data.scheduleName.trim();
  if (typeof data.displayName === 'string' && data.displayName.trim()) return data.displayName.trim();
  if (typeof data.email === 'string' && data.email.includes('@')) {
    const raw = data.email.split('@')[0];
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return '';
}

/**
 * Records the name this user's shifts are saved under, so the partner's device
 * can find them reliably (even after a rename).
 */
export async function publishMyProfile(uid: string, scheduleName: string): Promise<void> {
  if (!isFirebaseConfigured || !uid || auth.currentUser?.uid !== uid) return;
  try {
    await setDoc(
      doc(db, 'users', uid),
      { scheduleName, lastSeenAt: Date.now() },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to publish profile:', err);
  }
}

/** Live list of every user profile. Returns an empty list in local mock mode. */
export function subscribeToMembers(onUpdate: (members: MemberProfile[]) => void): () => void {
  if (!isFirebaseConfigured) {
    onUpdate([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'users'),
    snap => {
      const members: MemberProfile[] = snap.docs
        .map(d => {
          const data = d.data();
          return {
            uid: d.id,
            scheduleName: deriveScheduleName(data),
            recurringRules: Array.isArray(data.recurringRules) ? data.recurringRules : undefined,
            lastSeenAt: typeof data.lastSeenAt === 'number' ? data.lastSeenAt : undefined
          };
        })
        .filter(m => m.scheduleName);
      onUpdate(members);
    },
    err => console.error('Members listener error:', err)
  );
}

/** Case/whitespace-insensitive lookup of a schedule key in a week document. */
export function findScheduleKey(weekDoc: WeekDocument | null | undefined, name: string): string | undefined {
  const schedules = weekDoc?.schedules;
  if (!schedules || !name) return undefined;
  if (schedules[name]) return name;
  const target = name.trim().toLowerCase();
  return Object.keys(schedules).find(k => k.trim().toLowerCase() === target);
}

export function getScheduleDays(
  weekDoc: WeekDocument | null | undefined,
  name: string
): Record<DayKey, DayShiftData> | undefined {
  const key = findScheduleKey(weekDoc, name);
  return key ? weekDoc!.schedules[key]?.days : undefined;
}

/**
 * Picks the partner from the list of registered users.
 * Preference: someone who has shifts in the loaded weeks → most recently active → first.
 */
export function pickPartner(
  members: MemberProfile[],
  myUid: string,
  myName: string,
  loadedWeeks: WeekDocument[]
): MemberProfile | null {
  const me = myName.trim().toLowerCase();
  const others = members.filter(m => m.uid !== myUid && m.scheduleName.trim().toLowerCase() !== me);
  if (others.length === 0) return null;
  if (others.length === 1) return others[0];

  const withShifts = others.filter(m => loadedWeeks.some(w => findScheduleKey(w, m.scheduleName)));
  const pool = withShifts.length > 0 ? withShifts : others;
  return [...pool].sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0))[0];
}

import { doc, setDoc } from 'firebase/firestore';
import { RecurringShiftRule, DayKey, DayShiftData } from '../types';
import { DayInfo } from '../utils/isoWeek';
import { db, auth, isFirebaseConfigured } from './firebase';

const RECURRING_STORAGE_PREFIX = 'shitfts_recurring_rules_';
const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('shitfts_sync_channel') : null;

export function getRecurringRules(uid: string): RecurringShiftRule[] {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(`${RECURRING_STORAGE_PREFIX}${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load recurring rules:', err);
    return [];
  }
}

/**
 * Pushes a user's recurring rules to Firestore (`users/{uid}.recurringRules`)
 * so their partner's device can apply them too. No-op in local mock mode.
 */
export async function syncRecurringRulesToCloud(uid: string, rules: RecurringShiftRule[]): Promise<void> {
  if (!isFirebaseConfigured || !uid || auth.currentUser?.uid !== uid) return;
  try {
    await setDoc(doc(db, 'users', uid), { recurringRules: rules }, { merge: true });
  } catch (err) {
    console.warn('Failed to sync recurring rules to Firestore:', err);
  }
}

/**
 * Replaces the locally cached rules with the copy from the cloud
 * (used when the same account signs in on another device).
 */
export function cacheRecurringRulesLocally(uid: string, rules: RecurringShiftRule[]): void {
  if (!uid) return;
  localStorage.setItem(`${RECURRING_STORAGE_PREFIX}${uid}`, JSON.stringify(rules));
}

export function saveRecurringRule(
  uid: string,
  ruleData: Omit<RecurringShiftRule, 'id'>
): RecurringShiftRule {
  const existing = getRecurringRules(uid);
  const targetDay = ruleData.days[0];

  // Remove any previous rule for this day to enforce 1 recurring shift per day
  const filtered = existing.filter(r => !r.days.includes(targetDay));

  const newRule: RecurringShiftRule = {
    ...ruleData,
    id: `rec_${targetDay}_${Date.now()}`
  };

  const updated = [...filtered, newRule];
  localStorage.setItem(`${RECURRING_STORAGE_PREFIX}${uid}`, JSON.stringify(updated));
  void syncRecurringRulesToCloud(uid, updated);

  broadcast?.postMessage({
    type: 'RECURRING_UPDATED',
    uid
  });

  return newRule;
}

export function deleteRecurringRule(uid: string, ruleId: string): void {
  const existing = getRecurringRules(uid);
  const updated = existing.filter(r => r.id !== ruleId);
  localStorage.setItem(`${RECURRING_STORAGE_PREFIX}${uid}`, JSON.stringify(updated));
  void syncRecurringRulesToCloud(uid, updated);

  broadcast?.postMessage({
    type: 'RECURRING_UPDATED',
    uid
  });
}

/**
 * Applies recurring rules to a user's schedule.
 * If a day has no manual entry, the recurring rule fills it in automatically.
 */
export function applyRecurringRules(
  currentDays: Record<DayKey, DayShiftData> | undefined,
  rules: RecurringShiftRule[],
  weekDays: DayInfo[]
): Record<DayKey, DayShiftData> {
  const result: Record<string, DayShiftData> = { ...(currentDays || {}) };

  // For each day in the week
  weekDays.forEach((dayInfo) => {
    const existing = result[dayInfo.dayKey];

    // If day was manually set (not by recurring), leave it alone!
    if (existing && existing.status && !existing.isRecurring) {
      return;
    }

    // Find any recurring rule that applies to this day
    const matchingRule = rules.find(r => r.days.includes(dayInfo.dayKey));

    if (matchingRule) {
      result[dayInfo.dayKey] = {
        date: dayInfo.dateStr,
        dayOfWeek: dayInfo.dayKey,
        status: matchingRule.type,
        customHours: matchingRule.customHours,
        isRecurring: true
      };
    } else if (existing?.isRecurring) {
      // If a rule was deleted or no longer applies, clear the recurring flag/status
      delete result[dayInfo.dayKey];
    }
  });

  return result as Record<DayKey, DayShiftData>;
}

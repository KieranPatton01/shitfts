import { doc, setDoc } from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebase';

export interface UserSettings {
  typicalCollegeHours: string; // e.g. "9:00 AM – 5:30 PM"
  typicalCollegeShort: string; // e.g. "9–5:30"
  typicalWorkHours: string;    // e.g. "9:00 AM – 12:30 PM"
  typicalWorkShort: string;    // e.g. "9–12:30"
  setupCompleted: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  typicalCollegeHours: '9:00 AM – 5:30 PM',
  typicalCollegeShort: '9–5:30',
  typicalWorkHours: '9:00 AM – 12:30 PM',
  typicalWorkShort: '9–12:30',
  setupCompleted: false,
};

import { validateAndSanitizeHoursInput, SanitizedHoursResult } from '../utils/timeValidation';
export { validateAndSanitizeHoursInput };
export type { SanitizedHoursResult };

const SETTINGS_KEY_PREFIX = 'shitfts_user_settings_';
const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('shitfts_sync_channel') : null;

/**
 * Parses user input like "9-5:30" or "9-12:30" or "9:00 AM - 5:30 PM"
 * into a standardized formatted time range and a compact pill label.
 * Strictly sanitizes and rejects invalid text strings.
 */
export function parseHoursInput(
  rawInput: string,
  fallback: { formatted: string; short: string } = { formatted: '9:00 AM – 5:30 PM', short: '9–5:30' }
): { formatted: string; short: string; isValid: boolean; error?: string } {
  const result = validateAndSanitizeHoursInput(rawInput);
  if (result.isValid) {
    return { formatted: result.formatted, short: result.short, isValid: true };
  }
  return { ...fallback, isValid: false, error: result.error };
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

/**
 * Loads user settings from localStorage (and syncs with defaults).
 */
export function getUserSettings(uid?: string): UserSettings {
  const key = `${SETTINGS_KEY_PREFIX}${uid || 'default'}`;
  try {
    const storage = getStorage();
    const raw = storage?.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        typicalCollegeHours: parsed.typicalCollegeHours || DEFAULT_USER_SETTINGS.typicalCollegeHours,
        typicalCollegeShort: parsed.typicalCollegeShort || DEFAULT_USER_SETTINGS.typicalCollegeShort,
        typicalWorkHours: parsed.typicalWorkHours || DEFAULT_USER_SETTINGS.typicalWorkHours,
        typicalWorkShort: parsed.typicalWorkShort || DEFAULT_USER_SETTINGS.typicalWorkShort,
        setupCompleted: Boolean(parsed.setupCompleted),
      };
    }
  } catch (err) {
    console.warn('Failed to load user settings from localStorage:', err);
  }
  return { ...DEFAULT_USER_SETTINGS };
}

/**
 * Saves user settings to localStorage and Firestore (if configured).
 */
export async function saveUserSettings(
  uid: string,
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const current = getUserSettings(uid);
  const updated: UserSettings = {
    ...current,
    ...settings,
  };

  const key = `${SETTINGS_KEY_PREFIX}${uid || 'default'}`;
  try {
    const storage = getStorage();
    storage?.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save settings to localStorage:', err);
  }

  if (isFirebaseConfigured && uid && auth.currentUser) {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        typicalCollegeHours: updated.typicalCollegeHours,
        typicalCollegeShort: updated.typicalCollegeShort,
        typicalWorkHours: updated.typicalWorkHours,
        typicalWorkShort: updated.typicalWorkShort,
        setupCompleted: updated.setupCompleted,
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to sync settings to Firestore:', err);
    }
  }

  broadcast?.postMessage({
    type: 'SETTINGS_UPDATED',
    uid,
    settings: updated,
  });

  return updated;
}

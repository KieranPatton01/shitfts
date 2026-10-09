import { ShiftType } from '../types';

export interface ShiftMeta {
  emoji: string;
  label: string;
  /** Pill classes for "my" cell */
  pill: string;
  /** Selected tile classes in the picker */
  tile: string;
  /** Default hours saved when first picked */
  defaultHours: string;
}

export const SHIFT_ORDER: ShiftType[] = ['free', 'work', 'college', 'busy'];

export const SHIFT_META: Record<ShiftType, ShiftMeta> = {
  free: {
    emoji: '☀️',
    label: 'Free',
    pill: 'bg-primary-fixed text-on-primary-fixed',
    tile: 'bg-primary text-on-primary border-primary',
    defaultHours: 'All Day'
  },
  work: {
    emoji: '🫩',
    label: 'Work',
    pill: 'bg-tertiary-fixed text-on-tertiary-fixed',
    tile: 'bg-tertiary text-on-tertiary border-tertiary',
    defaultHours: '9:00 AM – 5:30 PM'
  },
  college: {
    emoji: '🎓',
    label: 'College',
    pill: 'bg-secondary-fixed text-on-secondary-fixed',
    tile: 'bg-secondary text-on-secondary border-secondary',
    defaultHours: '10:00 AM – 3:00 PM'
  },
  busy: {
    emoji: '🚫',
    label: 'Busy',
    pill: 'bg-error-container text-on-error-container',
    tile: 'bg-error text-on-error border-error',
    defaultHours: 'Committed'
  }
};

/** The 4 standard time presets for Work (matching Initial Setup) */
export const STANDARD_WORK_PRESETS: { label: string; value: string }[] = [
  { label: '9–12:30', value: '9:00 AM – 12:30 PM' },
  { label: '9–5:30', value: '9:00 AM – 5:30 PM' },
  { label: '8–4', value: '8:00 AM – 4:00 PM' },
  { label: '2–10pm', value: '2:00 PM – 10:00 PM' }
];

/** The 4 standard time presets for College (matching Initial Setup) */
export const STANDARD_COLLEGE_PRESETS: { label: string; value: string }[] = [
  { label: '9–5:30', value: '9:00 AM – 5:30 PM' },
  { label: '10–3', value: '10:00 AM – 3:00 PM' },
  { label: '9–1', value: '9:00 AM – 1:00 PM' },
  { label: '8:30–4:30', value: '8:30 AM – 4:30 PM' }
];

/** Backward-compatible alias for work presets */
export const HOUR_PRESETS = STANDARD_WORK_PRESETS;

/** Labels that carry no real time info and shouldn't be shown as hours */
const NON_TIME_LABELS = ['100% free', 'all day', 'committed', 'classes', 'standard'];

/**
 * Compacts "9:00 AM – 5:30 PM" into "9am–5:30pm".
 * Returns '' for non-time labels like "All Day".
 */
export function formatHoursShort(hours?: string): string {
  if (!hours) return '';
  const trimmed = hours.trim();
  if (NON_TIME_LABELS.includes(trimmed.toLowerCase())) return '';
  return trimmed
    .replace(/\s*\(Overnight\)/i, '')
    .replace(/:00/g, '')
    .replace(/\s*([AP])M?\b/gi, (_m, p: string) => p.toLowerCase() + 'm')
    .replace(/\s*[–-]\s*/g, '–');
}

/** Today's local date as YYYY-MM-DD */
export function todayDateStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

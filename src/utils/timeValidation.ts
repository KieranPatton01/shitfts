/**
 * Time Validation and Sanitization Utilities
 * Enforces valid clock times, eliminates invalid inputs, and standardizes formats.
 */

export interface ValidatedTimeRangeResult {
  isValid: boolean;
  formatted: string;
  durationHours: number;
  error?: string;
}

/**
 * Validates a 24-hour time string in "HH:MM" format.
 */
export function isValid24hTime(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const match = timeStr.trim().match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
  return Boolean(match);
}

/**
 * Converts a valid 24-hour "HH:MM" string to a standardized 12-hour "H:MM AM/PM" string.
 * Example: "09:05" -> "9:05 AM", "14:30" -> "2:30 PM", "00:00" -> "12:00 AM"
 */
export function format24hTo12h(time24: string): string {
  if (!isValid24hTime(time24)) {
    throw new Error(`Invalid 24h time format: "${time24}". Expected HH:MM between 00:00 and 23:59.`);
  }

  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m.toString().padStart(2, '0');

  return `${displayH}:${displayM} ${period}`;
}

/**
 * Converts a 12-hour or 24-hour string to decimal minutes from midnight (0 to 1439).
 */
export function timeStringToMinutes(timeStr: string): number {
  const trimmed = timeStr.trim().toUpperCase();

  // Check 12h format: "9:30 AM" or "09:30 PM"
  const match12 = trimmed.match(/^([1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3];

    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  // Check 24h format: "09:30" or "14:00"
  const match24 = trimmed.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }

  throw new Error(`Unrecognized time string format: "${timeStr}"`);
}

/**
 * Validates and sanitizes a start time and end time into a clean canonical range.
 * Supports native HTML time inputs (<input type="time">).
 */
export function validateAndFormatTimeRange(start24: string, end24: string): ValidatedTimeRangeResult {
  if (!isValid24hTime(start24)) {
    return {
      isValid: false,
      formatted: '',
      durationHours: 0,
      error: 'Please enter a valid start time (between 00:00 and 23:59).'
    };
  }

  if (!isValid24hTime(end24)) {
    return {
      isValid: false,
      formatted: '',
      durationHours: 0,
      error: 'Please enter a valid end time (between 00:00 and 23:59).'
    };
  }

  const startMinutes = timeStringToMinutes(start24);
  const endMinutes = timeStringToMinutes(end24);

  if (startMinutes === endMinutes) {
    return {
      isValid: false,
      formatted: '',
      durationHours: 0,
      error: 'Start time and end time cannot be identical.'
    };
  }

  const startFormatted = format24hTo12h(start24);
  const endFormatted = format24hTo12h(end24);

  // Check for overnight shift (e.g. 21:00 to 06:00)
  const isOvernight = endMinutes < startMinutes;
  const durationMinutes = isOvernight 
    ? (1440 - startMinutes) + endMinutes 
    : endMinutes - startMinutes;

  const durationHours = Math.round((durationMinutes / 60) * 10) / 10;
  const formatted = isOvernight
    ? `${startFormatted} – ${endFormatted} (Overnight)`
    : `${startFormatted} – ${endFormatted}`;

  return {
    isValid: true,
    formatted,
    durationHours
  };
}

/**
 * Sanitizes any freeform or preset time range string, preventing malicious/garbage inputs.
 * If input is invalid, returns a safe standardized fallback.
 */
export function sanitizeTimePreset(raw: string): string {
  if (!raw || typeof raw !== 'string') return '9:00 AM – 5:30 PM';
  const clean = raw.trim();

  // Allowed simple keywords
  if (['100% Free', 'All Day', 'Committed', 'Classes'].includes(clean)) {
    return clean;
  }

  // Regex for standard ranges e.g. "9:00 AM – 5:30 PM" or "8:00A – 4:00P"
  const matchRange = clean.match(/^([1-9]|1[0-2]):([0-5][0-9])\s*([AP]M|[ap]m)?\s*[-–—to]\s*([1-9]|1[0-2]):([0-5][0-9])\s*([AP]M|[ap]m)?(?:\s*\(.*?\))?$/i);
  if (matchRange) {
    return clean;
  }

  // Fallback to safe default
  return '9:00 AM – 5:30 PM';
}

export interface SanitizedHoursResult {
  isValid: boolean;
  formatted: string;
  short: string;
  error?: string;
}

/**
 * Strictly validates and sanitizes any user-entered hours string.
 * Disallows arbitrary text (e.g. "hello", "foo") and enforces valid clock ranges.
 */
export function validateAndSanitizeHoursInput(rawInput: string): SanitizedHoursResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      isValid: false,
      formatted: '',
      short: '',
      error: 'Please enter a time range.'
    };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      isValid: false,
      formatted: '',
      short: '',
      error: 'Please enter a time range.'
    };
  }

  if (trimmed.toLowerCase() === 'all day') {
    return { isValid: true, formatted: 'All Day', short: 'All Day' };
  }

  // 1. Try parsing 24h format, e.g. "09:00 - 17:30"
  const match24 = trimmed.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])\s*[-–—to]\s*([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (match24) {
    const sH = parseInt(match24[1], 10);
    const sM = match24[2];
    const eH = parseInt(match24[3], 10);
    const eM = match24[4];

    if (sH === eH && sM === eM) {
      return { isValid: false, formatted: '', short: '', error: 'Start and end time cannot be identical.' };
    }

    const sPeriod = sH >= 12 ? 'PM' : 'AM';
    const sDisp = sH % 12 === 0 ? 12 : sH % 12;
    const ePeriod = eH >= 12 ? 'PM' : 'AM';
    const eDisp = eH % 12 === 0 ? 12 : eH % 12;

    const formatted = `${sDisp}:${sM} ${sPeriod} – ${eDisp}:${eM} ${ePeriod}`;
    const short = `${sDisp}${sM !== '00' ? `:${sM}` : ''}–${eDisp}${eM !== '00' ? `:${eM}` : ''}`;
    return { isValid: true, formatted, short };
  }

  // 2. Try parsing 12h format or shorthand (e.g. "9-5:30", "9:00 AM - 5:30 PM", "9am-12:30pm", "10-3")
  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)?\s*[-–—to]\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m)?$/i);
  if (match12) {
    let sH = parseInt(match12[1], 10);
    const sM = match12[2] ? parseInt(match12[2], 10) : 0;
    let sP = match12[3]?.toUpperCase();

    let eH = parseInt(match12[4], 10);
    const eM = match12[5] ? parseInt(match12[5], 10) : 0;
    let eP = match12[6]?.toUpperCase();

    // Bounds check
    if (sH < 0 || sH > 23 || sM < 0 || sM > 59 || eH < 0 || eH > 23 || eM < 0 || eM > 59) {
      return { isValid: false, formatted: '', short: '', error: 'Hours must be between 1 and 12 (or 00 to 23), and minutes between 00 and 59.' };
    }

    // Convert 24h numbers if > 12
    if (sH > 12) { sH -= 12; sP = 'PM'; }
    if (eH > 12) { eH -= 12; eP = 'PM'; }

    if (sH === 0) sH = 12;
    if (eH === 0) eH = 12;

    // Infer missing periods
    if (!sP) {
      if (sH >= 7 && sH <= 11) sP = 'AM';
      else if (sH === 12) sP = 'PM';
      else if (sH >= 1 && sH <= 6) sP = 'PM';
      else sP = 'AM';
    }

    if (!eP) {
      if (eH === 12) eP = 'PM';
      else if (eH >= 1 && eH <= 7) eP = 'PM';
      else if (eH >= 8 && eH <= 11 && sP === 'AM' && eH > sH) eP = 'AM';
      else eP = 'PM';
    }

    if (sH === eH && sM === eM && sP === eP) {
      return { isValid: false, formatted: '', short: '', error: 'Start and end time cannot be identical.' };
    }

    const sMStr = sM.toString().padStart(2, '0');
    const eMStr = eM.toString().padStart(2, '0');

    const formatted = `${sH}:${sMStr} ${sP} – ${eH}:${eMStr} ${eP}`;
    const short = `${sH}${sM !== 0 ? `:${sMStr}` : ''}–${eH}${eM !== 0 ? `:${eMStr}` : ''}`;
    return { isValid: true, formatted, short };
  }

  return {
    isValid: false,
    formatted: '',
    short: '',
    error: 'Please enter a valid time (e.g. 9-5:30 or 9:00 AM – 5:30 PM).'
  };
}

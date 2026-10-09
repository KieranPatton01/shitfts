import { DayKey, ShiftType } from '../types';

export interface ParsedShiftResult {
  dayKey: DayKey;
  status: ShiftType;
  hours?: string;
  rawMatched?: string;
}

const DAY_PATTERNS: { key: DayKey; regex: RegExp }[] = [
  { key: 'mon', regex: /\b(mon|monday)\b/i },
  { key: 'tue', regex: /\b(tue|tues|tuesday)\b/i },
  { key: 'wed', regex: /\b(wed|wednesday)\b/i },
  { key: 'thu', regex: /\b(thu|thur|thurs|thursday)\b/i },
  { key: 'fri', regex: /\b(fri|friday)\b/i },
  { key: 'sat', regex: /\b(sat|saturday)\b/i },
  { key: 'sun', regex: /\b(sun|sunday)\b/i },
];

/**
 * Parses raw OCR text extracted on-device from a rota photo/screenshot
 * and maps detected lines into day schedules.
 */
export function parseRotaText(ocrText: string): ParsedShiftResult[] {
  const lines = ocrText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const results: Record<DayKey, ParsedShiftResult> = {} as Record<DayKey, ParsedShiftResult>;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { key, regex } of DAY_PATTERNS) {
      if (regex.test(line)) {
        // Look in this line and up to 2 subsequent lines for times or shift keywords
        const contextLines = [line, lines[i + 1] || '', lines[i + 2] || ''].join(' ');

        // Check for Off/Free/Holiday
        if (/\b(off|free|holiday|annual\s*leave|al|rdo|rest)\b/i.test(contextLines)) {
          if (!results[key]) {
            results[key] = {
              dayKey: key,
              status: 'free',
              hours: '100% Free',
              rawMatched: line
            };
          }
          break;
        }

        // Check for College / Class
        if (/\b(college|class|uni|university|lecture|study)\b/i.test(contextLines)) {
          if (!results[key]) {
            results[key] = {
              dayKey: key,
              status: 'college',
              hours: 'Classes',
              rawMatched: line
            };
          }
          break;
        }

        // Check for Busy
        if (/\b(busy|committed|unavailable)\b/i.test(contextLines)) {
          if (!results[key]) {
            results[key] = {
              dayKey: key,
              status: 'busy',
              hours: 'Committed',
              rawMatched: line
            };
          }
          break;
        }

        // Check for Time ranges like 09:00 - 17:30, 9am - 5pm, 0900-1700
        const timeMatch = contextLines.match(
          /(\b[0-2]?\d[:.]\d\d(?:\s*[ap]m)?|\b[0-2]?\d[ap]m|\b[012]\d[0-5]\d)\s*(?:-|–|to)\s*([0-2]?\d[:.]\d\d(?:\s*[ap]m)?|\b[0-2]?\d[ap]m|\b[012]\d[0-5]\d)/i
        );

        if (timeMatch) {
          const startTime = cleanTimeToken(timeMatch[1]);
          const endTime = cleanTimeToken(timeMatch[2]);
          const formatted = `${startTime} – ${endTime}`;

          if (!results[key]) {
            results[key] = {
              dayKey: key,
              status: 'work',
              hours: formatted,
              rawMatched: timeMatch[0]
            };
          }
          break;
        }

        // If line just mentions day with generic shift / work mention
        if (/\b(work|shift|duty|on)\b/i.test(contextLines)) {
          if (!results[key]) {
            results[key] = {
              dayKey: key,
              status: 'work',
              hours: 'Standard',
              rawMatched: line
            };
          }
          break;
        }
      }
    }
  }

  return Object.values(results);
}

function cleanTimeToken(token: string): string {
  const trimmed = token.trim();
  // If 4-digit militay time like 0900 or 1730
  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed.slice(0, 2)}:${trimmed.slice(2)}`;
  }
  return trimmed.replace('.', ':');
}

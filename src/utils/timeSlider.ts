import { ShiftType, TimeRange } from '../types';

export interface ShiftPreset {
  id: string;
  name: string;
  type: ShiftType;
  startHour: number;   // 0 to 24 (can use half-hours e.g. 8.5 for 8:30)
  endHour: number;
  label: string;
}

export const SHIFT_PRESETS: Record<ShiftType, ShiftPreset[]> = {
  work: [
    { id: 'work-std', name: 'Standard Day', type: 'work', startHour: 9, endHour: 17.5, label: '9:00A – 5:30P' },
    { id: 'work-early', name: 'Early Shift', type: 'work', startHour: 7, endHour: 15.5, label: '7:00A – 3:30P' },
    { id: 'work-late', name: 'Afternoon / Late', type: 'work', startHour: 12, endHour: 20.5, label: '12:00P – 8:30P' },
    { id: 'work-night', name: 'Night Shift', type: 'work', startHour: 21, endHour: 30, label: '9:00P – 6:00A' }
  ],
  college: [
    { id: 'college-std', name: 'Core Lectures', type: 'college', startHour: 10, endHour: 15, label: '10:00A – 3:00P' },
    { id: 'college-morn', name: 'Morning Seminars', type: 'college', startHour: 9, endHour: 13, label: '9:00A – 1:00P' },
    { id: 'college-afternoon', name: 'Lab / Workshop', type: 'college', startHour: 13, endHour: 17, label: '1:00P – 5:00P' },
    { id: 'college-allday', name: 'Full Campus Day', type: 'college', startHour: 9, endHour: 17, label: '9:00A – 5:00P' }
  ],
  free: [
    { id: 'free-all', name: 'All Day Freedom', type: 'free', startHour: 0, endHour: 24, label: '100% Free' },
    { id: 'free-morning', name: 'Free Morning Only', type: 'free', startHour: 6, endHour: 13, label: 'Free Till 1:00P' },
    { id: 'free-evening', name: 'Free Evening Only', type: 'free', startHour: 17, endHour: 24, label: 'Free From 5:00P' }
  ],
  busy: [
    { id: 'busy-all', name: 'All Day Busy', type: 'busy', startHour: 8, endHour: 22, label: 'Committed' },
    { id: 'busy-morn', name: 'Morning Appointment', type: 'busy', startHour: 8, endHour: 12, label: '8:00A – 12:00P' },
    { id: 'busy-night', name: 'Evening Plans / Solo', type: 'busy', startHour: 18, endHour: 23, label: '6:00P – 11:00P' }
  ]
};

export function formatHourToString(hourDecimal: number): string {
  // Normalize 24h+
  const normalized = hourDecimal % 24;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);

  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m === 0 ? '00' : String(m).padStart(2, '0');

  return `${displayH}:${displayM} ${period}`;
}

export function formatTimeRange(startHour: number, endHour: number): string {
  return `${formatHourToString(startHour)} – ${formatHourToString(endHour)}`;
}

export function decimalToTimeRange(start: number, end: number): TimeRange {
  const sH = Math.floor(start % 24);
  const sM = Math.round(((start % 24) - sH) * 60);
  const eH = Math.floor(end % 24);
  const eM = Math.round(((end % 24) - eH) * 60);

  return {
    startHour: sH,
    startMinute: sM,
    endHour: eH,
    endMinute: eM
  };
}

export function timeRangeToDecimal(range: TimeRange): { start: number; end: number } {
  return {
    start: range.startHour + range.startMinute / 60,
    end: range.endHour + range.endMinute / 60
  };
}

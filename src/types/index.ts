export type ShiftType = 'work' | 'college' | 'free' | 'busy';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface TimeRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface DayShiftData {
  date: string;               // ISO Date "2026-10-14"
  dayOfWeek: DayKey;
  status: ShiftType;
  customHours?: string;       // e.g. "9:00 AM – 5:30 PM"
  timeRange?: TimeRange;      // granular slider support
  note?: string;              // e.g. "Can do dinner after 6:30 PM"
  isRecurring?: boolean;      // True if auto-populated from recurring rule
  updatedAt?: number | string;
}

export interface RecurringShiftRule {
  id: string;
  type: ShiftType;
  days: DayKey[];
  customHours: string;
}

export interface PartnerSchedule {
  ownerUid?: string;           // UID of the account that writes this schedule
  submitted: boolean;
  submittedAt: number | string | null;
  lastUpdatedAt: number | string;
  rotaImageUrl?: string;       // Screenshot of rota (base64 or storage URL)
  days: Record<DayKey, DayShiftData>;
}

export interface WeekDocument {
  id: string;                 // "2026-W42"
  coupleId: string;
  members: string[];          // [uidA, uidB]
  year: number;
  weekNumber: number;
  startDate: string;          // "2026-10-12" (Monday)
  endDate: string;            // "2026-10-18" (Sunday)
  rotaImages?: Record<string, string>; // [userName]: base64 or URL
  schedules: Record<string, PartnerSchedule>;
}

export type SynergyTier = 'golden' | 'evening' | 'offset' | 'blackout' | 'pending';

export interface DayAlignment {
  dayKey: DayKey;
  date: string;
  tier: SynergyTier;
  title: string;
  description: string;
  badgeLabel: string;
  mutualHours: number;
  wittyTitle?: string;
  wittyDescription?: string;
  wittyBadge?: string;
}

export interface SynergyResult {
  goldenDays: DayKey[];
  goldenCount: number;
  mutualHours: number;
  oppositeDaysCount: number;
  alignmentScore: number;
  dayAlignments: Record<DayKey, DayAlignment>;
  summaryText: string;
  wittyHeadline: string;
  wittySummary: string;
  wittyOverlapLabel: string;
  wittyOppositeLabel: string;
  wittyExcusesLeft: string;
}

export interface MemberDetail {
  displayName: string;
  photoURL?: string | null;
  initial: string;
}

export interface Couple {
  id: string;
  members: string[];
  memberDetails: Record<string, MemberDetail>;
  inviteCode: string;
  createdAt: number | string;
  currentWeekId?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  coupleId: string | null;
}

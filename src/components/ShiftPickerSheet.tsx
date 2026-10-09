import React, { useEffect, useState } from 'react';
import { DayKey, DayShiftData, ShiftType } from '../types';
import { DayInfo } from '../utils/isoWeek';
import {
  STANDARD_WORK_PRESETS,
  STANDARD_COLLEGE_PRESETS,
  SHIFT_META,
  SHIFT_ORDER,
  formatHoursShort
} from '../utils/shiftDisplay';
import { validateAndFormatTimeRange } from '../utils/timeValidation';
import { BottomSheet } from './BottomSheet';

interface ShiftPickerSheetProps {
  isOpen: boolean;
  dayIndex: number;
  days: DayInfo[];
  mySchedule?: Record<DayKey, DayShiftData>;
  partnerDays?: Record<DayKey, DayShiftData>;
  partnerName: string;
  isPaired: boolean;
  typicalCollegeHours?: string;
  typicalCollegeShort?: string;
  typicalWorkHours?: string;
  typicalWorkShort?: string;
  onSave: (dayKeys: DayKey[], status: ShiftType, hours: string) => Promise<void>;
  onChangeDay: (dayIndex: number) => void;
  onClose: () => void;
}

export const ShiftPickerSheet: React.FC<ShiftPickerSheetProps> = ({
  isOpen,
  dayIndex,
  days,
  mySchedule,
  partnerDays,
  partnerName,
  isPaired,
  typicalCollegeHours,
  typicalCollegeShort,
  typicalWorkHours,
  typicalWorkShort,
  onSave,
  onChangeDay,
  onClose
}) => {
  const day = days[dayIndex];
  const current = day ? mySchedule?.[day.dayKey] : undefined;

  const [pendingStatus, setPendingStatus] = useState<ShiftType | null>(null);
  const [pendingHours, setPendingHours] = useState<string | null>(null);
  const [extraDays, setExtraDays] = useState<DayKey[]>([]);
  const [showMulti, setShowMulti] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:30');
  const [error, setError] = useState<string | null>(null);

  // Reset per-day UI when the day changes or the sheet opens
  useEffect(() => {
    setPendingStatus(null);
    setPendingHours(null);
    setExtraDays([]);
    setShowMulti(false);
    setShowCustom(false);
    setError(null);
  }, [dayIndex, isOpen]);

  if (!day) return null;

  const activeStatus = pendingStatus || current?.status || null;
  const needsHours = activeStatus === 'work' || activeStatus === 'college' || activeStatus === 'busy';
  const targetDays: DayKey[] = [day.dayKey, ...extraDays.filter(k => k !== day.dayKey)];
  const partnerShift = partnerDays?.[day.dayKey];

  const advance = () => {
    onClose();
  };

  const save = async (status: ShiftType, hours: string, thenAdvance: boolean) => {
    setError(null);
    try {
      await onSave(targetDays, status, hours);
      if (thenAdvance) advance();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDone = async () => {
    if (activeStatus && extraDays.length > 0) {
      const hours =
        pendingHours ||
        current?.customHours ||
        (activeStatus === 'free' ? SHIFT_META.free.defaultHours : 'All Day');
      await save(activeStatus, hours, true);
    } else {
      onClose();
    }
  };

  const handlePickStatus = (status: ShiftType) => {
    if (status === 'free') {
      setPendingStatus('free');
      setPendingHours(SHIFT_META.free.defaultHours);
      void save('free', SHIFT_META.free.defaultHours, true);
      return;
    }
    // "there should also be an all day pill, this one should be the defualt pre selected one if no others are."
    const hours =
      current?.status === status && current.customHours ? current.customHours : 'All Day';
    setPendingStatus(status);
    setPendingHours(hours);
    void save(status, hours, false);
  };

  const hourPills = React.useMemo(() => {
    const list: { label: string; value: string }[] = [];

    // 1. All Day pill (default pre-selected if no others are)
    list.push({ label: 'All Day', value: 'All Day' });

    // 2. Typical hours for the active shift type
    if (activeStatus === 'work') {
      const workVal = typicalWorkHours || '9:00 AM – 12:30 PM';
      const workLabel = typicalWorkShort || '9–12:30';
      if (workVal !== 'All Day') {
        list.push({ label: workLabel, value: workVal });
      }
    } else if (activeStatus === 'college') {
      const colVal = typicalCollegeHours || '9:00 AM – 5:30 PM';
      const colLabel = typicalCollegeShort || '9–5:30';
      if (colVal !== 'All Day') {
        list.push({ label: colLabel, value: colVal });
      }
    }

    // 3. Standard presets (capped so total time pills = exactly 4)
    const fallbackPresets =
      activeStatus === 'college'
        ? STANDARD_COLLEGE_PRESETS
        : STANDARD_WORK_PRESETS;

    for (const p of fallbackPresets) {
      if (list.length >= 5) break; // 1 All Day + 4 time pills = 5 total
      if (!list.some(existing => existing.value === p.value || existing.label === p.label)) {
        list.push(p);
      }
    }

    return list;
  }, [activeStatus, typicalWorkHours, typicalWorkShort, typicalCollegeHours, typicalCollegeShort]);

  const isPillSelected = (pillValue: string) => {
    const activeHours =
      pendingHours ??
      (current?.status === activeStatus && current?.customHours ? current.customHours : 'All Day');
    if (activeHours === 'All Day') {
      return pillValue === 'All Day';
    }
    return (
      activeHours === pillValue ||
      formatHoursShort(activeHours) === formatHoursShort(pillValue)
    );
  };

  const handlePreset = (value: string) => {
    if (!activeStatus) return;
    setPendingHours(value);
    void save(activeStatus, value, true);
  };

  const handleCustom = () => {
    if (!activeStatus) return;
    const result = validateAndFormatTimeRange(start, end);
    if (!result.isValid) {
      setError(result.error || 'Invalid time range');
      return;
    }
    setPendingHours(result.formatted);
    void save(activeStatus, result.formatted, true);
  };

  const toggleExtra = (key: DayKey) => {
    setExtraDays(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const title = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChangeDay(dayIndex - 1)}
        disabled={dayIndex === 0}
        aria-label="Previous day"
        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-25"
      >
        ‹
      </button>
      <span>
        {day.dayName} {day.dayOfMonth}
      </span>
      <button
        onClick={() => onChangeDay(dayIndex + 1)}
        disabled={dayIndex === days.length - 1}
        aria-label="Next day"
        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-25"
      >
        ›
      </button>
    </div>
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      {isPaired && (
        <p className="text-xs text-on-surface-variant -mt-2 mb-4">
          {partnerName}:{' '}
          <strong className="text-on-surface">
            {partnerShift?.status
              ? `${SHIFT_META[partnerShift.status].emoji} ${SHIFT_META[partnerShift.status].label}${
                  partnerShift.status !== 'free' && formatHoursShort(partnerShift.customHours)
                    ? ` · ${formatHoursShort(partnerShift.customHours)}`
                    : ''
                }`
              : 'not set yet'}
          </strong>
        </p>
      )}

      {/* Status tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        {SHIFT_ORDER.map(status => {
          const meta = SHIFT_META[status];
          const selected = activeStatus === status;
          return (
            <button
              key={status}
              onClick={() => handlePickStatus(status)}
              className={`h-16 rounded-2xl border-2 font-headline font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                selected
                  ? `${meta.tile} shadow-sm`
                  : 'bg-surface-container-low border-transparent text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="text-xl">{meta.emoji}</span>
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Hours */}
      {needsHours && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface">Hours</span>
            {current?.status === activeStatus && (
              <span className="text-[11px] text-on-surface-variant">
                Now:{' '}
                <strong className="tabular-nums">
                  {current.customHours === 'All Day' || !current.customHours
                    ? 'All Day'
                    : formatHoursShort(current.customHours) || current.customHours}
                </strong>
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {hourPills.map(p => {
              const isCurrent = isPillSelected(p.value);
              return (
                <button
                  key={p.value}
                  onClick={() => handlePreset(p.value)}
                  className={`w-full h-11 rounded-2xl text-xs font-bold border transition-all active:scale-95 flex items-center justify-center px-1 text-center ${
                    isCurrent
                      ? 'bg-on-surface text-surface border-on-surface ring-2 ring-primary/20 shadow-xs'
                      : 'bg-surface-container-lowest border-surface-container-high text-on-surface hover:border-primary/50'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              onClick={() => setShowCustom(v => !v)}
              className={`w-full h-11 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center px-1 text-center ${
                showCustom
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface-container-lowest border-dashed border-outline-variant text-on-surface-variant'
              }`}
            >
              Custom…
            </button>
          </div>

          {showCustom && (
            <div className="mt-3 flex items-end gap-2">
              <label className="flex-1 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-outline">Start</span>
                <input
                  type="time"
                  value={start}
                  onChange={e => setStart(e.target.value)}
                  className="h-11 px-3 rounded-xl bg-surface-container-low border border-surface-container text-sm font-bold"
                />
              </label>
              <label className="flex-1 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-outline">End</span>
                <input
                  type="time"
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                  className="h-11 px-3 rounded-xl bg-surface-container-low border border-surface-container text-sm font-bold"
                />
              </label>
              <button
                onClick={handleCustom}
                className="h-11 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold active:scale-95"
              >
                Set
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 bg-error-container text-on-error-container px-3 py-2 rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Multi-day apply */}
      <div className="mt-5 pt-4 border-t border-surface-container">
        {!showMulti ? (
          <button
            onClick={() => setShowMulti(true)}
            className="text-xs font-bold text-primary flex items-center gap-1.5"
          >
            <span>📅</span>
            <span>Same shift on other days too…</span>
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-on-surface">Also apply to:</p>
              {extraDays.length > 0 && (
                <button
                  onClick={() => setExtraDays([])}
                  className="text-[11px] font-semibold text-outline hover:text-error"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map(d => {
                const isThis = d.dayKey === day.dayKey;
                const on = isThis || extraDays.includes(d.dayKey);
                return (
                  <button
                    key={d.dayKey}
                    disabled={isThis}
                    onClick={() => toggleExtra(d.dayKey)}
                    className={`h-10 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      on ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                    } ${isThis ? 'opacity-60 ring-2 ring-primary/30' : ''}`}
                  >
                    {d.shortName.charAt(0)}
                  </button>
                );
              })}
            </div>

            {extraDays.length > 0 ? (
              <p className="text-[11px] font-bold text-primary mt-2">
                Selected {targetDays.length} days. Tap below to apply.
              </p>
            ) : (
              <p className="text-[11px] text-outline mt-2">
                Tap days above to apply the same shift.
              </p>
            )}
          </div>
        )}
      </div>

      {(needsHours || extraDays.length > 0) && (
        <button
          onClick={handleDone}
          className="mt-4 w-full h-12 rounded-2xl bg-primary text-on-primary text-sm font-bold active:scale-[0.98] transition-all"
        >
          {extraDays.length > 0 && activeStatus
            ? `Apply ${SHIFT_META[activeStatus].label} to ${targetDays.length} days ›`
            : 'Done'}
        </button>
      )}
    </BottomSheet>
  );
};

import React, { useState, useEffect } from 'react';
import { ShiftType, DayKey, RecurringShiftRule } from '../types';
import { DAY_KEYS, DAY_NAMES, DAY_SHORT_NAMES } from '../utils/isoWeek';
import { 
  getRecurringRules, 
  saveRecurringRule, 
  deleteRecurringRule 
} from '../services/recurringService';
import { 
  validateAndFormatTimeRange, 
  sanitizeTimePreset 
} from '../utils/timeValidation';

interface RecurringShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  onRulesChanged: () => void;
}

const COMMON_TIME_PRESETS = [
  '9:00 AM – 5:30 PM',
  '8:00 AM – 4:00 PM',
  '10:00 AM – 3:00 PM',
  '12:00 PM – 8:30 PM',
  '9:00 AM – 1:00 PM',
  'Custom Time...'
];

export const RecurringShiftsModal: React.FC<RecurringShiftsModalProps> = ({
  isOpen,
  onClose,
  uid,
  onRulesChanged
}) => {
  const [rules, setRules] = useState<RecurringShiftRule[]>([]);
  const [shiftType, setShiftType] = useState<ShiftType>('work');
  // Multi-day selection: pick several days that share the same shift
  const [selectedDays, setSelectedDays] = useState<DayKey[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [timePreset, setTimePreset] = useState<string>('9:00 AM – 5:30 PM');
  
  // Structured custom time states (24h format enforced by <input type="time">)
  const [customStartTime, setCustomStartTime] = useState<string>('09:00');
  const [customEndTime, setCustomEndTime] = useState<string>('17:30');
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && uid) {
      setRules(getRecurringRules(uid));
      setTimeError(null);
    }
  }, [isOpen, uid]);

  if (!isOpen) return null;

  const isCustomTime = timePreset === 'Custom Time...';

  // Check if any selected day already has an existing rule
  const existingRuleForDay = rules.some(r => r.days.some(d => selectedDays.includes(d)));

  const toggleDay = (day: DayKey) => {
    setSelectedDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
    setTimeError(null);
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeError(null);

    if (selectedDays.length === 0) {
      setTimeError('Pick at least one day.');
      return;
    }

    let finalHours = '100% Free';

    if (shiftType !== 'free') {
      if (isCustomTime) {
        const validation = validateAndFormatTimeRange(customStartTime, customEndTime);
        if (!validation.isValid) {
          setTimeError(validation.error || 'Invalid time range.');
          return;
        }
        finalHours = validation.formatted;
      } else {
        finalHours = sanitizeTimePreset(timePreset);
      }
    }

    // One rule per day (service enforces a single recurring shift per day)
    for (const day of selectedDays) {
      saveRecurringRule(uid, {
        type: shiftType,
        days: [day],
        customHours: finalHours
      });
    }

    setRules(getRecurringRules(uid));
    setSelectedDays([]);
    onRulesChanged();
  };

  const handleDeleteRule = (ruleId: string) => {
    deleteRecurringRule(uid, ruleId);
    setRules(getRecurringRules(uid));
    onRulesChanged();
  };

  const customPreview = isCustomTime 
    ? validateAndFormatTimeRange(customStartTime, customEndTime)
    : null;

  // Sort rules chronologically Mon -> Sun
  const sortedRules = [...rules].sort((a, b) => {
    const dayA = a.days[0] || 'mon';
    const dayB = b.days[0] || 'mon';
    return DAY_KEYS.indexOf(dayA) - DAY_KEYS.indexOf(dayB);
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-xs" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-surface-container-lowest rounded-t-[28px] sm:rounded-3xl p-6 shadow-modal border border-surface-container-high flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔁</span>
            <div className="flex flex-col">
              <h2 className="font-headline font-extrabold text-base text-on-surface">
                Weekly pattern
              </h2>
              <span className="text-xs text-on-surface-variant">
                These shifts fill in automatically every week
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Validation Error Banner */}
        {timeError && (
          <div className="bg-error-container text-on-error-container px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{timeError}</span>
          </div>
        )}

        {/* Form: Add / Update Recurring Shift for one or more days */}
        <form onSubmit={handleAddRule} className="flex flex-col gap-4 bg-surface-container-low p-4 rounded-2xl border border-surface-container">
          {/* Days of the Week: Multi Select */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface">
                Which days?
              </label>
              {existingRuleForDay && (
                <span className="text-[11px] text-outline">replaces existing</span>
              )}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAY_KEYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                const hasExisting = rules.some(r => r.days.includes(day));

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`h-10 rounded-xl text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-surface-container'
                    }`}
                  >
                    <span>{DAY_SHORT_NAMES[day]}</span>
                    {hasExisting && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-primary absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dropdown: Event Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface">
              Event Type
            </label>
            <select
              value={shiftType}
              onChange={(e) => {
                const val = e.target.value as ShiftType;
                setShiftType(val);
                setTimeError(null);
                if (val === 'college') setTimePreset('10:00 AM – 3:00 PM');
                else if (val === 'work') setTimePreset('9:00 AM – 5:30 PM');
                else if (val === 'free') setTimePreset('All Day');
                else if (val === 'busy') setTimePreset('9:00 AM – 5:30 PM');
              }}
              className="w-full h-11 px-3 bg-surface-container-lowest border border-surface-container rounded-xl text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="work">🫩 Work</option>
              <option value="college">🎓 College</option>
              <option value="free">☀️ Free</option>
              <option value="busy">🚫 Busy</option>
            </select>
          </div>

          {/* Times Selection */}
          {shiftType !== 'free' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface">
                Times / Hours
              </label>
              <select
                value={timePreset}
                onChange={(e) => {
                  setTimePreset(e.target.value);
                  setTimeError(null);
                }}
                className="w-full h-11 px-3 bg-surface-container-lowest border border-surface-container rounded-xl text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {COMMON_TIME_PRESETS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Strict Structured Time Pickers for Custom Time */}
              {isCustomTime && (
                <div className="flex flex-col gap-2 pt-1 bg-surface-container-lowest/80 p-3 rounded-xl border border-surface-container">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-outline">Start Time:</span>
                      <input
                        type="time"
                        required
                        value={customStartTime}
                        onChange={(e) => {
                          setCustomStartTime(e.target.value);
                          setTimeError(null);
                        }}
                        className="h-10 px-2.5 bg-surface-container-low border border-surface-container rounded-lg text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-outline">End Time:</span>
                      <input
                        type="time"
                        required
                        value={customEndTime}
                        onChange={(e) => {
                          setCustomEndTime(e.target.value);
                          setTimeError(null);
                        }}
                        className="h-10 px-2.5 bg-surface-container-low border border-surface-container rounded-lg text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {customPreview?.isValid && (
                    <div className="flex items-center justify-between text-[11px] font-bold text-primary px-1 pt-1 border-t border-surface-container">
                      <span>✓ {customPreview.formatted}</span>
                      <span className="font-mono text-outline">{customPreview.durationHours} hrs</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={selectedDays.length === 0 || (isCustomTime && !customPreview?.isValid)}
            className="w-full h-11 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {selectedDays.length === 0
              ? 'Pick days above'
              : selectedDays.length === 1
                ? `Save for every ${DAY_NAMES[selectedDays[0]]}`
                : `Save for ${selectedDays.length} days every week`}
          </button>
        </form>

        {/* Existing Rules List */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-on-surface-variant">
            Active Weekly Routine ({sortedRules.length}/7 Days)
          </span>

          {sortedRules.length === 0 ? (
            <div className="text-xs text-outline italic text-center py-3 bg-surface-container-low rounded-xl">
              No recurring shifts set yet. Pick a day above to add one!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedRules.map((rule) => {
                const dayKey = rule.days[0] as DayKey;
                const dayName = DAY_NAMES[dayKey] || dayKey;

                return (
                  <div
                    key={rule.id}
                    className="p-3 bg-surface-container-low rounded-xl border border-surface-container flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">
                        {rule.type === 'work' ? '🫩' : rule.type === 'college' ? '🎓' : rule.type === 'free' ? '☀️' : '🚫'}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-on-surface">
                            {dayName}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-outline capitalize px-1.5 py-0.2 bg-surface-container rounded-md">
                            {rule.type}
                          </span>
                        </div>
                        <span className="text-[11px] text-on-surface-variant font-mono truncate">
                          {rule.customHours}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="w-7 h-7 flex items-center justify-center text-outline hover:text-error hover:bg-surface-container-highest rounded-full transition-colors text-xs font-bold shrink-0"
                      title={`Remove recurring shift for ${dayName}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-outline text-center leading-relaxed">
          💡 Need a one-off change? Just tap that day on the main screen. Your pattern stays the same.
        </p>
      </div>
    </div>
  );
};

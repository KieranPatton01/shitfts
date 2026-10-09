import React, { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { validateAndSanitizeHoursInput } from '../utils/timeValidation';
import { STANDARD_COLLEGE_PRESETS, STANDARD_WORK_PRESETS } from '../utils/shiftDisplay';

interface FirstTimeSetupModalProps {
  isOpen: boolean;
  initialCollege?: string;
  initialWork?: string;
  canClose?: boolean;
  onSave: (
    collegeHours: string,
    collegeShort: string,
    workHours: string,
    workShort: string
  ) => Promise<void>;
  onClose?: () => void;
}

export const FirstTimeSetupModal: React.FC<FirstTimeSetupModalProps> = ({
  isOpen,
  initialCollege = '9–5:30',
  initialWork = '9–12:30',
  canClose = false,
  onSave,
  onClose,
}) => {
  const [collegeInput, setCollegeInput] = useState(initialCollege);
  const [workInput, setWorkInput] = useState(initialWork);

  // Custom time picker states
  const [customCollege, setCustomCollege] = useState(false);
  const [collegeStart, setCollegeStart] = useState('09:00');
  const [collegeEnd, setCollegeEnd] = useState('17:30');

  const [customWork, setCustomWork] = useState(false);
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('12:30');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time validation and sanitization
  const collegeValidation = validateAndSanitizeHoursInput(collegeInput);
  const workValidation = validateAndSanitizeHoursInput(workInput);

  const handleCustomCollegeTime = (s: string, e: string) => {
    setCollegeStart(s);
    setCollegeEnd(e);
    const candidate = `${s} - ${e}`;
    const res = validateAndSanitizeHoursInput(candidate);
    if (res.isValid) {
      setCollegeInput(res.short);
    }
  };

  const handleCustomWorkTime = (s: string, e: string) => {
    setWorkStart(s);
    setWorkEnd(e);
    const candidate = `${s} - ${e}`;
    const res = validateAndSanitizeHoursInput(candidate);
    if (res.isValid) {
      setWorkInput(res.short);
    }
  };

  // Only allow valid time characters when typing (digits, colon, dash, spaces, am/pm)
  const sanitizeTypedTime = (raw: string) => {
    return raw.replace(/[^0-9:\-–—\sAPMapm]/g, '');
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!collegeValidation.isValid) {
      setError(`College hours: ${collegeValidation.error || 'Please enter a valid time (e.g. 9-5:30)'}`);
      return;
    }

    if (!workValidation.isValid) {
      setError(`Work hours: ${workValidation.error || 'Please enter a valid time (e.g. 9-12:30)'}`);
      return;
    }

    setSaving(true);
    try {
      await onSave(
        collegeValidation.formatted,
        collegeValidation.short,
        workValidation.formatted,
        workValidation.short
      );
      if (onClose) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hours');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = collegeValidation.isValid && workValidation.isValid;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={canClose && onClose ? onClose : () => {}}
      title={canClose ? 'Typical hours' : 'Quick schedule setup'}
    >
      <div className="flex flex-col gap-5 -mt-2">
        {!canClose && (
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Pick your typical schedule so logging work or college only takes a single tap.
          </p>
        )}

        {/* College Hours Section */}
        <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-surface-container-low border border-surface-container">
          <div className="flex items-center justify-between">
            <span className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span>🎓</span>
              <span>Typical college hours</span>
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-all ${
                collegeValidation.isValid
                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              {collegeValidation.isValid ? collegeValidation.short : 'Invalid time'}
            </span>
          </div>

          {/* Preset Pills (Exact 4 standard time pills + All Day + Custom) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setCollegeInput('All Day');
                setCustomCollege(false);
              }}
              className={`w-full h-10 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center px-1 text-center ${
                collegeInput.trim().toLowerCase() === 'all day'
                  ? 'bg-on-surface text-surface ring-2 ring-primary/20 shadow-xs'
                  : 'bg-surface-container-lowest border border-surface-container-high text-on-surface-variant hover:border-primary/50'
              }`}
            >
              All Day
            </button>
            {STANDARD_COLLEGE_PRESETS.map((preset) => {
              const active = collegeInput.trim() === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setCollegeInput(preset.label);
                    setCustomCollege(false);
                  }}
                  className={`w-full h-10 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center px-1 text-center ${
                    active
                      ? 'bg-on-surface text-surface ring-2 ring-primary/20 shadow-xs'
                      : 'bg-surface-container-lowest border border-surface-container-high text-on-surface-variant hover:border-primary/50'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCustomCollege(v => !v)}
              className={`w-full h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center px-1 text-center ${
                customCollege
                  ? 'bg-primary/10 border border-primary text-primary'
                  : 'bg-surface-container-lowest border border-dashed border-outline-variant text-on-surface-variant'
              }`}
            >
              Custom…
            </button>
          </div>

          {/* Custom Time Pickers (no text typing) */}
          {customCollege && (
            <div className="mt-1 pt-2 border-t border-surface-container flex flex-col gap-2">
              <span className="text-[11px] font-bold text-outline">Pick exact times:</span>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-outline">Start</span>
                  <input
                    type="time"
                    value={collegeStart}
                    onChange={(e) => handleCustomCollegeTime(e.target.value, collegeEnd)}
                    className="h-10 px-2.5 rounded-xl bg-surface-container-lowest border border-surface-container text-xs font-bold text-on-surface"
                  />
                </label>
                <span className="text-outline pt-3">–</span>
                <label className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-outline">End</span>
                  <input
                    type="time"
                    value={collegeEnd}
                    onChange={(e) => handleCustomCollegeTime(collegeStart, e.target.value)}
                    className="h-10 px-2.5 rounded-xl bg-surface-container-lowest border border-surface-container text-xs font-bold text-on-surface"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Shorthand typing field with strict sanitization */}
          <div className="flex flex-col gap-1 mt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-outline">Or type shorthand (e.g. 9-5:30):</span>
              {collegeValidation.isValid && (
                <span className="text-[10px] text-primary font-bold">✓ {collegeValidation.formatted}</span>
              )}
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={collegeInput}
              onChange={(e) => setCollegeInput(sanitizeTypedTime(e.target.value))}
              placeholder="e.g. 9-5:30"
              className={`h-10 px-3 bg-surface-container-lowest border rounded-xl text-xs font-bold text-on-surface placeholder:text-outline focus:outline-none transition-all ${
                collegeValidation.isValid
                  ? 'border-surface-container focus:ring-2 focus:ring-primary/20'
                  : 'border-error ring-1 ring-error/30'
              }`}
            />
            {!collegeValidation.isValid && (
              <span className="text-[11px] text-error font-medium">
                {collegeValidation.error || 'Please enter valid hours (e.g. 9-5:30 or 10-3)'}
              </span>
            )}
          </div>
        </div>

        {/* Work Hours Section */}
        <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-surface-container-low border border-surface-container">
          <div className="flex items-center justify-between">
            <span className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span>🫩</span>
              <span>Typical work hours</span>
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-all ${
                workValidation.isValid
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              {workValidation.isValid ? workValidation.short : 'Invalid time'}
            </span>
          </div>

          {/* Preset Pills (Exact 4 standard time pills + All Day + Custom) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setWorkInput('All Day');
                setCustomWork(false);
              }}
              className={`w-full h-10 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center px-1 text-center ${
                workInput.trim().toLowerCase() === 'all day'
                  ? 'bg-on-surface text-surface ring-2 ring-primary/20 shadow-xs'
                  : 'bg-surface-container-lowest border border-surface-container-high text-on-surface-variant hover:border-primary/50'
              }`}
            >
              All Day
            </button>
            {STANDARD_WORK_PRESETS.map((preset) => {
              const active = workInput.trim() === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setWorkInput(preset.label);
                    setCustomWork(false);
                  }}
                  className={`w-full h-10 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center px-1 text-center ${
                    active
                      ? 'bg-on-surface text-surface ring-2 ring-primary/20 shadow-xs'
                      : 'bg-surface-container-lowest border border-surface-container-high text-on-surface-variant hover:border-primary/50'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCustomWork(v => !v)}
              className={`w-full h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center px-1 text-center ${
                customWork
                  ? 'bg-primary/10 border border-primary text-primary'
                  : 'bg-surface-container-lowest border border-dashed border-outline-variant text-on-surface-variant'
              }`}
            >
              Custom…
            </button>
          </div>

          {/* Custom Time Pickers (no text typing) */}
          {customWork && (
            <div className="mt-1 pt-2 border-t border-surface-container flex flex-col gap-2">
              <span className="text-[11px] font-bold text-outline">Pick exact times:</span>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-outline">Start</span>
                  <input
                    type="time"
                    value={workStart}
                    onChange={(e) => handleCustomWorkTime(e.target.value, workEnd)}
                    className="h-10 px-2.5 rounded-xl bg-surface-container-lowest border border-surface-container text-xs font-bold text-on-surface"
                  />
                </label>
                <span className="text-outline pt-3">–</span>
                <label className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-outline">End</span>
                  <input
                    type="time"
                    value={workEnd}
                    onChange={(e) => handleCustomWorkTime(workStart, e.target.value)}
                    className="h-10 px-2.5 rounded-xl bg-surface-container-lowest border border-surface-container text-xs font-bold text-on-surface"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Shorthand typing field with strict sanitization */}
          <div className="flex flex-col gap-1 mt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-outline">Or type shorthand (e.g. 9-12:30):</span>
              {workValidation.isValid && (
                <span className="text-[10px] text-primary font-bold">✓ {workValidation.formatted}</span>
              )}
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={workInput}
              onChange={(e) => setWorkInput(sanitizeTypedTime(e.target.value))}
              placeholder="e.g. 9-12:30"
              className={`h-10 px-3 bg-surface-container-lowest border rounded-xl text-xs font-bold text-on-surface placeholder:text-outline focus:outline-none transition-all ${
                workValidation.isValid
                  ? 'border-surface-container focus:ring-2 focus:ring-primary/20'
                  : 'border-error ring-1 ring-error/30'
              }`}
            />
            {!workValidation.isValid && (
              <span className="text-[11px] text-error font-medium">
                {workValidation.error || 'Please enter valid hours (e.g. 9-12:30 or 8-4)'}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container px-3.5 py-2.5 rounded-xl text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isFormValid}
          className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-container text-on-primary text-sm font-bold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>{canClose ? 'Save hours' : 'Save & get started ›'}</span>
          )}
        </button>
      </div>
    </BottomSheet>
  );
};

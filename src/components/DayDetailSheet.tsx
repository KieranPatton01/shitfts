import React from 'react';
import { DayShiftData } from '../types';
import { MonthCalendarCell, DayAvailabilityInfo } from '../utils/calendarMonth';
import { DAY_NAMES, formatWeekRange } from '../utils/isoWeek';
import { SHIFT_META, formatHoursShort } from '../utils/shiftDisplay';
import { BottomSheet } from './BottomSheet';

interface DayDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cell: MonthCalendarCell | null;
  availability: DayAvailabilityInfo | null;
  myShift?: DayShiftData;
  partnerShift?: DayShiftData;
  partnerName: string;
  isPaired: boolean;
  onEditShift: () => void;
  onGoToWeek: (isoWeekId: string) => void;
}

export const DayDetailSheet: React.FC<DayDetailSheetProps> = ({
  isOpen,
  onClose,
  cell,
  availability,
  myShift,
  partnerShift,
  partnerName,
  isPaired,
  onEditShift,
  onGoToWeek
}) => {
  if (!cell || !availability) return null;

  const fullDayName = DAY_NAMES[cell.dayKey];

  const renderShiftPill = (shift?: DayShiftData, isInteractive?: boolean) => {
    if (!shift?.status) {
      return (
        <div className="h-11 px-3 rounded-xl border border-dashed border-outline-variant/70 flex items-center justify-between text-xs font-semibold text-outline">
          <span>Not set</span>
          {isInteractive && (
            <span className="text-primary font-bold text-[11px] underline">Add</span>
          )}
        </div>
      );
    }

    const meta = SHIFT_META[shift.status];
    const hours = shift.status === 'free' ? '' : formatHoursShort(shift.customHours);

    return (
      <div className={`rounded-xl px-3 py-2 flex items-center justify-between ${meta.pill}`}>
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
          {shift.isRecurring && (
            <span className="text-[10px] opacity-70" title="From weekly recurring pattern">🔁</span>
          )}
        </div>
        {hours && (
          <span className="text-xs font-semibold tabular-nums opacity-85">{hours}</span>
        )}
      </div>
    );
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Date Title & Tags */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-outline">
              {fullDayName}
            </div>
            <h3 className="font-headline font-extrabold text-xl text-on-surface">
              {cell.dateStr}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {cell.isToday && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-primary text-on-primary">
                Today
              </span>
            )}
            {cell.isPast && !cell.isToday && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                Past
              </span>
            )}
          </div>
        </div>

        {/* Availability Banner */}
        {availability.visualState === 'past' ? (
          <div className="rounded-2xl p-3.5 bg-slate-100 border border-slate-200 text-slate-700 flex items-start gap-2.5">
            <span className="text-lg">⏳</span>
            <div>
              <div className="text-xs font-bold">Past day</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {availability.hasInput
                  ? (availability.summaryDescription || 'Shifts already recorded for this past day.')
                  : 'No shifts were entered for this day.'}
              </p>
            </div>
          </div>
        ) : availability.visualState === 'unentered' ? (
          <div className="rounded-2xl p-3.5 bg-white border border-surface-container-high shadow-subtle flex items-start gap-2.5">
            <span className="text-lg">⚪</span>
            <div>
              <div className="text-xs font-bold text-on-surface">Not yet inputted</div>
              <p className="text-[11px] text-outline mt-0.5">
                {isPaired
                  ? 'Neither you nor your crush have added shifts for this day yet.'
                  : 'You have not added shifts for this day yet.'}
              </p>
            </div>
          </div>
        ) : (
          /* Inputted state - Display who is available */
          <div
            className={`rounded-2xl p-3.5 border flex items-start gap-2.5 ${
              availability.availabilityType === 'both_free'
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-golden'
                : availability.availabilityType === 'my_free'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : availability.availabilityType === 'partner_free'
                ? 'bg-sky-50 border-sky-300 text-sky-950'
                : availability.availabilityType === 'evening_free'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-950'
                : 'bg-surface-container-low border-surface-container-high text-on-surface'
            }`}
          >
            <span className="text-xl">
              {availability.availabilityType === 'both_free'
                ? '✨'
                : availability.availabilityType === 'evening_free'
                ? '🌙'
                : availability.availabilityType === 'busy'
                ? '🚫'
                : '☀️'}
            </span>
            <div className="flex-1">
              <div className="text-xs font-bold flex items-center justify-between">
                <span>{availability.statusLabel || 'Available'}</span>
                {availability.badgeText && (
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/10">
                    {availability.badgeText}
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-90 mt-1 leading-snug">
                {availability.summaryDescription}
              </p>
            </div>
          </div>
        )}

        {/* Shift Details (You & Partner) */}
        <div className="flex flex-col gap-2.5 pt-1">
          {/* You */}
          <div className="rounded-2xl p-3 bg-surface-container-lowest border border-surface-container-high flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface">You</span>
              <button
                onClick={onEditShift}
                className="text-xs font-bold text-primary hover:underline active:scale-95 transition-transform"
              >
                {myShift?.status ? 'Edit shift' : '＋ Add shift'}
              </button>
            </div>
            {renderShiftPill(myShift, true)}
            {myShift?.note && (
              <p className="text-[11px] text-outline italic">Note: "{myShift.note}"</p>
            )}
          </div>

          {/* Partner */}
          <div className="rounded-2xl p-3 bg-surface-container-lowest border border-surface-container-high flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface truncate">
                {isPaired ? partnerName : 'Partner'}
              </span>
              <span className="text-[10px] font-semibold text-outline">
                {isPaired ? 'Read-only' : 'Unpaired'}
              </span>
            </div>
            {renderShiftPill(partnerShift, false)}
            {partnerShift?.note && (
              <p className="text-[11px] text-outline italic">Note: "{partnerShift.note}"</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onEditShift}
            className="w-full h-11 rounded-xl bg-primary text-on-primary font-headline font-bold text-xs flex items-center justify-center gap-1.5 shadow-subtle active:scale-[0.98] transition-transform"
          >
            <span>✏️</span>
            <span>{myShift?.status ? 'Edit Your Shift' : 'Add Your Shift'}</span>
          </button>

          <button
            onClick={() => onGoToWeek(cell.isoWeekId)}
            className="w-full h-10 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface font-headline font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <span>📅</span>
            <span>Open in Week View ({formatWeekRange(cell.isoWeekId)})</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

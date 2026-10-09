import React, { useMemo, useState, useEffect } from 'react';
import { DayKey, DayShiftData, RecurringShiftRule, WeekDocument } from '../types';
import {
  getMonthCalendarCells,
  getMonthWeeks,
  getDayAvailability,
  MonthCalendarCell,
  DayAvailabilityInfo
} from '../utils/calendarMonth';
import { getWeekDays, DAY_NAMES } from '../utils/isoWeek';
import { applyRecurringRules } from '../services/recurringService';
import { computeSynergy } from '../utils/synergyEngine';
import { todayDateStr, SHIFT_META, formatHoursShort } from '../utils/shiftDisplay';

interface MonthViewProps {
  year: number;
  monthIndex: number;
  todayStr?: string;
  weeksMap: Record<string, WeekDocument>;
  myRules: RecurringShiftRule[];
  partnerRules: RecurringShiftRule[];
  myName: string;
  partnerName: string;
  isPaired: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpToCurrentMonth: () => void;
  onEditDayShift: (cell: MonthCalendarCell) => void;
  onGoToWeek: (isoWeekId: string) => void;
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MonthView: React.FC<MonthViewProps> = ({
  year,
  monthIndex,
  todayStr = todayDateStr(),
  weeksMap,
  myRules,
  partnerRules,
  myName,
  partnerName,
  isPaired,
  onPrevMonth,
  onNextMonth,
  onJumpToCurrentMonth: _onJumpToCurrentMonth,
  onEditDayShift,
  onGoToWeek: _onGoToWeek
}) => {
  // Month calendar grid cells
  const cells = useMemo(() => {
    return getMonthCalendarCells(year, monthIndex, todayStr);
  }, [year, monthIndex, todayStr]);

  // Selected cell: defaults to today (if in this month) or the 1st day of the month
  const [selectedCell, setSelectedCell] = useState<MonthCalendarCell | null>(null);

  useEffect(() => {
    setSelectedCell(prev => {
      if (prev && cells.some(c => c.dateStr === prev.dateStr && c.isCurrentMonth)) {
        return prev;
      }
      return cells.find(c => c.isCurrentMonth && c.isToday) ||
             cells.find(c => c.isCurrentMonth) || null;
    });
  }, [cells]);

  // Weeks spanning this month
  const monthWeeks = useMemo(() => {
    return getMonthWeeks(year, monthIndex);
  }, [year, monthIndex]);

  // Compute schedules and synergy per week
  const weekCalculations = useMemo(() => {
    const map: Record<
      string,
      {
        mySchedule: Record<DayKey, DayShiftData>;
        partnerSchedule: Record<DayKey, DayShiftData>;
        synergy: ReturnType<typeof computeSynergy>;
      }
    > = {};

    for (const weekId of monthWeeks) {
      const weekDoc = weeksMap[weekId];
      const weekDays = getWeekDays(weekId);

      const rawMy = weekDoc?.schedules?.[myName]?.days;
      const rawPartner = isPaired ? weekDoc?.schedules?.[partnerName]?.days : undefined;

      const effectiveMy = applyRecurringRules(rawMy, myRules, weekDays);
      const effectivePartner = applyRecurringRules(rawPartner, partnerRules, weekDays);
      const synergy = computeSynergy(effectiveMy, effectivePartner, myName, partnerName);

      map[weekId] = {
        mySchedule: effectiveMy,
        partnerSchedule: effectivePartner,
        synergy
      };
    }

    return map;
  }, [monthWeeks, weeksMap, myRules, partnerRules, myName, partnerName, isPaired]);

  // Map of availability info for every cell
  const availabilityMap = useMemo(() => {
    const map: Record<string, DayAvailabilityInfo> = {};

    for (const cell of cells) {
      const calc = weekCalculations[cell.isoWeekId];
      const myShift = calc?.mySchedule?.[cell.dayKey];
      const partnerShift = calc?.partnerSchedule?.[cell.dayKey];
      const tier = calc?.synergy?.dayAlignments?.[cell.dayKey]?.tier;

      map[cell.dateStr] = getDayAvailability(cell, myShift, partnerShift, partnerName, tier, isPaired);
    }

    return map;
  }, [cells, weekCalculations, partnerName, isPaired]);

  const selectedAvailability = selectedCell ? availabilityMap[selectedCell.dateStr] : null;
  const selectedCalc = selectedCell ? weekCalculations[selectedCell.isoWeekId] : null;
  const selectedMyShift = selectedCell ? selectedCalc?.mySchedule?.[selectedCell.dayKey] : undefined;
  const selectedPartnerShift = selectedCell ? selectedCalc?.partnerSchedule?.[selectedCell.dayKey] : undefined;

  const renderShiftPill = (shift?: DayShiftData) => {
    if (!shift?.status) {
      return (
        <div className="h-10 px-2.5 rounded-xl border border-dashed border-outline-variant/60 flex items-center justify-center text-xs font-semibold text-outline">
          Not set
        </div>
      );
    }

    const meta = SHIFT_META[shift.status];
    const hours = shift.status === 'free' ? '' : formatHoursShort(shift.customHours);

    return (
      <div className={`rounded-xl px-2.5 py-1.5 flex flex-col gap-0.5 ${meta.pill}`}>
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
          {shift.isRecurring && (
            <span className="text-[10px] opacity-70" title="From weekly recurring pattern">🔁</span>
          )}
        </div>
        {hours && (
          <span className="text-[11px] font-semibold tabular-nums opacity-85 leading-tight">{hours}</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── 7-Column Calendar Grid ── */}
      <section className="bg-surface-container-lowest rounded-3xl p-2.5 sm:p-3 border border-surface-container-high shadow-subtle flex flex-col">
        {/* Weekday column headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-2">
          {WEEKDAY_HEADERS.map(name => (
            <div
              key={name}
              className="text-[11px] font-extrabold uppercase tracking-tight text-outline py-1"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1">
          {cells.map(cell => {
            const info = availabilityMap[cell.dateStr];
            if (!cell.isCurrentMonth) {
              const isPrevMonth = cell.dateStr < `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
              return (
                <button
                  key={cell.dateStr}
                  onClick={isPrevMonth ? onPrevMonth : onNextMonth}
                  aria-label={`Go to ${cell.dateStr}`}
                  className="min-h-[82px] sm:min-h-[92px] rounded-xl p-1.5 bg-surface-container/20 border border-transparent opacity-35 flex flex-col justify-between text-left active:opacity-60 transition-opacity"
                >
                  <span className="text-[11px] font-medium text-outline">
                    {cell.dayOfMonth}
                  </span>
                  <div className="h-3" />
                </button>
              );
            }

            const isPast = info.visualState === 'past';
            const isUnentered = info.visualState === 'unentered';
            const isInputted = info.visualState === 'inputted';
            const isBothFree = info.availabilityType === 'both_free';
            const isMyFree = info.availabilityType === 'my_free';
            const isPartnerFree = info.availabilityType === 'partner_free';
            const isEvening = info.availabilityType === 'evening_free';

            let cellBg = '';
            let cellBorder = '';
            let textClass = 'text-on-surface';

            if (isPast) {
              // 1. Days in the past: greyed out
              cellBg = 'bg-slate-100/80';
              cellBorder = 'border-slate-200/50';
              textClass = 'text-slate-400 opacity-65';
            } else if (isUnentered) {
              // 2. Days not yet inputted: white
              cellBg = 'bg-white';
              cellBorder = 'border-surface-container-high hover:border-primary/50';
              textClass = 'text-on-surface';
            } else {
              // 3. The rest: contain information on who is available
              if (isBothFree) {
                cellBg = 'bg-amber-100/90';
                cellBorder = 'border-amber-400 border-2 shadow-golden';
                textClass = 'text-amber-950 font-bold';
              } else if (isMyFree) {
                cellBg = 'bg-emerald-50';
                cellBorder = 'border-emerald-300';
                textClass = 'text-emerald-950 font-semibold';
              } else if (isPartnerFree) {
                cellBg = 'bg-sky-50';
                cellBorder = 'border-sky-300';
                textClass = 'text-sky-950 font-semibold';
              } else if (isEvening) {
                cellBg = 'bg-indigo-50';
                cellBorder = 'border-indigo-200';
                textClass = 'text-indigo-950 font-semibold';
              } else {
                cellBg = 'bg-surface-container-low';
                cellBorder = 'border-surface-container-high';
                textClass = 'text-on-surface';
              }
            }

            const isSelected = selectedCell?.dateStr === cell.dateStr;

            return (
              <button
                key={cell.dateStr}
                onClick={() => setSelectedCell(cell)}
                aria-label={`${cell.dateStr}: ${info.statusLabel || (isPast ? 'Past' : 'Unentered')}`}
                className={`min-h-[82px] sm:min-h-[92px] rounded-xl p-1.5 border text-left flex flex-col justify-between transition-all active:scale-95 ${cellBg} ${cellBorder} ${textClass} ${
                  isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container-lowest scale-[1.02] shadow-md z-10' : ''
                }`}
              >
                {/* Day Number Row */}
                <div className="flex items-center justify-between w-full">
                  {cell.isToday ? (
                    <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      {cell.dayOfMonth}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-0.5 leading-none shrink-0">
                      {cell.dayOfMonth}
                    </span>
                  )}

                  {/* Tiny dot indicators for inputs */}
                  {isInputted && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {info.myStatus === 'free' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="You are free" />
                      )}

                      {info.partnerStatus === 'free' ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" title="Partner is free" />
                      ) : info.partnerStatus ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" title="Partner is working" />
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Availability Badge Row */}
                <div className="mt-auto w-full">
                  {isInputted && info.badgeText && (
                    <div
                      className={`text-[8.5px] font-extrabold px-0.5 py-0.5 rounded text-center leading-[1.1] break-words ${
                        isBothFree
                          ? 'bg-amber-400 text-amber-950'
                          : isMyFree
                          ? 'bg-emerald-200 text-emerald-900'
                          : isPartnerFree
                          ? 'bg-sky-200 text-sky-900'
                          : isEvening
                          ? 'bg-indigo-200 text-indigo-900'
                          : 'bg-surface-container-highest text-on-surface'
                      }`}
                    >
                      {info.badgeText}
                    </div>
                  )}

                  {isPast && (
                    <div className="h-3" />
                  )}

                  {isUnentered && (
                    <div className="h-3" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Day Details Container Under Calendar ── */}
      {selectedCell && (
        <section className="bg-surface-container-lowest rounded-3xl p-4 border border-surface-container-high shadow-subtle flex flex-col gap-3 animate-fade-in">
          {/* Header Row: Date & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-headline font-extrabold text-base text-on-surface">
                {DAY_NAMES[selectedCell.dayKey]}, {new Date(Number(selectedCell.dateStr.split('-')[0]), Number(selectedCell.dateStr.split('-')[1]) - 1, Number(selectedCell.dateStr.split('-')[2])).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </h3>
              {selectedCell.isToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary text-on-primary">
                  Today
                </span>
              )}
            </div>

            <button
              onClick={() => onEditDayShift(selectedCell)}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs"
            >
              {selectedMyShift?.status ? 'Edit shift' : '＋ Add shift'}
            </button>
          </div>

          {/* Availability Status / Description */}
          {selectedAvailability?.summaryDescription && (
            <p className="text-xs text-on-surface-variant font-medium">
              {selectedAvailability.summaryDescription}
            </p>
          )}

          {/* Whos got what on that day */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* You */}
            <div className="rounded-2xl p-3 bg-surface-container-low border border-surface-container flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface">You</span>
              </div>
              {renderShiftPill(selectedMyShift)}
            </div>

            {/* Partner / Crush */}
            <div className="rounded-2xl p-3 bg-surface-container-low border border-surface-container flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface truncate">
                  {isPaired ? partnerName : 'Crush'}
                </span>
              </div>
              {selectedPartnerShift?.status ? (
                renderShiftPill(selectedPartnerShift)
              ) : (
                <div className="h-10 px-2.5 rounded-xl border border-dashed border-outline-variant/60 flex items-center justify-center text-center text-[11px] font-medium text-outline">
                  Not uploaded yet...
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

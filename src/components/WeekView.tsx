import React from 'react';
import { DayKey, DayShiftData, SynergyResult } from '../types';
import { DayInfo } from '../utils/isoWeek';
import { SHIFT_META, formatHoursShort, todayDateStr } from '../utils/shiftDisplay';

interface WeekViewProps {
  days: DayInfo[];
  mySchedule?: Record<DayKey, DayShiftData>;
  partnerDays?: Record<DayKey, DayShiftData>;
  partnerName: string;
  isPaired: boolean;
  synergy: SynergyResult;
  onTapDay: (dayIndex: number) => void;
}

const ShiftPill: React.FC<{ shift?: DayShiftData; muted?: boolean; emptyLabel: string; interactive?: boolean }> = ({
  shift,
  muted,
  emptyLabel,
  interactive
}) => {
  if (!shift?.status) {
    return (
      <div
        className={`h-full min-h-[56px] w-full rounded-2xl border border-dashed flex items-center justify-center text-xs font-bold transition-all ${
          interactive
            ? 'border-primary/50 text-primary bg-primary-fixed/10 hover:bg-primary-fixed/20'
            : 'border-outline-variant/60 text-outline'
        }`}
      >
        {emptyLabel}
      </div>
    );
  }

  const meta = SHIFT_META[shift.status];
  const hours = shift.status === 'free' ? '' : formatHoursShort(shift.customHours);
  const displayHours = hours || (shift.customHours && shift.customHours !== 'All Day' ? shift.customHours : 'All Day');

  return (
    <div
      className={`h-full min-h-[56px] w-full rounded-2xl px-3 py-2 flex flex-col justify-center transition-all ${meta.pill} ${
        muted ? 'opacity-85' : 'shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between leading-tight">
        <span className="text-xs font-extrabold flex items-center gap-1.5">
          <span className="text-sm">{meta.emoji}</span>
          <span>{meta.label}</span>
          {shift.isRecurring && <span className="text-[10px] opacity-70" title="From your weekly pattern">🔁</span>}
        </span>
      </div>
      <div className="mt-1 text-xs font-bold tabular-nums opacity-90 leading-tight">
        {displayHours}
      </div>
    </div>
  );
};

export const WeekView: React.FC<WeekViewProps> = ({
  days,
  mySchedule,
  partnerDays,
  partnerName,
  isPaired,
  synergy,
  onTapDay
}) => {
  const today = todayDateStr();

  const myCount = days.filter(d => mySchedule?.[d.dayKey]?.status).length;
  const partnerCount = days.filter(d => partnerDays?.[d.dayKey]?.status).length;

  const bothFreeDays = days.filter(d => synergy.dayAlignments[d.dayKey]?.tier === 'golden');
  const eveningDays = days.filter(d => synergy.dayAlignments[d.dayKey]?.tier === 'evening');
  const partnerFreeDays = days.filter(d => partnerDays?.[d.dayKey]?.status === 'free');

  const upcoming = (list: DayInfo[]) => list.find(d => d.dateStr >= today);
  const nextBothFree = upcoming(bothFreeDays) || upcoming(eveningDays);
  const nextIsFullDay = Boolean(nextBothFree && bothFreeDays.includes(nextBothFree));

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero: when are we both free? ── */}
      <section className="rounded-3xl p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-subtle">
        {myCount === 0 && partnerCount === 0 ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Shared free time</p>
            <h2 className="font-headline font-extrabold text-lg text-on-surface mt-1">
              Sitting, Waiting, wishing
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Neither you nor {isPaired ? partnerName : 'your crush'} have uploaded shifts for this week yet.
            </p>
          </>
        ) : myCount === 0 && partnerCount > 0 ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Shared free time</p>
            <h2 className="font-headline font-extrabold text-lg text-on-surface mt-1">
              IS this thing on? 🤓🎤
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              {isPaired ? partnerName : 'Your crush'} has uploaded their shifts. Add yours to see when you're both free!
            </p>
          </>
        ) : partnerCount === 0 ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Shared free time</p>
            <h2 className="font-headline font-extrabold text-lg text-on-surface mt-1">
              {isPaired ? partnerName : 'Your crush'} hasn't added this week yet
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              You'll see your shared free days once they do.
            </p>
          </>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              {nextBothFree ? 'Next time you’re both free' : 'This week'}
            </p>
            <h2 className="font-headline font-extrabold text-xl text-on-surface mt-1">
              {nextBothFree
                ? `${nextBothFree.dayName} ${nextBothFree.dayOfMonth}${nextIsFullDay ? '' : ' evening'}`
                : 'No shared free time left this week'}
            </h2>
          </>
        )}

        {partnerCount > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-200/70 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-on-surface-variant">{partnerName} is free:</span>
            {partnerFreeDays.length === 0 ? (
              <span className="text-xs text-outline">no full days off</span>
            ) : (
              partnerFreeDays.map(d => (
                <span key={d.dayKey} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-primary border border-primary/20">
                  {d.shortName}
                </span>
              ))
            )}
          </div>
        )}
      </section>

      {/* ── Week list ── */}
      <section className="flex flex-col gap-2">
        <div className="grid grid-cols-[44px_1fr_1fr] gap-2.5 px-1 text-[11px] font-bold uppercase tracking-wider text-outline">
          <span />
          <span>You</span>
          <span className="truncate">{isPaired ? partnerName : 'Crush'}</span>
        </div>

        {days.map((day, idx) => {
          const mine = mySchedule?.[day.dayKey];
          const theirs = partnerDays?.[day.dayKey];
          const tier = synergy.dayAlignments[day.dayKey]?.tier;
          const isGolden = tier === 'golden';
          const isEvening = tier === 'evening';
          const isToday = day.dateStr === today;
          const isPast = day.dateStr < today;

          return (
            <div
              key={day.dayKey}
              className={`rounded-2xl p-2.5 border transition-colors ${
                isGolden
                  ? 'bg-amber-50 border-amber-300 shadow-golden'
                  : 'bg-surface-container-lowest border-surface-container-high'
              } ${isPast ? 'opacity-55' : ''}`}
            >
              <div className="grid grid-cols-[44px_1fr_1fr] gap-2.5 items-stretch">
                {/* Day */}
                <div className="flex flex-col items-center justify-center">
                  <span className={`text-[11px] font-bold uppercase ${isToday ? 'text-primary' : 'text-outline'}`}>
                    {day.shortName}
                  </span>
                  <span className={`font-headline font-extrabold text-lg leading-none ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                    {day.dayOfMonth}
                  </span>
                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1" />}
                </div>

                {/* You (tap to edit) */}
                <button
                  onClick={() => onTapDay(idx)}
                  aria-label={`Edit ${day.dayName}`}
                  className="h-full w-full text-left active:scale-[0.97] transition-transform flex flex-col"
                >
                  <ShiftPill shift={mine} emptyLabel="+ Add" interactive />
                </button>

                {/* Partner (read-only) */}
                <div className="h-full w-full flex flex-col">
                  <ShiftPill shift={theirs} muted emptyLabel={isPaired ? 'Not set' : '—'} />
                </div>
              </div>

              {(isGolden || isEvening) && (
                <div className={`mt-2 ml-[52px] text-[11px] font-bold ${isGolden ? 'text-amber-700' : 'text-on-surface-variant'}`}>
                  {isGolden ? '✨ You’re both free all day' : '🌙 Both free in the evening'}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};

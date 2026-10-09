import React from 'react';
import { SynergyResult, DayShiftData, PartnerSchedule, DayKey } from '../types';
import { DayInfo } from '../utils/isoWeek';

interface SynergyDashboardProps {
  synergy: SynergyResult;
  days: DayInfo[];
  mySchedule?: Record<DayKey, DayShiftData>;
  partnerSchedule?: PartnerSchedule;
  myName: string;
  partnerName: string;
  onEditDay: (dayIndex: number) => void;
}

export const SynergyDashboard: React.FC<SynergyDashboardProps> = ({
  synergy,
  days,
  mySchedule,
  partnerSchedule,
  myName,
  partnerName,
  onEditDay
}) => {
  return (
    <div className="max-w-md mx-auto flex flex-col gap-4 pt-2">
      {/* Top Simple Summary Box */}
      <div className="bg-primary-fixed/30 border border-primary/20 rounded-3xl p-5 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Mutual Availability
          </span>
          <h2 className="font-headline font-extrabold text-xl text-on-surface">
            {synergy.goldenCount > 0
              ? `✨ ${synergy.goldenCount} Golden Day${synergy.goldenCount === 1 ? '' : 's'} This Week`
              : 'No Full Overlap Days'}
          </h2>
          <span className="text-xs text-on-surface-variant mt-0.5">
            ~{synergy.mutualHours} hours of shared free time
          </span>
        </div>

        <button
          onClick={() => onEditDay(0)}
          className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-full shadow-xs hover:bg-primary-container active:scale-95 transition-all"
        >
          Edit Shifts
        </button>
      </div>

      {/* 7 Days List */}
      <div className="flex flex-col gap-2">
        {days.map((day, idx) => {
          const alignment = synergy.dayAlignments[day.dayKey];
          const shiftMine = mySchedule ? mySchedule[day.dayKey] : undefined;
          const shiftPartner = partnerSchedule?.days ? partnerSchedule.days[day.dayKey] : undefined;

          const isGolden = alignment.tier === 'golden';
          const isEvening = alignment.tier === 'evening';

          return (
            <div
              key={day.dayKey}
              onClick={() => onEditDay(idx)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                isGolden
                  ? 'bg-primary-fixed/20 border-primary/40'
                  : isEvening
                    ? 'bg-secondary-fixed/20 border-secondary/30'
                    : 'bg-surface-container-lowest border-surface-container-high'
              }`}
            >
              {/* Day info */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold ${
                  isGolden ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'
                }`}>
                  <span>{day.shortName}</span>
                  <span className="text-[10px] font-normal leading-none">{day.dayOfMonth}</span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                    <span>{myName}: <strong className="capitalize">{shiftMine?.status || '—'}</strong></span>
                    <span className="text-outline">·</span>
                    <span>{partnerName}: <strong className="capitalize">{shiftPartner?.status || '—'}</strong></span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    {shiftMine?.customHours || 'Standard'} vs {shiftPartner?.customHours || 'Standard'}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                isGolden
                  ? 'bg-primary text-on-primary'
                  : isEvening
                    ? 'bg-secondary-container text-on-secondary-container'
                    : alignment.tier === 'blackout'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-surface-container text-outline'
              }`}>
                {isGolden ? '✨ Golden Day' : isEvening ? 'Evening Free' : alignment.tier === 'blackout' ? 'Busy' : 'Offset'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

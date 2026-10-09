import React from 'react';
import { DayKey, DayShiftData } from '../types';
import { DayInfo } from '../utils/isoWeek';

interface SevenSegmentTrackerProps {
  days: DayInfo[];
  activeIndex: number;
  onSelectDay: (index: number) => void;
  mySchedule?: Record<DayKey, DayShiftData>;
}

export const SevenSegmentTracker: React.FC<SevenSegmentTrackerProps> = ({
  days,
  activeIndex,
  onSelectDay,
  mySchedule
}) => {
  const activeDay = days[activeIndex];

  return (
    <section className="w-full flex flex-col gap-2 pt-1">
      {/* Tracker Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-bold">
            {activeIndex + 1}
          </span>
          <span className="font-headline font-bold text-base text-on-surface">
            Weekly Entry Deck
          </span>
        </div>
        <div className="flex items-center gap-1 bg-surface-container-high px-2.5 py-0.5 rounded-full">
          <span className="material-symbols-outlined text-primary text-[14px] fill">bolt</span>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant">
            Day {activeIndex + 1} of 7 · {activeDay?.shortName} {activeDay?.monthName} {activeDay?.dayOfMonth}
          </span>
        </div>
      </div>

      {/* 7 Segment Buttons */}
      <div className="grid grid-cols-7 gap-1.5 pt-0.5">
        {days.map((day, idx) => {
          const isDone = Boolean(mySchedule && mySchedule[day.dayKey]);
          const isActive = idx === activeIndex;

          return (
            <button
              key={day.dayKey}
              onClick={() => onSelectDay(idx)}
              className={`group flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? 'bg-surface-container-lowest shadow-[0_4px_14px_-2px_rgba(0,105,72,0.2)] border border-primary/20 scale-105 z-10'
                  : isDone
                    ? 'bg-surface-container-low hover:bg-surface-container'
                    : 'bg-surface-container-low/60 opacity-70 hover:opacity-100'
              }`}
              title={`${day.dayName}: ${isActive ? 'Active' : isDone ? 'Completed' : 'Pending'}`}
            >
              {/* Progress bar line */}
              <div
                className={`w-full h-1.5 rounded-full mx-1 ${
                  isActive
                    ? 'bg-primary animate-pulse'
                    : isDone
                      ? 'bg-primary'
                      : 'bg-surface-container-highest'
                }`}
              />

              {/* Day short name + status icon */}
              <div className="flex items-center justify-center gap-0.5">
                <span
                  className={`text-[11px] font-bold ${
                    isActive
                      ? 'text-primary'
                      : isDone
                        ? 'text-on-surface font-semibold'
                        : 'text-outline'
                  }`}
                >
                  {day.shortName}
                </span>

                {isDone && !isActive && (
                  <span className="material-symbols-outlined text-[13px] text-primary fill">
                    check_circle
                  </span>
                )}
              </div>

              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary -mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

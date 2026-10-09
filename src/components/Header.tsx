import React from 'react';
import { formatWeekRange } from '../utils/isoWeek';

interface HeaderProps {
  viewMode: 'week' | 'month';
  onViewModeChange: (mode: 'week' | 'month') => void;
  // Week navigation
  currentWeekId: string;
  isCurrentWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onJumpToToday: () => void;
  // Month navigation
  monthTitle: string;
  isCurrentMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpToCurrentMonth: () => void;
  // Settings
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange,
  currentWeekId,
  isCurrentWeek,
  onPrevWeek,
  onNextWeek,
  onJumpToToday,
  monthTitle,
  isCurrentMonth,
  onPrevMonth,
  onNextMonth,
  onJumpToCurrentMonth,
  onOpenSettings
}) => {
  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-surface-container-high px-4 pt-safe">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2 py-2.5">
        <h1 className="font-headline font-extrabold text-xl text-primary tracking-tight">shitfts</h1>

        {/* Center: Navigation Controls */}
        <div className="flex flex-col items-center">
          {viewMode === 'week' ? (
            <>
              <div className="flex items-center gap-0.5 bg-surface-container rounded-full px-1 py-0.5">
                <button
                  onClick={onPrevWeek}
                  aria-label="Previous week"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-highest active:scale-90 transition-transform"
                >
                  ‹
                </button>
                <span className="px-1 text-xs font-bold text-on-surface whitespace-nowrap">
                  {formatWeekRange(currentWeekId)}
                </span>
                <button
                  onClick={onNextWeek}
                  aria-label="Next week"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-highest active:scale-90 transition-transform"
                >
                  ›
                </button>
              </div>
              {!isCurrentWeek && (
                <button onClick={onJumpToToday} className="mt-0.5 text-[11px] font-bold text-primary active:scale-95 transition-transform">
                  ↩ Back to this week
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-0.5 bg-surface-container rounded-full px-1 py-0.5">
                <button
                  onClick={onPrevMonth}
                  aria-label="Previous month"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-highest active:scale-90 transition-transform"
                >
                  ‹
                </button>
                <span className="px-1.5 text-xs font-bold text-on-surface whitespace-nowrap">
                  {monthTitle}
                </span>
                <button
                  onClick={onNextMonth}
                  aria-label="Next month"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-highest active:scale-90 transition-transform"
                >
                  ›
                </button>
              </div>
              {!isCurrentMonth && (
                <button onClick={onJumpToCurrentMonth} className="mt-0.5 text-[11px] font-bold text-primary active:scale-95 transition-transform">
                  ↩ Back to this month
                </button>
              )}
            </>
          )}
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>

      {/* View Switcher: Week vs Month */}
      <div className="max-w-md mx-auto pb-2">
        <div className="grid grid-cols-2 p-0.5 bg-surface-container rounded-2xl text-xs font-headline font-bold">
          <button
            onClick={() => onViewModeChange('week')}
            className={`py-1.5 rounded-xl transition-all ${
              viewMode === 'week'
                ? 'bg-surface-container-lowest text-primary shadow-subtle'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewModeChange('month')}
            className={`py-1.5 rounded-xl transition-all ${
              viewMode === 'month'
                ? 'bg-surface-container-lowest text-primary shadow-subtle'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Month
          </button>
        </div>
      </div>
    </header>
  );
};

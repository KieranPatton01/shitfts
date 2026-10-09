import React from 'react';
import { BottomSheet } from './BottomSheet';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  myName: string;
  email?: string | null;
  patternCount: number;
  typicalCollegeShort?: string;
  typicalWorkShort?: string;
  onOpenPattern: () => void;
  onOpenTypicalHours: () => void;
  onLogout: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  onClose,
  myName,
  email,
  patternCount,
  typicalCollegeShort = '9–5:30',
  typicalWorkShort = '9–12:30',
  onOpenPattern,
  onOpenTypicalHours,
  onLogout
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low">
          <span className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center font-extrabold uppercase">
            {myName.charAt(0)}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-headline font-bold text-sm text-on-surface truncate">{myName}</span>
            {email && <span className="text-xs text-on-surface-variant truncate">{email}</span>}
          </div>
        </div>

        {/* Typical hours button */}
        <button
          onClick={onOpenTypicalHours}
          className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container text-left transition-all active:scale-[0.99]"
        >
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
              <span>⏰</span>
              <span>Typical hours</span>
            </span>
            <span className="text-xs text-on-surface-variant">
              College: {typicalCollegeShort} · Work: {typicalWorkShort}
            </span>
          </span>
          <span className="text-outline">›</span>
        </button>

        <button
          onClick={onOpenPattern}
          className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container text-left transition-all active:scale-[0.99]"
        >
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
              <span>🔁</span>
              <span>Weekly pattern</span>
            </span>
            <span className="text-xs text-on-surface-variant">
              {patternCount > 0 ? `${patternCount} day${patternCount === 1 ? '' : 's'} repeat every week` : 'Not set up'}
            </span>
          </span>
          <span className="text-outline">›</span>
        </button>



        <button
          onClick={onLogout}
          className="mt-1 p-3 rounded-2xl text-xs font-semibold text-outline hover:text-on-surface"
        >
          Sign out
        </button>

        <div className="text-center pt-2 pb-1">
          <p className="text-[11px] text-outline font-medium select-none">
            Build 1.0.43
          </p>
        </div>
      </div>
    </BottomSheet>
  );
};

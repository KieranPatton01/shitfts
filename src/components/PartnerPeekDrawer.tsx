import { DayShiftData } from '../types';

interface PartnerPeekDrawerProps {
  partnerName: string;
  partnerAvatar?: string | null;
  dayName: string;
  partnerShift?: DayShiftData;
  myStatus?: string;
  isWittyMode?: boolean;
}

export const PartnerPeekDrawer: React.FC<PartnerPeekDrawerProps> = ({
  partnerName,
  partnerAvatar,
  dayName,
  partnerShift,
  myStatus,
  isWittyMode = false
}) => {
  const isLogged = Boolean(partnerShift);
  const isPartnerFree = partnerShift?.status === 'free';
  const isMyFree = myStatus === 'free';
  const isGoldenMatch = isPartnerFree && isMyFree;

  return (
    <div className="relative bg-gradient-to-br from-surface-container-lowest to-surface-container-low rounded-2xl p-4 shadow-[0_4px_16px_-2px_rgba(11,28,48,0.04)] border border-surface-container flex flex-col gap-2.5 overflow-hidden">
      {/* Top Ambient Gradient Accent Line */}
      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
        isWittyMode
          ? 'from-error via-secondary to-error-container'
          : 'from-secondary-container via-primary to-primary-fixed'
      }`} />

      {/* Header */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-[18px] fill">
            {isWittyMode ? 'sentiment_very_dissatisfied' : 'favorite'}
          </span>
          <span className="font-headline font-bold text-xs text-on-surface">
            Partner Peek · {dayName}
          </span>
        </div>

        {isGoldenMatch ? (
          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed shadow-xs">
            {isWittyMode ? '⚠️ Trapped!' : '✨ Golden Match'}
          </span>
        ) : isLogged ? (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant capitalize">
            {partnerShift?.status} Logged
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-outline">
            Awaiting Log
          </span>
        )}
      </div>

      {/* Partner Status Card */}
      <div className="bg-surface-container-lowest p-3 rounded-xl flex items-start gap-3 shadow-xs border border-surface-container">
        {/* Avatar with live status dot */}
        <div className="relative shrink-0">
          {partnerAvatar ? (
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="w-10 h-10 rounded-full object-cover shadow-xs border border-surface-container"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container font-extrabold text-sm flex items-center justify-center">
              {partnerName.charAt(0)}
            </div>
          )}

          {isLogged && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-xs">
              <span className="material-symbols-outlined text-[10px] font-bold fill">check</span>
            </span>
          )}
        </div>

        {/* Content details */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="font-headline font-bold text-xs text-on-surface truncate">
              {isLogged ? (
                partnerShift?.status === 'free'
                  ? `${partnerName} logged: Free today! ✨`
                  : partnerShift?.status === 'work'
                    ? `${partnerName} is on shift`
                    : partnerShift?.status === 'college'
                      ? `${partnerName} has classes`
                      : `${partnerName} is busy`
              ) : (
                `${partnerName} hasn't logged ${dayName} yet`
              )}
            </span>
            <span className="text-[10px] text-outline font-mono">
              {isLogged ? 'Synced live' : 'Pending'}
            </span>
          </div>

          <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
            {isLogged ? (
              partnerShift?.status === 'free' ? (
                isWittyMode
                  ? `${partnerName} claimed 100% freedom. That means zero valid excuses to decline plans.`
                  : `${partnerName} has no commitments! Your selections together create mutual free time.`
              ) : (
                <span>
                  Hours: <strong className="text-on-surface font-mono">{partnerShift?.customHours || 'Scheduled'}</strong>
                  {partnerShift?.note && (
                    <span className="italic block text-outline"> Note: "{partnerShift.note}"</span>
                  )}
                </span>
              )
            ) : (
              isWittyMode
                ? `Elena is probably waiting to see your shift first before formulating an excuse.`
                : `Submit your day anytime; ${partnerName}'s rota will instantly sync here as soon as they tap.`
            )}
          </p>
        </div>
      </div>

      {/* Mini Mutual Window Pill if both free */}
      {isGoldenMatch && (
        <div className="bg-primary-fixed/50 p-2.5 rounded-xl flex items-center justify-between border border-primary/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px] fill">
              celebration
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-primary-fixed leading-tight">
                Shared Window: All Day Mutual Freedom
              </span>
              <span className="text-[11px] text-on-primary-fixed-variant">
                {isWittyMode ? 'Lock your doors, you are stuck together' : 'Perfect for cooking dinner or an adventure'}
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-primary text-[16px]">
            chevron_right
          </span>
        </div>
      )}
    </div>
  );
};

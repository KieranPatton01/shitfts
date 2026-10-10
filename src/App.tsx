import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import {
  getCurrentISOWeekId,
  getAdjacentWeek,
  getWeekDays,
  getMondayOfISOWeek,
  getISOWeekId,
  DayInfo
} from './utils/isoWeek';
import {
  formatMonthTitle,
  getAdjacentMonth,
  getMonthWeeks,
  MonthCalendarCell
} from './utils/calendarMonth';
import { todayDateStr } from './utils/shiftDisplay';
import { subscribeToWeeks, saveDayStatus, subscribeToWeek, initializeEmptySchedule } from './services/weekService';
import {
  getRecurringRules,
  applyRecurringRules,
  syncRecurringRulesToCloud,
  cacheRecurringRulesLocally
} from './services/recurringService';
import {
  MemberProfile,
  subscribeToMembers,
  publishMyProfile,
  pickPartner,
  getScheduleDays
} from './services/memberService';
import { computeSynergy } from './utils/synergyEngine';
import { WeekDocument, ShiftType, DayKey, DayShiftData, RecurringShiftRule } from './types';
import { ParsedShiftResult } from './utils/rotaOcrParser';
import { Header } from './components/Header';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { ShiftPickerSheet } from './components/ShiftPickerSheet';
import { AddShiftsSheet } from './components/AddShiftsSheet';
import { SettingsSheet } from './components/SettingsSheet';
import { RecurringShiftsModal } from './components/RecurringShiftsModal';
import { FirstTimeSetupModal } from './components/FirstTimeSetupModal';
import { SignIn } from './components/SignIn';
import {
  getUserSettings,
  saveUserSettings,
  UserSettings
} from './services/userSettingsService';

/** Fetch a week document once (works for both Firestore and local mock mode). */
function fetchWeekOnce(isoWeekId: string): Promise<WeekDocument> {
  return new Promise(resolve => {
    let done = false;
    let unsub: (() => void) | null = null;
    unsub = subscribeToWeek(isoWeekId, doc => {
      if (done) return;
      done = true;
      resolve(doc);
      // Defer so this works even if the callback fires synchronously
      setTimeout(() => unsub?.(), 0);
    });
  });
}

export const App: React.FC = () => {
  const { user, couple, loading: authLoading, logout } = useAuth();

  // Navigation mode: 'week' or 'month'
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Week navigation state
  const [currentWeekId, setCurrentWeekId] = useState<string>(getCurrentISOWeekId());
  const [isViewingCurrentWeek, setIsViewingCurrentWeek] = useState<boolean>(true);

  // Month navigation state
  const [currentMonth, setCurrentMonth] = useState<{ year: number; monthIndex: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });

  // Cached multi-week documents map
  const [weeksMap, setWeeksMap] = useState<Record<string, WeekDocument>>({});
  const [rulesVersion, setRulesVersion] = useState<number>(0);

  // Sheet states
  const [pickerWeekId, setPickerWeekId] = useState<string>(currentWeekId);
  const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPatternOpen, setIsPatternOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  // User schedule preferences (typical hours)
  const [userSettings, setUserSettings] = useState<UserSettings>(() => getUserSettings(user?.uid));

  // Initialize and check onboarding status
  useEffect(() => {
    if (user?.uid) {
      const s = getUserSettings(user.uid);
      setUserSettings(s);
      if (!s.setupCompleted) {
        setIsSetupOpen(true);
      }
    }
  }, [user?.uid]);

  // Auto-clear legacy mock schedules so user gets a 100% fresh slate
  useEffect(() => {
    if (localStorage.getItem('shitfts_data_version') !== 'v2_blank') {
      localStorage.removeItem('shitfts_mock_weeks');
      localStorage.setItem('shitfts_data_version', 'v2_blank');
    }
  }, []);

  // Sync recurring changes across tabs
  useEffect(() => {
    const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('shitfts_sync_channel') : null;
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'RECURRING_UPDATED') {
        setRulesVersion(v => v + 1);
      }
    };
    broadcast?.addEventListener('message', handleMessage);
    return () => {
      broadcast?.removeEventListener('message', handleMessage);
      broadcast?.close();
    };
  }, []);

  const days: DayInfo[] = useMemo(() => getWeekDays(currentWeekId), [currentWeekId]);

  // Determine current user's name
  const myName = (user?.displayName && user.displayName.trim()) || (user?.email ? user.email.split('@')[0] : 'You');

  // Month title & isCurrentMonth
  const monthTitle = useMemo(
    () => formatMonthTitle(currentMonth.year, currentMonth.monthIndex),
    [currentMonth.year, currentMonth.monthIndex]
  );

  const isViewingCurrentMonth = useMemo(() => {
    const now = new Date();
    return now.getFullYear() === currentMonth.year && now.getMonth() === currentMonth.monthIndex;
  }, [currentMonth.year, currentMonth.monthIndex]);

  // Determine weeks to subscribe to (active week + month weeks)
  const activeWeekIds = useMemo(() => {
    const monthWeeks = getMonthWeeks(currentMonth.year, currentMonth.monthIndex);
    return Array.from(new Set([...monthWeeks, currentWeekId, pickerWeekId]));
  }, [currentMonth.year, currentMonth.monthIndex, currentWeekId, pickerWeekId]);

  // Subscribe to real-time week changes
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToWeeks(activeWeekIds, updatedMap => {
      setWeeksMap(prev => ({ ...prev, ...updatedMap }));
    });
    return () => unsubscribe();
  }, [activeWeekIds, user]);

  const weekData = weeksMap[currentWeekId] || null;

  // Registered users (`users` collection) — lets us identify the partner by UID
  const [members, setMembers] = useState<MemberProfile[]>([]);
  useEffect(() => {
    if (!user) return;
    return subscribeToMembers(setMembers);
  }, [user]);

  // Publish the exact name my shifts are stored under, so my partner can find them
  useEffect(() => {
    if (user?.uid && myName) void publishMyProfile(user.uid, myName);
  }, [user?.uid, myName]);

  // Keep my weekly pattern in sync between this device and the cloud
  const myMember = members.find(m => m.uid === user?.uid);
  const myCloudRules = myMember?.recurringRules;
  useEffect(() => {
    if (!user?.uid || !myMember) return;
    const local = getRecurringRules(user.uid);
    if (myCloudRules === undefined) {
      // Pattern was created before cloud sync existed — upload it once
      if (local.length > 0) void syncRecurringRulesToCloud(user.uid, local);
    } else if (JSON.stringify(myCloudRules) !== JSON.stringify(local)) {
      // Pattern was changed on another device — pull it down
      cacheRecurringRulesLocally(user.uid, myCloudRules);
      setRulesVersion(v => v + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, myCloudRules, Boolean(myMember)]);

  const loadedWeeks = useMemo(() => Object.values(weeksMap), [weeksMap]);
  const partnerMember = useMemo(
    () => (user ? pickPartner(members, user.uid, myName, loadedWeeks) : null),
    [members, user, myName, loadedWeeks]
  );

  // Partner name: the other registered user; falls back to schedule keys I don't own
  const partnerName = useMemo(() => {
    if (partnerMember) return partnerMember.scheduleName;

    const me = myName.trim().toLowerCase();
    const findOther = (doc: WeekDocument | null | undefined) =>
      Object.keys(doc?.schedules || {}).find(k => {
        if (k.trim().toLowerCase() === me) return false;
        const owner = doc!.schedules[k]?.ownerUid;
        return !owner || owner !== user?.uid;
      });

    const otherKey = findOther(weekData);
    if (otherKey) return otherKey;

    if (couple?.memberDetails && user) {
      const otherUid = couple.members.find(uid => uid !== user.uid);
      const name = otherUid ? couple.memberDetails[otherUid]?.displayName : undefined;
      if (name) return name;
    }

    for (const doc of loadedWeeks) {
      const pKey = findOther(doc);
      if (pKey) return pKey;
    }

    return 'Crush';
  }, [partnerMember, weekData, loadedWeeks, myName, couple, user]);

  const isPaired = partnerName !== 'Partner' && partnerName !== 'Crush';

  const rawMySchedule = getScheduleDays(weekData, myName);
  const rawPartnerDays = isPaired ? getScheduleDays(weekData, partnerName) : undefined;

  // Apply recurring rules automatically if not manually overridden for this week
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const myRules = useMemo(() => getRecurringRules(user?.uid || myName), [user?.uid, myName, rulesVersion]);
  // Partner's weekly pattern comes from their Firestore profile
  const partnerRules = useMemo<RecurringShiftRule[]>(
    () => partnerMember?.recurringRules ?? [],
    [partnerMember]
  );

  const effectiveMySchedule = useMemo(
    () => applyRecurringRules(rawMySchedule, myRules, days),
    [rawMySchedule, myRules, days]
  );

  const effectivePartnerDays = useMemo(
    () => applyRecurringRules(rawPartnerDays, partnerRules, days),
    [rawPartnerDays, partnerRules, days]
  );

  const synergy = computeSynergy(effectiveMySchedule, effectivePartnerDays, myName, partnerName);

  // Picker week data
  const pickerDays = useMemo(() => getWeekDays(pickerWeekId), [pickerWeekId]);
  const pickerWeekDoc = weeksMap[pickerWeekId] || null;
  const rawPickerMy = getScheduleDays(pickerWeekDoc, myName);
  const rawPickerPartner = isPaired ? getScheduleDays(pickerWeekDoc, partnerName) : undefined;

  const effectivePickerMySchedule = useMemo(
    () => applyRecurringRules(rawPickerMy, myRules, pickerDays),
    [rawPickerMy, myRules, pickerDays]
  );

  const effectivePickerPartnerDays = useMemo(
    () => applyRecurringRules(rawPickerPartner, partnerRules, pickerDays),
    [rawPickerPartner, partnerRules, pickerDays]
  );

  // Automatically roll over to the new current week (on tab resume, focus, or hourly)
  useEffect(() => {
    const checkWeekRollover = () => {
      const realCurrentWeek = getCurrentISOWeekId();
      if (isViewingCurrentWeek && currentWeekId !== realCurrentWeek) {
        setCurrentWeekId(realCurrentWeek);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkWeekRollover();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkWeekRollover);
    const interval = setInterval(checkWeekRollover, 60 * 60 * 1000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkWeekRollover);
      clearInterval(interval);
    };
  }, [isViewingCurrentWeek, currentWeekId]);

  const goToWeek = useCallback((weekId: string) => {
    setCurrentWeekId(weekId);
    setIsViewingCurrentWeek(weekId === getCurrentISOWeekId());
    setPickerDayIndex(null);
  }, []);

  const handleViewModeChange = (mode: 'week' | 'month') => {
    if (mode === 'month') {
      try {
        const monday = getMondayOfISOWeek(currentWeekId);
        setCurrentMonth({ year: monday.getFullYear(), monthIndex: monday.getMonth() });
      } catch (err) {
        console.error('Failed to sync month from week:', err);
      }
    } else {
      try {
        const monday = getMondayOfISOWeek(currentWeekId);
        if (monday.getFullYear() !== currentMonth.year || monday.getMonth() !== currentMonth.monthIndex) {
          const firstDayWeekId = getISOWeekId(new Date(currentMonth.year, currentMonth.monthIndex, 1, 12, 0, 0));
          setCurrentWeekId(firstDayWeekId);
          setIsViewingCurrentWeek(firstDayWeekId === getCurrentISOWeekId());
        }
      } catch (err) {
        console.error('Failed to sync week from month:', err);
      }
    }
    setViewMode(mode);
  };

  const handlePrevWeek = () => goToWeek(getAdjacentWeek(currentWeekId, -1));
  const handleNextWeek = () => goToWeek(getAdjacentWeek(currentWeekId, 1));
  const handleJumpToToday = () => goToWeek(getCurrentISOWeekId());

  const handlePrevMonth = () => {
    setCurrentMonth(prev => getAdjacentMonth(prev.year, prev.monthIndex, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => getAdjacentMonth(prev.year, prev.monthIndex, 1));
  };

  const handleJumpToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth({ year: now.getFullYear(), monthIndex: now.getMonth() });
  };

  const handleSaveShifts = async (dayKeys: DayKey[], status: ShiftType, hours: string) => {
    if (!myName) return;
    const weekDays = getWeekDays(pickerWeekId);
    setWeeksMap(prev => {
      const prevDoc = prev[pickerWeekId] || {
        id: pickerWeekId,
        coupleId: 'shared',
        members: [],
        year: parseInt(pickerWeekId.split('-W')[0], 10),
        weekNumber: parseInt(pickerWeekId.split('-W')[1], 10),
        startDate: weekDays[0]?.dateStr || '',
        endDate: weekDays[6]?.dateStr || '',
        schedules: {}
      };
      const userSched = prevDoc.schedules[myName] || initializeEmptySchedule();
      const updatedDays = { ...userSched.days };
      for (const k of dayKeys) {
        const dInfo = weekDays.find(d => d.dayKey === k);
        updatedDays[k] = {
          date: dInfo?.dateStr || '',
          dayOfWeek: k,
          status,
          customHours: hours,
          note: userSched.days[k]?.note || '',
          updatedAt: Date.now()
        };
      }
      return {
        ...prev,
        [pickerWeekId]: {
          ...prevDoc,
          schedules: {
            ...prevDoc.schedules,
            [myName]: {
              ...userSched,
              days: updatedDays,
              lastUpdatedAt: Date.now()
            }
          }
        }
      };
    });
    await Promise.all(dayKeys.map(k => saveDayStatus(pickerWeekId, myName, k, status, hours)));
  };

  const handleApplyDetectedShifts = async (detected: ParsedShiftResult[]) => {
    if (!myName) return;
    for (const shift of detected) {
      await saveDayStatus(currentWeekId, myName, shift.dayKey, shift.status, shift.hours);
    }
  };

  const handleCopyLastWeek = async (): Promise<number> => {
    if (!myName) return 0;
    const prevDoc = await fetchWeekOnce(getAdjacentWeek(currentWeekId, -1));
    const prevDays: Partial<Record<DayKey, DayShiftData>> = getScheduleDays(prevDoc, myName) || {};
    const toCopy = Object.values(prevDays).filter(d => d?.status && !d.isRecurring);
    for (const d of toCopy) {
      await saveDayStatus(currentWeekId, myName, d.dayOfWeek, d.status, d.customHours, d.note);
    }
    return toCopy.length;
  };

  const openPattern = () => {
    setIsAddOpen(false);
    setIsSettingsOpen(false);
    setIsPatternOpen(true);
  };

  const handleOpenDayPickerForWeek = (dayIndex: number) => {
    setPickerWeekId(currentWeekId);
    setPickerDayIndex(dayIndex);
  };

  const handleOpenDayPickerForMonth = (cell: MonthCalendarCell) => {
    setPickerWeekId(cell.isoWeekId);
    const targetDays = getWeekDays(cell.isoWeekId);
    const dayIdx = targetDays.findIndex(d => d.dayKey === cell.dayKey);
    setPickerDayIndex(dayIdx >= 0 ? dayIdx : 0);
  };

  // Swipe left/right on the main screen to change week or month
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const anySheetOpen = pickerDayIndex !== null || isAddOpen || isSettingsOpen || isPatternOpen || isSetupOpen;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (anySheetOpen) return;
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || anySheetOpen) {
      setTouchStart(null);
      return;
    }
    const diffX = e.changedTouches[0].clientX - touchStart.x;
    const diffY = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(diffX) > 70 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (viewMode === 'week') {
        if (diffX < 0) handleNextWeek();
        else handlePrevWeek();
      } else {
        if (diffX < 0) handleNextMonth();
        else handlePrevMonth();
      }
    }
    setTouchStart(null);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-xs text-outline">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  const handleSaveTypicalHours = async (
    collegeHours: string,
    collegeShort: string,
    workHours: string,
    workShort: string
  ) => {
    const updated = await saveUserSettings(user?.uid || myName, {
      typicalCollegeHours: collegeHours,
      typicalCollegeShort: collegeShort,
      typicalWorkHours: workHours,
      typicalWorkShort: workShort,
      setupCompleted: true,
    });
    setUserSettings(updated);
    setIsSetupOpen(false);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-surface text-on-surface font-body pb-28 select-none touch-pan-y"
    >
      <Header
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        currentWeekId={currentWeekId}
        isCurrentWeek={isViewingCurrentWeek}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onJumpToToday={handleJumpToToday}
        monthTitle={monthTitle}
        isCurrentMonth={isViewingCurrentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onJumpToCurrentMonth={handleJumpToCurrentMonth}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="px-3 py-3 max-w-md mx-auto">
        {viewMode === 'week' ? (
          <WeekView
            days={days}
            mySchedule={effectiveMySchedule}
            partnerDays={effectivePartnerDays}
            partnerName={partnerName}
            isPaired={isPaired}
            synergy={synergy}
            onTapDay={handleOpenDayPickerForWeek}
          />
        ) : (
          <MonthView
            year={currentMonth.year}
            monthIndex={currentMonth.monthIndex}
            todayStr={todayDateStr()}
            weeksMap={weeksMap}
            myRules={myRules}
            partnerRules={partnerRules}
            myName={myName}
            partnerName={partnerName}
            isPaired={isPaired}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onJumpToCurrentMonth={handleJumpToCurrentMonth}
            onEditDayShift={handleOpenDayPickerForMonth}
            onGoToWeek={(weekId) => {
              goToWeek(weekId);
              setViewMode('week');
            }}
          />
        )}
      </main>

      {/* Floating "Add shifts" button: Bottom-right "+" */}
      <button
        onClick={() => setIsAddOpen(true)}
        aria-label="Add shifts"
        className="fixed bottom-6 right-5 z-30 w-14 h-14 rounded-full bg-primary text-on-primary shadow-modal flex items-center justify-center text-2xl font-bold active:scale-95 transition-transform"
      >
        ＋
      </button>

      <ShiftPickerSheet
        isOpen={pickerDayIndex !== null}
        dayIndex={pickerDayIndex ?? 0}
        days={pickerDays}
        mySchedule={effectivePickerMySchedule}
        partnerDays={effectivePickerPartnerDays}
        partnerName={partnerName}
        isPaired={isPaired}
        typicalCollegeHours={userSettings.typicalCollegeHours}
        typicalCollegeShort={userSettings.typicalCollegeShort}
        typicalWorkHours={userSettings.typicalWorkHours}
        typicalWorkShort={userSettings.typicalWorkShort}
        onSave={handleSaveShifts}
        onChangeDay={idx => setPickerDayIndex(Math.max(0, Math.min(pickerDays.length - 1, idx)))}
        onClose={() => setPickerDayIndex(null)}
      />

      <AddShiftsSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onApplyDetected={handleApplyDetectedShifts}
        onOpenPattern={openPattern}
        onCopyLastWeek={handleCopyLastWeek}
      />

      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        myName={myName}
        email={user.email}
        patternCount={myRules.length}
        typicalCollegeShort={userSettings.typicalCollegeShort}
        typicalWorkShort={userSettings.typicalWorkShort}
        onOpenPattern={openPattern}
        onOpenTypicalHours={() => {
          setIsSettingsOpen(false);
          setIsSetupOpen(true);
        }}
        onLogout={logout}
      />

      <RecurringShiftsModal
        isOpen={isPatternOpen}
        onClose={() => setIsPatternOpen(false)}
        uid={user.uid || myName}
        onRulesChanged={() => setRulesVersion(v => v + 1)}
      />

      <FirstTimeSetupModal
        isOpen={isSetupOpen}
        initialCollege={userSettings.typicalCollegeShort}
        initialWork={userSettings.typicalWorkShort}
        canClose={userSettings.setupCompleted}
        onSave={handleSaveTypicalHours}
        onClose={() => setIsSetupOpen(false)}
      />
    </div>
  );
};

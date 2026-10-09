import { 
  doc, 
  onSnapshot, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { DayKey, ShiftType, TimeRange, WeekDocument, DayShiftData, PartnerSchedule } from '../types';
import { getWeekDays } from '../utils/isoWeek';

const MOCK_WEEKS_KEY = 'shitfts_mock_weeks';
const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('shitfts_sync_channel') : null;
const localMockListeners = new Set<(weekId: string) => void>();

export function initializeEmptySchedule(): PartnerSchedule {
  return {
    submitted: false,
    submittedAt: null,
    lastUpdatedAt: Date.now(),
    days: {} as Record<DayKey, DayShiftData>
  };
}

export function clearAllMockData(): void {
  localStorage.removeItem(MOCK_WEEKS_KEY);
  localMockListeners.forEach(listener => listener('ALL'));
  broadcast?.postMessage({ type: 'DATA_CLEARED' });
}

/**
 * Subscribes directly to a week document in `weeks/{isoWeekId}`.
 * No coupleId needed.
 */
export function subscribeToWeek(
  isoWeekId: string,
  onUpdate: (week: WeekDocument) => void
): () => void {
  const weekDays = getWeekDays(isoWeekId);
  const startDate = weekDays[0].dateStr;
  const endDate = weekDays[6].dateStr;
  const year = parseInt(isoWeekId.split('-W')[0], 10);
  const weekNumber = parseInt(isoWeekId.split('-W')[1], 10);

  if (!isFirebaseConfigured) {
    const loadMock = () => {
      const allWeeks = JSON.parse(localStorage.getItem(MOCK_WEEKS_KEY) || '{}');
      let weekDoc: WeekDocument = allWeeks[isoWeekId];

      if (!weekDoc) {
        weekDoc = {
          id: isoWeekId,
          coupleId: 'shared',
          members: [],
          year,
          weekNumber,
          startDate,
          endDate,
          schedules: {}
        };
        allWeeks[isoWeekId] = weekDoc;
        localStorage.setItem(MOCK_WEEKS_KEY, JSON.stringify(allWeeks));
      }

      onUpdate(weekDoc);
    };

    loadMock();

    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'WEEK_UPDATE' && event.data.isoWeekId === isoWeekId) {
        loadMock();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === MOCK_WEEKS_KEY) {
        loadMock();
      }
    };

    const handleLocalUpdate = (changedWeekId: string) => {
      if (changedWeekId === 'ALL' || changedWeekId === isoWeekId) {
        loadMock();
      }
    };

    localMockListeners.add(handleLocalUpdate);
    broadcast?.addEventListener('message', handleBroadcast);
    window.addEventListener('storage', handleStorage);

    return () => {
      localMockListeners.delete(handleLocalUpdate);
      broadcast?.removeEventListener('message', handleBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }

  // Real Firestore: direct collection `weeks/{isoWeekId}`
  const weekDocRef = doc(db, 'weeks', isoWeekId);
  return onSnapshot(weekDocRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as WeekDocument);
    } else {
      const initialDoc: WeekDocument = {
        id: isoWeekId,
        coupleId: 'shared',
        members: [],
        year,
        weekNumber,
        startDate,
        endDate,
        schedules: {}
      };
      onUpdate(initialDoc);
    }
  }, (err) => {
    console.error('Firestore snapshot listener error:', err);
  });
}

/**
 * Subscribes to multiple week documents simultaneously.
 * Invokes onUpdate with a map of { [isoWeekId]: WeekDocument } whenever any of the weeks change.
 */
export function subscribeToWeeks(
  isoWeekIds: string[],
  onUpdate: (weeksMap: Record<string, WeekDocument>) => void
): () => void {
  if (isoWeekIds.length === 0) {
    onUpdate({});
    return () => {};
  }

  const weeksMap: Record<string, WeekDocument> = {};
  const unsubs = isoWeekIds.map(weekId => {
    return subscribeToWeek(weekId, (weekDoc) => {
      weeksMap[weekId] = weekDoc;
      onUpdate({ ...weeksMap });
    });
  });

  return () => {
    unsubs.forEach(unsub => unsub());
  };
}

/**
 * Saves a day's shift status directly under the user's name: `schedules[userName].days[dayKey]`.
 */
export async function saveDayStatus(
  isoWeekId: string,
  userName: string,
  dayKey: DayKey,
  status: ShiftType,
  customHours?: string,
  note?: string,
  timeRange?: TimeRange
): Promise<void> {
  const weekDays = getWeekDays(isoWeekId);
  const dayInfo = weekDays.find(d => d.dayKey === dayKey)!;
  const year = parseInt(isoWeekId.split('-W')[0], 10);
  const weekNumber = parseInt(isoWeekId.split('-W')[1], 10);

  const dayPayload: DayShiftData = {
    date: dayInfo.dateStr,
    dayOfWeek: dayKey,
    status,
    customHours: customHours || (status === 'free' ? '100% Free' : status === 'work' ? '9:00A – 5:30P' : status === 'college' ? 'Classes' : 'Committed'),
    note: note || '',
    ...(timeRange ? { timeRange } : {}),
    updatedAt: Date.now()
  };

  if (!isFirebaseConfigured) {
    const allWeeks = JSON.parse(localStorage.getItem(MOCK_WEEKS_KEY) || '{}');
    const weekDoc: WeekDocument = allWeeks[isoWeekId] || {
      id: isoWeekId,
      coupleId: 'shared',
      members: [],
      year,
      weekNumber,
      startDate: weekDays[0].dateStr,
      endDate: weekDays[6].dateStr,
      schedules: {}
    };

    if (!weekDoc.schedules[userName]) {
      weekDoc.schedules[userName] = initializeEmptySchedule();
    }

    weekDoc.schedules[userName].days[dayKey] = dayPayload;
    weekDoc.schedules[userName].lastUpdatedAt = Date.now();

    allWeeks[isoWeekId] = weekDoc;
    localStorage.setItem(MOCK_WEEKS_KEY, JSON.stringify(allWeeks));

    localMockListeners.forEach(listener => listener(isoWeekId));
    broadcast?.postMessage({
      type: 'WEEK_UPDATE',
      isoWeekId
    });
    return;
  }

  // Real Firestore: direct setDoc with merge: true (creates doc if missing, merges schedule)
  const weekDocRef = doc(db, 'weeks', isoWeekId);
  await setDoc(weekDocRef, {
    id: isoWeekId,
    year,
    weekNumber,
    startDate: weekDays[0].dateStr,
    endDate: weekDays[6].dateStr,
    schedules: {
      [userName]: {
        lastUpdatedAt: serverTimestamp(),
        days: {
          [dayKey]: dayPayload
        }
      }
    }
  }, { merge: true });
}

export async function submitWeekSchedule(
  isoWeekId: string,
  userName: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    const allWeeks = JSON.parse(localStorage.getItem(MOCK_WEEKS_KEY) || '{}');
    const weekDoc: WeekDocument = allWeeks[isoWeekId];
    if (weekDoc && weekDoc.schedules[userName]) {
      weekDoc.schedules[userName].submitted = true;
      weekDoc.schedules[userName].submittedAt = Date.now();
      weekDoc.schedules[userName].lastUpdatedAt = Date.now();
      allWeeks[isoWeekId] = weekDoc;
      localStorage.setItem(MOCK_WEEKS_KEY, JSON.stringify(allWeeks));

      broadcast?.postMessage({
        type: 'WEEK_UPDATE',
        isoWeekId
      });
    }
    return;
  }

  const weekDocRef = doc(db, 'weeks', isoWeekId);
  await setDoc(weekDocRef, {
    schedules: {
      [userName]: {
        submitted: true,
        submittedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      }
    }
  }, { merge: true });
}

export async function saveRotaImage(
  isoWeekId: string,
  userName: string,
  imageDataUrl: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    const allWeeks = JSON.parse(localStorage.getItem(MOCK_WEEKS_KEY) || '{}');
    const weekDoc: WeekDocument = allWeeks[isoWeekId] || {
      id: isoWeekId,
      coupleId: 'shared',
      members: [],
      year: parseInt(isoWeekId.split('-W')[0], 10),
      weekNumber: parseInt(isoWeekId.split('-W')[1], 10),
      startDate: '',
      endDate: '',
      schedules: {}
    };

    if (!weekDoc.rotaImages) weekDoc.rotaImages = {};
    weekDoc.rotaImages[userName] = imageDataUrl;

    if (!weekDoc.schedules[userName]) {
      weekDoc.schedules[userName] = initializeEmptySchedule();
    }
    weekDoc.schedules[userName].rotaImageUrl = imageDataUrl;

    allWeeks[isoWeekId] = weekDoc;
    localStorage.setItem(MOCK_WEEKS_KEY, JSON.stringify(allWeeks));

    broadcast?.postMessage({
      type: 'WEEK_UPDATE',
      isoWeekId
    });
    return;
  }

  const weekDocRef = doc(db, 'weeks', isoWeekId);
  await setDoc(weekDocRef, {
    rotaImages: {
      [userName]: imageDataUrl
    },
    schedules: {
      [userName]: {
        rotaImageUrl: imageDataUrl,
        lastUpdatedAt: serverTimestamp()
      }
    }
  }, { merge: true });
}

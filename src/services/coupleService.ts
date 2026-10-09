import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  runTransaction 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Couple, UserProfile } from '../types';

// Generate a clean 6-character alphanumeric code without confusing chars (no 0/O, 1/I)
export function generatePairCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'SHFT-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Local mock storage keys
const MOCK_COUPLES_KEY = 'shitfts_mock_couples';
const MOCK_INVITES_KEY = 'shitfts_mock_invites';

export async function createCoupleSpace(user: UserProfile): Promise<Couple> {
  const coupleId = `cpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inviteCode = generatePairCode();

  const newCouple: Couple = {
    id: coupleId,
    members: [user.uid],
    memberDetails: {
      [user.uid]: {
        displayName: user.displayName || 'Partner 1',
        photoURL: user.photoURL,
        initial: (user.displayName || 'P').charAt(0).toUpperCase()
      }
    },
    inviteCode,
    createdAt: Date.now()
  };

  if (!isFirebaseConfigured) {
    const couples = JSON.parse(localStorage.getItem(MOCK_COUPLES_KEY) || '{}');
    couples[coupleId] = newCouple;
    localStorage.setItem(MOCK_COUPLES_KEY, JSON.stringify(couples));

    const invites = JSON.parse(localStorage.getItem(MOCK_INVITES_KEY) || '{}');
    invites[inviteCode] = { coupleId, createdBy: user.uid, status: 'pending' };
    localStorage.setItem(MOCK_INVITES_KEY, JSON.stringify(invites));

    return newCouple;
  }

  // Firebase Firestore Implementation
  const coupleRef = doc(db, 'couples', coupleId);
  const inviteRef = doc(db, 'invites', inviteCode);
  const userRef = doc(db, 'users', user.uid);

  await setDoc(coupleRef, {
    ...newCouple,
    createdAt: serverTimestamp()
  });

  await setDoc(inviteRef, {
    code: inviteCode,
    coupleId,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    status: 'pending'
  });

  await updateDoc(userRef, { coupleId });

  return newCouple;
}

export async function joinCoupleSpace(user: UserProfile, rawCode: string): Promise<Couple> {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const formattedCode = code.startsWith('SHFT-') ? code : `SHFT-${code}`;

  if (!isFirebaseConfigured) {
    const invites = JSON.parse(localStorage.getItem(MOCK_INVITES_KEY) || '{}');
    const invite = invites[formattedCode] || invites[code];

    if (!invite || invite.status !== 'pending') {
      throw new Error('Invalid or expired invite code. Please check with your crush.');
    }

    const couples = JSON.parse(localStorage.getItem(MOCK_COUPLES_KEY) || '{}');
    const couple: Couple = couples[invite.coupleId];

    if (!couple) {
      throw new Error('Couple space not found.');
    }

    if (couple.members.includes(user.uid)) {
      return couple;
    }

    couple.members.push(user.uid);
    couple.memberDetails[user.uid] = {
      displayName: user.displayName || 'Partner 2',
      photoURL: user.photoURL,
      initial: (user.displayName || 'P').charAt(0).toUpperCase()
    };

    couples[couple.id] = couple;
    localStorage.setItem(MOCK_COUPLES_KEY, JSON.stringify(couples));

    invite.status = 'claimed';
    localStorage.setItem(MOCK_INVITES_KEY, JSON.stringify(invites));

    return couple;
  }

  // Real Firestore Transaction
  const inviteRef = doc(db, 'invites', formattedCode);
  return await runTransaction(db, async (transaction) => {
    const inviteDoc = await transaction.get(inviteRef);
    if (!inviteDoc.exists() || inviteDoc.data().status !== 'pending') {
      throw new Error('Invalid or expired invite code.');
    }

    const { coupleId } = inviteDoc.data();
    const coupleRef = doc(db, 'couples', coupleId);
    const coupleDoc = await transaction.get(coupleRef);

    if (!coupleDoc.exists()) {
      throw new Error('Couple space could not be found.');
    }

    const coupleData = coupleDoc.data() as Couple;
    if (coupleData.members.length >= 2 && !coupleData.members.includes(user.uid)) {
      throw new Error('This couple space is already full (maximum 2 partners).');
    }

    const updatedMembers = Array.from(new Set([...coupleData.members, user.uid]));
    const updatedDetails = {
      ...coupleData.memberDetails,
      [user.uid]: {
        displayName: user.displayName || 'Partner 2',
        photoURL: user.photoURL || null,
        initial: (user.displayName || 'P').charAt(0).toUpperCase()
      }
    };

    transaction.update(coupleRef, {
      members: updatedMembers,
      memberDetails: updatedDetails
    });

    transaction.update(inviteRef, {
      status: 'claimed',
      claimedBy: user.uid,
      claimedAt: serverTimestamp()
    });

    transaction.update(doc(db, 'users', user.uid), {
      coupleId
    });

    return {
      ...coupleData,
      members: updatedMembers,
      memberDetails: updatedDetails
    };
  });
}

export async function getCoupleData(coupleId: string): Promise<Couple | null> {
  if (!isFirebaseConfigured) {
    const couples = JSON.parse(localStorage.getItem(MOCK_COUPLES_KEY) || '{}');
    return couples[coupleId] || null;
  }

  const coupleRef = doc(db, 'couples', coupleId);
  const snap = await getDoc(coupleRef);
  if (snap.exists()) {
    return snap.data() as Couple;
  }
  return null;
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, Couple } from '../types';
import { getCoupleData, createCoupleSpace, joinCoupleSpace } from '../services/coupleService';

interface AuthContextType {
  user: UserProfile | null;
  couple: Couple | null;
  loading: boolean;
  isFirebaseMode: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  createSpace: () => Promise<Couple>;
  joinSpace: (code: string) => Promise<Couple>;
  switchDemoProfile: (profile: 'kieran' | 'elena') => void;
  updateDisplayName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCouple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo profiles matching Google Stitch assets
const DEMO_KIERAN: UserProfile = {
  uid: 'usr_kieran_001',
  email: 'kieran@shitfts.app',
  displayName: 'Kieran',
  photoURL: '/assets/kieran-avatar.png',
  coupleId: 'cpl_kieran_elena'
};

const DEMO_ELENA: UserProfile = {
  uid: 'usr_elena_002',
  email: 'elena@shitfts.app',
  displayName: 'Elena',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  coupleId: 'cpl_kieran_elena'
};

const DEFAULT_DEMO_COUPLE: Couple = {
  id: 'cpl_kieran_elena',
  members: ['usr_kieran_001', 'usr_elena_002'],
  memberDetails: {
    'usr_kieran_001': {
      displayName: 'Kieran',
      photoURL: '/assets/kieran-avatar.png',
      initial: 'K'
    },
    'usr_elena_002': {
      displayName: 'Elena',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      initial: 'E'
    }
  },
  inviteCode: 'SHFT-SYNC',
  createdAt: Date.now()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth state
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // In demo/offline mode, initialize Kieran and Elena
      const savedUid = localStorage.getItem('shitfts_active_demo_uid') || DEMO_KIERAN.uid;
      const activeUser = savedUid === DEMO_ELENA.uid ? DEMO_ELENA : DEMO_KIERAN;
      setUser(activeUser);

      const couples = JSON.parse(localStorage.getItem('shitfts_mock_couples') || '{}');
      if (!couples[DEFAULT_DEMO_COUPLE.id]) {
        couples[DEFAULT_DEMO_COUPLE.id] = DEFAULT_DEMO_COUPLE;
        localStorage.setItem('shitfts_mock_couples', JSON.stringify(couples));
      }
      setCouple(couples[activeUser.coupleId || DEFAULT_DEMO_COUPLE.id] || DEFAULT_DEMO_COUPLE);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        let profile: UserProfile;
        if (userDoc.exists()) {
          profile = userDoc.data() as UserProfile;
          if (!profile.displayName && firebaseUser.email) {
            const raw = firebaseUser.email.split('@')[0];
            profile.displayName = raw.charAt(0).toUpperCase() + raw.slice(1);
          }
        } else {
          const raw = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'You';
          const defaultName = firebaseUser.displayName || (raw.charAt(0).toUpperCase() + raw.slice(1));
          profile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: defaultName,
            photoURL: firebaseUser.photoURL,
            coupleId: null
          };
          await setDoc(userDocRef, profile);
        }

        setUser(profile);

        if (profile.coupleId) {
          const coupleData = await getCoupleData(profile.coupleId);
          setCouple(coupleData);
        } else {
          setCouple(null);
        }
      } else {
        setUser(null);
        setCouple(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshCouple = async () => {
    if (!user?.coupleId) return;
    const coupleData = await getCoupleData(user.coupleId);
    setCouple(coupleData);
  };

  const switchDemoProfile = (profile: 'kieran' | 'elena') => {
    const nextUser = profile === 'elena' ? DEMO_ELENA : DEMO_KIERAN;
    localStorage.setItem('shitfts_active_demo_uid', nextUser.uid);
    setUser(nextUser);
    const couples = JSON.parse(localStorage.getItem('shitfts_mock_couples') || '{}');
    setCouple(couples[nextUser.coupleId || DEFAULT_DEMO_COUPLE.id] || DEFAULT_DEMO_COUPLE);
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) return;
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (!isFirebaseConfigured) return;
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    if (!isFirebaseConfigured) return;
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
  };

  const createSpace = async (): Promise<Couple> => {
    if (!user) throw new Error('Must be signed in to create a space');
    const newCouple = await createCoupleSpace(user);
    setCouple(newCouple);
    setUser(prev => prev ? { ...prev, coupleId: newCouple.id } : null);
    return newCouple;
  };

  const joinSpace = async (code: string): Promise<Couple> => {
    if (!user) throw new Error('Must be signed in to join a space');
    const joinedCouple = await joinCoupleSpace(user, code);
    setCouple(joinedCouple);
    setUser(prev => prev ? { ...prev, coupleId: joinedCouple.id } : null);
    return joinedCouple;
  };

  const updateDisplayName = async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName || !user) return;
    if (isFirebaseConfigured && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: cleanName });
      await setDoc(doc(db, 'users', user.uid), { displayName: cleanName }, { merge: true });
    }
    setUser(prev => prev ? { ...prev, displayName: cleanName } : null);
  };

  const logout = async () => {
    if (isFirebaseConfigured) {
      await signOut(auth);
    } else {
      localStorage.removeItem('shitfts_active_demo_uid');
      setUser(null);
      setCouple(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        couple,
        loading,
        isFirebaseMode: isFirebaseConfigured,
        signInWithGoogle,
        loginWithEmail,
        signupWithEmail,
        createSpace,
        joinSpace,
        switchDemoProfile,
        updateDisplayName,
        logout,
        refreshCouple
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

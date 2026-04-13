import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, query, where, collection, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  address?: string;
  role: 'user' | 'admin' | 'doctor' | 'pharmacy' | 'physio' | 'hospital' | 'ambulance' | 'lab';
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const timeout = setTimeout(() => {
      if (loading) {
        setError("Connection timeout. Please check your internet or try refreshing.");
        setLoading(false);
      }
    }, 15000);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(timeout);
      
      // Cleanup previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Real-time listener for the user's profile
      const userRef = doc(db, 'users', firebaseUser.uid);
      unsubProfile = onSnapshot(userRef, async (userDoc) => {
        try {
          if (!userDoc.exists()) {
            // Check for manual entry (placeholder created by admin)
            const cleanEmail = firebaseUser.email?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
            const manualRef = doc(db, 'users', `email_${cleanEmail}`);
            const manualDoc = await getDoc(manualRef);
            
            let manualData: any = null;
            if (manualDoc.exists()) {
              manualData = manualDoc.data();
            }
            
            const isDefaultAdmin = firebaseUser.email?.toLowerCase() === 'shustobd@gmail.com';
            const role = isDefaultAdmin ? 'admin' : (manualData?.role || 'user');
            
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || manualData?.displayName || 'User',
              email: firebaseUser.email?.toLowerCase() || null,
              photoURL: firebaseUser.photoURL || manualData?.photoURL || null,
              role: role as any
            };
            
            await setDoc(userRef, newProfile);
            if (manualDoc.exists()) {
              await deleteDoc(manualRef).catch(console.error);
            }
            // State will be updated by the next snapshot
          } else {
            const existingData = userDoc.data() as UserProfile;
            
            // Check for manual role updates (e.g. admin added them as doctor while they were offline)
            const cleanEmail = firebaseUser.email?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
            const manualRef = doc(db, 'users', `email_${cleanEmail}`);
            const manualDoc = await getDoc(manualRef);
            
            if (manualDoc.exists()) {
              const manualData = manualDoc.data();
              if (manualData.role && manualData.role !== existingData.role) {
                await updateDoc(userRef, { role: manualData.role });
                await deleteDoc(manualRef).catch(console.error);
                return; // Next snapshot will handle it
              }
            }

            const isDefaultAdmin = firebaseUser.email?.toLowerCase() === 'shustobd@gmail.com';
            if (isDefaultAdmin && existingData.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin' });
            } else {
              setUser(existingData);
            }
          }
        } catch (err) {
          console.error("Profile sync error:", err);
          if (firebaseUser) {
            setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email?.toLowerCase() || null,
              photoURL: firebaseUser.photoURL,
              role: firebaseUser.email?.toLowerCase() === 'shustobd@gmail.com' ? 'admin' : 'user'
            });
          }
        } finally {
          setLoading(false);
        }
      }, (err) => {
        console.error("Snapshot error:", err);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const login = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

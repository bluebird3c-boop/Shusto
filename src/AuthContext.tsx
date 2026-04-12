import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, query, where, collection, getDocs, deleteDoc } from 'firebase/firestore';
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
    const timeout = setTimeout(() => {
      if (loading) {
        setError("Connection timeout. Please check your internet or try refreshing.");
        setLoading(false);
      }
    }, 15000); // 15 seconds timeout

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);
      setLoading(true);
      setError(null);
      try {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            // Check for manual entry
            const manualRef = doc(db, 'users', `email_${firebaseUser.email}`);
            let manualData: any = null;
            try {
              const manualDoc = await getDoc(manualRef);
              if (manualDoc.exists()) {
                manualData = manualDoc.data();
              }
            } catch (e) {
              console.log("No manual entry found or permission denied for manual check");
            }
            
            const role = firebaseUser.email === 'shustobd@gmail.com' ? 'admin' : (manualData?.role || 'user');
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || manualData?.displayName || 'User',
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || manualData?.photoURL || null,
              role: role as any
            };
            
            await setDoc(userRef, newProfile);
            if (manualData) {
              try {
                await deleteDoc(manualRef);
              } catch (e) {
                console.log("Could not delete manual entry, but profile created");
              }
            }
            setUser(newProfile);
          } else {
            const existingData = userDoc.data() as UserProfile;
            if (firebaseUser.email === 'shustobd@gmail.com' && existingData.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin' });
              setUser({ ...existingData, role: 'admin' });
            } else {
              setUser(existingData);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth sync error:", error);
        // Even if Firestore fails, we can set a basic user object from firebaseUser
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            role: firebaseUser.email === 'shustobd@gmail.com' ? 'admin' : 'user'
          });
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
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

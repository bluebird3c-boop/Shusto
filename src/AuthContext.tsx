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
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Sync user to Firestore
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            // Check if there's a manual entry with this email
            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              // Found a manual entry, "claim" it by updating UID
              const manualDoc = querySnapshot.docs[0];
              const manualData = manualDoc.data();
              
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || manualData.displayName,
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL || manualData.photoURL,
                role: manualData.role
              };
              
              // If it's the admin email, force admin role
              if (firebaseUser.email === 'shustobd@gmail.com') {
                newProfile.role = 'admin';
              }
              
              await setDoc(userRef, newProfile);
              // Delete the old manual entry if it had a different UID
              if (manualData.uid !== firebaseUser.uid) {
                await deleteDoc(doc(db, 'users', manualData.uid));
              }
              setUser(newProfile);
            } else {
              // No manual entry, create new user
              const role = firebaseUser.email === 'shustobd@gmail.com' ? 'admin' : 'user';
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName,
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL,
                role: role as any
              };
              await setDoc(userRef, newProfile);
              setUser(newProfile);
            }
          } else {
            const existingData = userDoc.data() as UserProfile;
            // Force admin role for the specific email
            if (firebaseUser.email === 'shustobd@gmail.com' && existingData.role !== 'admin') {
              const updatedProfile = { ...existingData, role: 'admin' as const };
              await updateDoc(userRef, { role: 'admin' });
              setUser(updatedProfile);
            } else {
              setUser(existingData);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth sync error:", error);
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
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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

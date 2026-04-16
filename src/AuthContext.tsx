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
  forceSync: () => Promise<void>;
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
            const email = firebaseUser.email?.toLowerCase().trim() || null;
            const cleanEmail = email?.replace(/[^a-zA-Z0-9]/g, '_');
            const manualId = `email_${cleanEmail}`;
            const manualRef = doc(db, 'users', manualId);
            const manualDoc = await getDoc(manualRef);
            
            let manualData: any = null;
            if (manualDoc.exists()) {
              manualData = manualDoc.data();
            }
            
            const isDefaultAdmin = email === 'shustobd@gmail.com';
            let role = isDefaultAdmin ? 'admin' : (manualData?.role || 'user');
            
            // Proactive Provider Check: Check all provider collections by email if not found in manual placeholder
            if (role === 'user' && email) {
              const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'];
              for (const collectionName of providerCollections) {
                const q = query(collection(db, collectionName), where('email', '==', email));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                  const data = snapshot.docs[0].data();
                  role = collectionName === 'doctors' ? 'doctor' : 
                         collectionName === 'pharmacies' ? 'pharmacy' : 
                         collectionName === 'labs' ? 'lab' : 
                         collectionName === 'physios' ? 'physio' : 
                         collectionName === 'hospitals' ? 'hospital' : 'ambulance';
                  manualData = { ...manualData, ...data };
                  break;
                }
              }
            }

            // Extra safety: If they have doctor-specific data, they should be a doctor
            if (manualData?.bmdcNumber && role === 'user') {
              role = 'doctor';
            }
            
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || manualData?.displayName || 'User',
              email: email,
              photoURL: firebaseUser.photoURL || manualData?.photoURL || null,
              role: role as any,
              // Copy all additional fields from manual placeholder (BMDC, Fee, Specialty, etc.)
              ...(manualData || {})
            };
            // Ensure UID and Email are correct even if manualData had something else
            newProfile.uid = firebaseUser.uid;
            newProfile.email = email;
            
            await setDoc(userRef, newProfile);
            if (manualDoc.exists()) {
              // Sync any appointments that were booked using the placeholder email ID
              const appointmentsQuery = query(collection(db, 'appointments'), where('targetId', '==', manualId));
              const appointmentsSnapshot = await getDocs(appointmentsQuery);
              if (!appointmentsSnapshot.empty) {
                const syncPromises = appointmentsSnapshot.docs.map(appDoc => 
                  updateDoc(doc(db, 'appointments', appDoc.id), { targetId: firebaseUser.uid })
                );
                await Promise.all(syncPromises);
              }
              await deleteDoc(manualRef).catch(console.error);
            }
            // State will be updated by the next snapshot
          } else {
            const existingData = userDoc.data() as UserProfile;
            
            // Check for manual role updates (e.g. admin added them as doctor while they were offline)
            const email = firebaseUser.email?.toLowerCase().trim();
            const cleanEmail = email?.replace(/[^a-zA-Z0-9]/g, '_');
            const manualRef = doc(db, 'users', `email_${cleanEmail}`);
            const manualDoc = await getDoc(manualRef);
            
            if (manualDoc.exists()) {
              const manualData = manualDoc.data();
              if (manualData.role && (manualData.role !== existingData.role || manualData.bmdcNumber !== (existingData as any).bmdcNumber)) {
                // Sync all manual data to the existing user profile
                await updateDoc(userRef, { 
                  ...manualData,
                  uid: firebaseUser.uid, // Keep original UID
                  email: email // Keep original email
                });
                await deleteDoc(manualRef).catch(console.error);
                return; // Next snapshot will handle it
              }
            }

            const isDefaultAdmin = email === 'shustobd@gmail.com';
            if (isDefaultAdmin && existingData.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin' });
            } else {
              // Proactive Provider Check for existing users
              if (existingData.role === 'user' && email) {
                const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'];
                let foundProvider = false;
                
                for (const collectionName of providerCollections) {
                  const q = query(collection(db, collectionName), where('email', '==', email));
                  const snapshot = await getDocs(q);
                  if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    const newRole = collectionName === 'doctors' ? 'doctor' : 
                                   collectionName === 'pharmacies' ? 'pharmacy' : 
                                   collectionName === 'labs' ? 'lab' : 
                                   collectionName === 'physios' ? 'physio' : 
                                   collectionName === 'hospitals' ? 'hospital' : 'ambulance';
                    
                    const updateData: any = { role: newRole };
                    if (newRole === 'doctor') {
                      updateData.specialty = data.specialty;
                      updateData.fee = data.fee;
                      updateData.bmdcNumber = data.bmdcNumber;
                      updateData.experience = data.experience;
                    }
                    
                    await updateDoc(userRef, updateData);
                    foundProvider = true;
                    break;
                  }
                }
                if (foundProvider) return;
              }

              // Extra safety: If they have doctor data but role is 'user', fix it
              if ((existingData as any).bmdcNumber && existingData.role === 'user') {
                await updateDoc(userRef, { role: 'doctor' });
              } else {
                setUser(existingData);
              }
            }
          }
        } catch (err) {
          console.error("Profile sync error:", err);
          // If we have existing user data in state, don't overwrite it with a fallback
          if (firebaseUser && !user) {
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

  const forceSync = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const email = auth.currentUser.email?.toLowerCase().trim();
      if (!email) return;

      const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'];
      for (const collectionName of providerCollections) {
        const q = query(collection(db, collectionName), where('email', '==', email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const newRole = collectionName === 'doctors' ? 'doctor' : 
                         collectionName === 'pharmacies' ? 'pharmacy' : 
                         collectionName === 'labs' ? 'lab' : 
                         collectionName === 'physios' ? 'physio' : 
                         collectionName === 'hospitals' ? 'hospital' : 'ambulance';
          
          const updateData: any = { role: newRole };
          if (newRole === 'doctor') {
            updateData.specialty = data.specialty;
            updateData.fee = data.fee;
            updateData.bmdcNumber = data.bmdcNumber;
            updateData.experience = data.experience;
          }
          
          await updateDoc(doc(db, 'users', auth.currentUser.uid), updateData);
          break;
        }
      }
    } catch (err) {
      console.error("Force sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, forceSync }}>
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

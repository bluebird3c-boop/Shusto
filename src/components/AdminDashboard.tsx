import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, where, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User as UserIcon, Shield, Stethoscope, Pill, FlaskConical, Truck, Building, Activity, Plus, X, Trash2, Search, Camera, RefreshCcw, DollarSign, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { TransactionsPanel } from './TransactionsPanel';

import { AMBULANCE_ROUTES, LAB_SERVICES_PRESETS, PHYSIO_SERVICES_PRESETS } from '../constants';
import { BANGLADESH_LOCATIONS } from '../constants/locations';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  photoURL?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  fee: number;
  image?: string;
  bmdcNumber?: string;
  experience?: string;
  email: string;
}

interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  generic?: string;
  company?: string;
}

interface GenericService {
  id: string;
  name: string;
  category: string;
  price: number;
  type: 'lab' | 'physio';
}

interface Provider {
  id: string;
  name: string;
  location: string;
  contact?: string;
  email: string;
  type: 'pharmacy' | 'lab' | 'physio' | 'hospital' | 'ambulance';
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'patients' | 'doctors' | 'medicines' | 'pharmacies' | 'labs' | 'physios' | 'hospitals' | 'ambulances' | 'transactions' | 'services'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [manualDoctors, setManualDoctors] = useState<Doctor[]>([]);
  const [userDoctors, setUserDoctors] = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [pharmacies, setPharmacies] = useState<Provider[]>([]);
  const [labs, setLabs] = useState<Provider[]>([]);
  const [physios, setPhysios] = useState<Provider[]>([]);
  const [hospitals, setHospitals] = useState<Provider[]>([]);
  const [ambulances, setAmbulances] = useState<Provider[]>([]);
  const [labTests, setLabTests] = useState<GenericService[]>([]);
  const [physioServices, setPhysioServices] = useState<GenericService[]>([]);
  const [adminBalance, setAdminBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [updatingDoctorId, setUpdatingDoctorId] = useState<string | null>(null);
  
  // Form states
  const [newDoctor, setNewDoctor] = useState({ name: '', specialty: '', fee: 0, bmdcNumber: '', experience: '', email: '', image: '', division: '', district: '' });
  const [newProvider, setNewProvider] = useState({ name: '', location: '', contact: '', email: '', division: '', district: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleModal, setShowRoleModal] = useState<{ user: UserProfile, role: string } | null>(null);
  const [roleDetails, setRoleDetails] = useState({ specialty: 'General Physician', fee: 500, bmdcNumber: 'Pending', location: 'Pending', contact: 'Pending', division: '', district: '' });

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const name = (u.displayName || 'User').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || email.includes(term);
    }).filter(u => activeTab === 'users' ? true : u.role === 'user');
  }, [users, searchTerm, activeTab]);

  const handlePromoteUser = async () => {
    if (!showRoleModal) return;
    const { user, role } = showRoleModal;
    
    setLoading(true);
    try {
      // Update user document
      const updateData: any = { role: role };
      if (['doctor', 'pharmacy', 'lab', 'physio', 'hospital', 'ambulance'].includes(role)) {
        Object.assign(updateData, roleDetails);
      }
      
      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      // Update/Create record in specialized collection
      const collectionName = role === 'doctor' ? 'doctors' : 
                           role === 'pharmacy' ? 'pharmacies' : 
                           role === 'lab' ? 'labs' : 
                           role === 'physio' ? 'physios' : 
                           role === 'hospital' ? 'hospitals' : 'ambulances';
      
      if (role !== 'user' && role !== 'admin') {
        const providerId = `u_${user.uid}`;
        await setDoc(doc(db, collectionName, providerId), {
          id: providerId,
          name: user.displayName || 'Unnamed Provider',
          email: user.email,
          type: role,
          userId: user.uid,
          ...roleDetails,
          updatedAt: new Date().toISOString()
        });
      }

      showSuccess(`${user.displayName} is now a ${role}!`);
      setShowRoleModal(null);
    } catch (error) {
      console.error("Promotion error:", error);
      alert("Failed to promote user.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(allUsers);
      
      // Filter users who are doctors
      const uDocs = allUsers.filter(u => u.role === 'doctor').map(u => ({
        id: u.uid,
        name: u.displayName || 'Unnamed Doctor',
        email: u.email || '',
        specialty: (u as any).specialty || 'General Physician',
        fee: (u as any).fee || 0,
        bmdcNumber: (u as any).bmdcNumber,
        experience: (u as any).experience,
        image: (u as any).image || u.photoURL,
        isUserAccount: true
      })) as any[];
      setUserDoctors(uDocs);
    });

    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      setManualDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor)));
    });

    const unsubMedicines = onSnapshot(collection(db, 'medicines'), (snapshot) => {
      setMedicines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine)));
    });

    const unsubPharmacies = onSnapshot(collection(db, 'pharmacies'), (snapshot) => {
      setPharmacies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider)));
    });

    const unsubLabs = onSnapshot(collection(db, 'labs'), (snapshot) => {
      setLabs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider)));
    });

    const unsubPhysios = onSnapshot(collection(db, 'physios'), (snapshot) => {
      setPhysios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider)));
    });

    const unsubHospitals = onSnapshot(collection(db, 'hospitals'), (snapshot) => {
      setHospitals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider)));
    });

    const unsubAmbulances = onSnapshot(collection(db, 'ambulances'), (snapshot) => {
      setAmbulances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider)));
    });

    const unsubLabTests = onSnapshot(collection(db, 'labTests'), (snapshot) => {
      setLabTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GenericService)));
    });

    const unsubPhysioServices = onSnapshot(collection(db, 'physioServices'), (snapshot) => {
      setPhysioServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GenericService)));
    });

    setLoading(false);
    return () => {
      unsubUsers();
      unsubDoctors();
      unsubMedicines();
      unsubPharmacies();
      unsubLabs();
      unsubPhysios();
      unsubHospitals();
      unsubAmbulances();
      unsubLabTests();
      unsubPhysioServices();
    };
  }, []);

  // Dedicated Admin Wallet Listener
  useEffect(() => {
    const adminEmail = 'shustobd@gmail.com';
    const q = query(collection(db, 'users'), where('email', '==', adminEmail));
    
    let unsubWallet: (() => void) | null = null;
    
    const unsubUser = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const adminId = snapshot.docs[0].id;
        if (unsubWallet) unsubWallet();
        unsubWallet = onSnapshot(doc(db, 'wallets', adminId), (walletDoc) => {
          if (walletDoc.exists()) {
            setAdminBalance(walletDoc.data().balance || 0);
          }
        });
      }
    });

    return () => {
      unsubUser();
      if (unsubWallet) unsubWallet();
    };
  }, []);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newDoctor.email.toLowerCase().trim();
    const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const id = `doc_${cleanEmail}`;
    const existing = manualDoctors.find(d => d.id === id);
    
    try {
      // 1. Find if a user already exists with this email to get their real UID
      let realUserId = null;
      const userQuery = query(collection(db, 'users'), where('email', '==', email));
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        realUserId = userSnapshot.docs[0].id;
      }

      // 2. Update or create manual doctor record in 'doctors' collection
      const doctorData = { 
        ...newDoctor, 
        email,
        id,
        division: newDoctor.division,
        district: newDoctor.district,
        userId: realUserId || `email_${cleanEmail}`, // Store the best available ID
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'doctors', id), doctorData);

      // 3. Update ALL user accounts with this email to have the 'doctor' role and sync data
      const syncData = {
        role: 'doctor',
        specialty: newDoctor.specialty,
        fee: newDoctor.fee,
        bmdcNumber: newDoctor.bmdcNumber,
        experience: newDoctor.experience,
        image: newDoctor.image,
        photoURL: newDoctor.image, // Sync to profile photo too
        displayName: newDoctor.name, // Ensure name is synced
        division: newDoctor.division,
        district: newDoctor.district
      };

      if (!userSnapshot.empty) {
        const updatePromises = userSnapshot.docs.map(userDoc => 
          updateDoc(doc(db, 'users', userDoc.id), syncData)
        );
        await Promise.all(updatePromises);
      } else {
        // 4. Create a placeholder for when they login if no user exists yet
        const manualId = `email_${cleanEmail}`;
        await setDoc(doc(db, 'users', manualId), {
          ...syncData,
          email,
          uid: manualId,
          createdAt: new Date().toISOString()
        });
      }
      
      setNewDoctor({ name: '', specialty: '', fee: 0, bmdcNumber: '', experience: '', email: '', image: '' });
      setShowAddModal(false);
      showSuccess(existing ? "Doctor info and role updated!" : "Doctor added successfully!");
    } catch (error) {
      console.error("Error adding doctor:", error);
      handleFirestoreError(error, OperationType.WRITE, 'doctors');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (updatingDoctorId) {
          // Find if it's a user account or manual doctor
          const isUser = userDoctors.some(d => d.id === updatingDoctorId);
          const collectionName = isUser ? 'users' : 'doctors';
          
          try {
            await updateDoc(doc(db, collectionName, updatingDoctorId), { 
              image: base64,
              ...(isUser ? { photoURL: base64 } : {})
            });
            showSuccess("Doctor photo updated!");
          } catch (error) {
            console.error("Error updating photo:", error);
            alert("Failed to update photo. The image might be too large.");
          }
          setUpdatingDoctorId(null);
        } else {
          // New doctor form
          setNewDoctor(prev => ({ ...prev, image: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddGeneralProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const type = activeTab === 'pharmacies' ? 'pharmacy' : 
                   activeTab === 'labs' ? 'lab' : 
                   activeTab === 'physios' ? 'physio' : 
                   activeTab === 'hospitals' ? 'hospital' : 'ambulance';
      
      const collectionName = activeTab;
      const cleanName = newProvider.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const id = `${type}_${cleanName}`;
      
      console.log(`Adding provider to ${collectionName} with ID ${id}`, newProvider);
      
      await setDoc(doc(db, collectionName, id), { 
        ...newProvider, 
        id, 
        type,
        division: newProvider.division,
        district: newProvider.district
      });

      // Update ALL user accounts with this email to have the correct role
      const email = newProvider.email.toLowerCase();
      const userQuery = query(collection(db, 'users'), where('email', '==', email));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const updatePromises = userSnapshot.docs.map(userDoc => 
          updateDoc(doc(db, 'users', userDoc.id), { 
            role: type,
            division: newProvider.division,
            district: newProvider.district
          })
        );
        await Promise.all(updatePromises);
      } else {
        // Create a placeholder for when they login
        const manualId = `email_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        await setDoc(doc(db, 'users', manualId), {
          email,
          role: type,
          displayName: newProvider.name,
          uid: manualId,
          division: newProvider.division,
          district: newProvider.district
        });
      }
      
      setNewProvider({ name: '', location: '', contact: '', email: '' });
      setShowAddModal(false);
      showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`);
    } catch (error) {
      console.error("Error adding provider:", error);
      handleFirestoreError(error, OperationType.WRITE, activeTab);
    }
  };

  // Merge manual doctors and user doctors into a single list by email to prevent duplicates
  const allDoctors = useMemo(() => {
    const doctorMap = new Map<string, Doctor>();
    
    // Process manual doctors first
    manualDoctors.forEach(doc => {
      if (doc.email) {
        doctorMap.set(doc.email.toLowerCase(), doc);
      }
    });
    
    // Process user doctors - if email matches, user account data takes precedence for real-time status
    userDoctors.forEach(uDoc => {
      if (uDoc.email) {
        const email = uDoc.email.toLowerCase();
        const existing = doctorMap.get(email);
        doctorMap.set(email, {
          ...(existing || {}),
          ...uDoc,
          id: uDoc.id, // Use the real UID as the primary ID
          isUserAccount: true
        } as Doctor);
      }
    });
    
    return Array.from(doctorMap.values());
  }, [manualDoctors, userDoctors]);

  const cleanupDoctors = async () => {
    if (confirm('This will only remove manual entries that have no email or name. User accounts will NOT be affected. Continue?')) {
      let manualDeleted = 0;

      for (const docItem of manualDoctors) {
        if (!docItem.email || !docItem.name) {
          await deleteDoc(doc(db, 'doctors', docItem.id));
          manualDeleted++;
        }
      }

      showSuccess(`Cleanup complete! Removed ${manualDeleted} invalid manual entries.`);
    }
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (confirm('Are you sure you want to delete this?')) {
      await deleteDoc(doc(db, collectionName, id));
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const userToUpdate = users.find(u => u.uid === userId);
      
      // Update user document with role and default doctor fields if needed
      const updateData: any = { role: newRole };
      if (newRole === 'doctor') {
        updateData.specialty = 'General Physician';
        updateData.fee = 500;
        updateData.bmdcNumber = 'Pending';
      }
      
      await updateDoc(doc(db, 'users', userId), updateData);
      
      // If the user being updated is a provider, we should also ensure they have a record in the respective collection
      if (userToUpdate && ['doctor', 'pharmacy', 'lab', 'physio', 'hospital', 'ambulance'].includes(newRole)) {
        const collectionName = newRole === 'doctor' ? 'doctors' : 
                             newRole === 'pharmacy' ? 'pharmacies' : 
                             newRole === 'lab' ? 'labs' : 
                             newRole === 'physio' ? 'physios' : 
                             newRole === 'hospital' ? 'hospitals' : 'ambulances';
        
        const providerId = `u_${userId}`;
        const providerRef = doc(db, collectionName, providerId);
        const providerDoc = await getDoc(providerRef);
        
        if (!providerDoc.exists()) {
          // Create a basic provider record so they show up in directories
          await setDoc(providerRef, {
            id: providerId,
            name: userToUpdate.displayName || 'Unnamed Provider',
            email: userToUpdate.email,
            type: newRole,
            userId: userId,
            // Default values for doctors
            ...(newRole === 'doctor' ? { specialty: 'General Physician', fee: 500, bmdcNumber: 'Pending' } : { location: 'Pending', contact: 'Pending' })
          });
        }
      }

      setUsers(users.map(u => u.uid === userId ? { ...u, ...updateData } : u));
      showSuccess(`Role updated to ${newRole} successfully!`);
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role. Please check permissions.");
    }
  };

  const handleAddProvider = null; // Removed as requested

  const syncUserRole = async (targetUser: UserProfile) => {
    setLoading(true);
    try {
      const email = targetUser.email.toLowerCase().trim();
      const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'];
      let found = false;

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
          
          await updateDoc(doc(db, 'users', targetUser.uid), updateData);
          found = true;
          showSuccess(`Synced ${targetUser.displayName} as ${newRole}!`);
          break;
        }
      }

      if (!found) {
        alert(`No provider record found for ${email}. User remains as ${targetUser.role}.`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync user role.");
    } finally {
      setLoading(false);
    }
  };

  const syncAllRoles = async () => {
    setLoading(true);
    try {
      const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'];
      let totalSynced = 0;

      for (const collectionName of providerCollections) {
        const snapshot = await getDocs(collection(db, collectionName));
        for (const pSnap of snapshot.docs) {
          const pData = pSnap.data();
          if (pData.email) {
            const email = pData.email.toLowerCase().trim();
            const userQuery = query(collection(db, 'users'), where('email', '==', email));
            const userSnapshot = await getDocs(userQuery);
            
            const newRole = collectionName === 'doctors' ? 'doctor' : 
                           collectionName === 'pharmacies' ? 'pharmacy' : 
                           collectionName === 'labs' ? 'lab' : 
                           collectionName === 'physios' ? 'physio' : 
                           collectionName === 'hospitals' ? 'hospital' : 'ambulance';

            for (const userDoc of userSnapshot.docs) {
              const updateData: any = { role: newRole };
              if (newRole === 'doctor') {
                updateData.specialty = pData.specialty;
                updateData.fee = pData.fee;
                updateData.bmdcNumber = pData.bmdcNumber;
                updateData.experience = pData.experience;
              }
              await updateDoc(doc(db, 'users', userDoc.id), updateData);
              totalSynced++;
            }
          }
        }
      }

      showSuccess(`Successfully synced ${totalSynced} user roles!`);
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync roles.");
    } finally {
      setLoading(false);
    }
  };

  const seedMedicines = async () => {
    if (!confirm('This will seed a collection of 20+ common medicines with realistic data. Continue?')) return;
    setLoading(true);
    try {
      const medicinePresets = [
        { name: 'Napa Extend', generic: 'Paracetamol', category: 'Fever & Pain', price: 15, company: 'Beximco', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800' },
        { name: 'Seclo 20', generic: 'Omeprazole', category: 'Gastric', price: 7, company: 'Square', image: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?q=80&w=800' },
        { name: 'Fenadin 120', generic: 'Fexofenadine', category: 'Allergy', price: 10, company: 'Renata', image: 'https://images.unsplash.com/photo-1628771065518-0d82f1110547?q=80&w=800' },
        { name: 'Zithrin 500', generic: 'Azithromycin', category: 'Antibiotic', price: 35, company: 'Radiant', image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?q=80&w=800' },
        { name: 'Calbo-D', generic: 'Calcium + Vitamin D3', category: 'Supplements', price: 250, company: 'Square', image: 'https://images.unsplash.com/photo-1559113084-25e50529d1bd?q=80&w=800' },
        { name: 'Alatrol', generic: 'Cetirizine', category: 'Allergy', price: 5, company: 'Square', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800' },
        { name: 'Monas 10', generic: 'Montelukast', category: 'Asthma', price: 18, company: 'Acme', image: 'https://images.unsplash.com/photo-1579349281204-9e9005bc1ddd?q=80&w=800' },
        { name: 'Sergel 20', generic: 'Esomeprazole', category: 'Gastric', price: 8, company: 'Healthcare', image: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?q=80&w=800' },
        { name: 'Ace Plus', generic: 'Paracetamol + Caffeine', category: 'Fever & Pain', price: 3, company: 'Square', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800' },
        { name: 'Tofen', generic: 'Ketotifen', category: 'Asthma', price: 4, company: 'Beximco', image: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?q=80&w=800' },
        { name: 'Bextram Gold', generic: 'Multivitamin', category: 'Supplements', price: 450, company: 'Beximco', image: 'https://images.unsplash.com/photo-1559113084-25e50529d1bd?q=80&w=800' },
        { name: 'Orsaline N', generic: 'ORS', category: 'Nutrition', price: 6, company: 'SMC', image: 'https://images.unsplash.com/photo-1631549916768-4119b295f78b?q=80&w=800' },
        { name: 'Thyrox 50', generic: 'Levothyroxine', category: 'Hormone', price: 3, company: 'Square', image: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?q=80&w=800' },
        { name: 'Amodis 400', generic: 'Metronidazole', category: 'Gastric', price: 5, company: 'Aristopharma', image: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?q=80&w=800' },
        { name: 'Ecap 400', generic: 'Vitamin E', category: 'Supplements', price: 7, company: 'Healthcare', image: 'https://images.unsplash.com/photo-1559113084-25e50529d1bd?q=80&w=800' },
        { name: 'Maxpro 20', generic: 'Esomeprazole', category: 'Gastric', price: 7, company: 'Renata', image: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?q=80&w=800' },
        { name: 'Rivotril 0.5', generic: 'Clonazepam', category: 'Anxiety', price: 8, company: 'Roche', image: 'https://images.unsplash.com/photo-1563342081-3968393587b1?q=80&w=800' },
        { name: 'Exium 20', generic: 'Esomeprazole', category: 'Gastric', price: 10, company: 'Radiant', image: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?q=80&w=800' },
        { name: 'Bizoran 5/20', generic: 'Amlodipine + Olmesartan', category: 'Blood Pressure', price: 12, company: 'Square', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?q=80&w=800' },
        { name: 'Metfo 500', generic: 'Metformin', category: 'Diabetes', price: 4, company: 'Beximco', image: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?q=80&w=800' }
      ];

      for (const med of medicinePresets) {
        const id = `med_${med.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, 'medicines', id), { ...med, id, updatedAt: new Date().toISOString() });
      }
      showSuccess("Medicines seeded with real images!");
    } catch (error) {
      console.error("Medicine seed error:", error);
      alert("Failed to seed medicines.");
    } finally {
      setLoading(false);
    }
  };

  const seedServices = async () => {    if (!confirm('This will seed default services for Lab and Physio. Continue?')) return;
    setLoading(true);
    try {
      for (const test of LAB_SERVICES_PRESETS) {
        const id = `lab_${test.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, 'labTests', id), { ...test, id, type: 'lab' });
      }
      for (const service of PHYSIO_SERVICES_PRESETS) {
        const id = `physio_${service.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, 'physioServices', id), { ...service, id, type: 'physio' });
      }
      showSuccess("Global services seeded!");
    } catch (error) {
      console.error("Seed error:", error);
      alert("Failed to seed services.");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'user', label: 'User', icon: UserIcon, split: 0 },
    { id: 'admin', label: 'Admin', icon: Shield, split: 0 },
    { id: 'doctor', label: 'Doctor', icon: Stethoscope, split: 0.70 },
    { id: 'pharmacy', label: 'Pharmacy', icon: Pill, split: 0.95 },
    { id: 'lab', label: 'Lab', icon: FlaskConical, split: 0.85 },
    { id: 'ambulance', label: 'Ambulance', icon: Truck, split: 0.90 },
    { id: 'hospital', label: 'Hospital', icon: Building, split: 0.80 },
    { id: 'physio', label: 'Physio', icon: Activity, split: 0.75 },
  ];

  if (loading) return <div className="p-8 text-center">Loading users...</div>;

  return (
    <div className="space-y-8">
      {/* Hidden File Input for Doctor Images */}
      <input 
        id="doctor-image-upload"
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleImageUpload}
      />

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[200] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
          {successMessage}
        </div>
      )}

      {/* Revenue Split Info & Admin Wallet */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Admin Profit Card */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-2">Total Accumulated Profit</p>
            <h2 className="text-5xl font-black mb-6">৳{adminBalance.toLocaleString()}</h2>
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('transactions')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl font-bold flex items-center gap-2 transition-all"
              >
                <DollarSign size={18} /> লেনদেন দেখুন
              </button>
              <button 
                onClick={() => {
                   // Redirect to common wallet or show message
                   alert('অ্যাডমিন হিসেবে আপনার প্রফিট তুলতে সরাসরি আপনার পার্সোনাল ওয়ালেট সেকশনে যান।');
                }}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                Withdraw Profit
              </button>
            </div>
          </div>
        </div>

        {roles.filter(r => r.split > 0).slice(0, 2).map(role => (
          <div key={role.id} className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
                <role.icon size={24} />
              </div>
              <p className="text-lg font-black text-emerald-600">{role.split * 100}%</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{role.label} Share</p>
              <p className="text-[10px] text-slate-400">Shusto Profit: {(1 - role.split) * 100}%</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Card */}
      <div className="bg-emerald-500 rounded-[40px] p-8 text-white shadow-2xl shadow-emerald-500/20">
        <h2 className="text-3xl font-bold mb-2">Management Panel</h2>
        <p className="text-emerald-50 text-lg">Add and manage doctors, pharmacies, and healthcare providers.</p>
      </div>

      <div className="space-y-6">
        {/* Row 1: Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
          {(['users', 'patients', 'doctors', 'medicines', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'services', 'transactions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 rounded-xl font-bold text-sm transition-all capitalize",
                activeTab === tab ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:bg-slate-50"
              )}
            >
              {tab === 'users' ? 'সকল ইউজার' : 
               tab === 'patients' ? 'রোগী' :
               tab === 'doctors' ? 'ডাক্তার' :
               tab === 'medicines' ? 'ঔষধ' :
               tab === 'pharmacies' ? 'স্টেট (State)' :
               tab === 'labs' ? 'ল্যাব' :
               tab === 'physios' ? 'ফিজিওথেরাপি' :
               tab === 'services' ? 'সার্ভিস ক্যাটালগ' :
               tab === 'hospitals' ? 'হাসপাতাল' : 
               tab === 'transactions' ? 'লেনদেন' : 'অ্যাম্বুলেন্স'}
            </button>
          ))}
        </div>

        {/* Row 2: Add Buttons */}
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={syncAllRoles}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 font-bold rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-all text-sm shadow-sm"
          >
            <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
            সকল রোল সিঙ্ক করুন
          </button>
          {['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'].includes(activeTab) && (
            <button 
              onClick={() => setShowAddModal(true)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 font-bold rounded-2xl transition-all text-sm border",
                ['doctors', 'pharmacies'].includes(activeTab) 
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" 
                  : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
              )}
            >
              <Plus size={18} /> {
                activeTab === 'pharmacies' ? 'নতুন স্টেট যোগ করুন' :
                activeTab === 'labs' ? 'ল্যাব যোগ করুন' :
                activeTab === 'physios' ? 'ফিজিওথেরাপি যোগ করুন' :
                activeTab === 'hospitals' ? 'হাসপাতাল যোগ করুন' :
                activeTab === 'ambulances' ? 'অ্যাম্বুলেন্স যোগ করুন' : 'ডাক্তার যোগ করুন'
              }
            </button>
          )}
          {activeTab === 'medicines' && (
            <button 
              onClick={seedMedicines}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all text-sm shadow-lg shadow-emerald-500/20"
            >
              <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
              ঔষধ ড্রাইভ সিঙ্ক করুন (Real Images)
            </button>
          )}
        </div>
      </div>

      {showRoleModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Professional Role Details</h2>
                <p className="text-slate-500 font-medium">Promoting <span className="text-emerald-500">{showRoleModal.user.displayName}</span> to <span className="capitalize text-emerald-500 font-bold">{showRoleModal.role}</span></p>
              </div>
              <button onClick={() => setShowRoleModal(null)} className="p-2 hover:bg-slate-50 rounded-xl">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-5">
              {showRoleModal.role === 'doctor' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Specialty</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Cardiologist" 
                      value={roleDetails.specialty} 
                      onChange={e => setRoleDetails({...roleDetails, specialty: e.target.value})} 
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-emerald-500 bg-slate-50/50 font-medium transition-all" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">BMDC No.</label>
                      <input 
                        type="text" 
                        placeholder="A-12345" 
                        value={roleDetails.bmdcNumber} 
                        onChange={e => setRoleDetails({...roleDetails, bmdcNumber: e.target.value})} 
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-emerald-500 bg-slate-50/50 font-medium transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Consultation Fee</label>
                      <input 
                        type="number" 
                        placeholder="৳ 500" 
                        value={roleDetails.fee} 
                        onChange={e => setRoleDetails({...roleDetails, fee: Number(e.target.value)})} 
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-emerald-500 bg-slate-50/50 font-medium transition-all" 
                      />
                    </div>
                  </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Division</label>
                        <select
                          value={roleDetails.division}
                          onChange={(e) => setRoleDetails({ ...roleDetails, division: e.target.value, district: '' })}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">Select Division</option>
                          {BANGLADESH_LOCATIONS.map(l => (
                            <option key={l.division} value={l.division}>{l.division}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">District</label>
                        <select
                          value={roleDetails.district}
                          onChange={(e) => setRoleDetails({ ...roleDetails, district: e.target.value })}
                          disabled={!roleDetails.division}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        >
                          <option value="">Select District</option>
                          {roleDetails.division && BANGLADESH_LOCATIONS.find(l => l.division === roleDetails.division)?.districts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                </>
              ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Division</label>
                        <select
                          value={roleDetails.division}
                          onChange={(e) => setRoleDetails({ ...roleDetails, division: e.target.value, district: '' })}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">Select Division</option>
                          {BANGLADESH_LOCATIONS.map(l => (
                            <option key={l.division} value={l.division}>{l.division}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">District</label>
                        <select
                          value={roleDetails.district}
                          onChange={(e) => setRoleDetails({ ...roleDetails, district: e.target.value })}
                          disabled={!roleDetails.division}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        >
                          <option value="">Select District</option>
                          {roleDetails.division && BANGLADESH_LOCATIONS.find(l => l.division === roleDetails.division)?.districts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Location / Area</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Dhaka, Bangladesh" 
                      value={roleDetails.location} 
                      onChange={e => setRoleDetails({...roleDetails, location: e.target.value})} 
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-emerald-500 bg-slate-50/50 font-medium transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Contact Number</label>
                    <input 
                      type="text" 
                      placeholder="+8801xxxxxxxxx" 
                      value={roleDetails.contact} 
                      onChange={e => setRoleDetails({...roleDetails, contact: e.target.value})} 
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-emerald-500 bg-slate-50/50 font-medium transition-all" 
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setShowRoleModal(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePromoteUser}
                  disabled={loading}
                  className="flex-3 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Promotion'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Add {
                  activeTab === 'pharmacies' ? 'Pharmacy' :
                  activeTab === 'labs' ? 'Lab' :
                  activeTab === 'physios' ? 'Physio' :
                  activeTab === 'hospitals' ? 'Hospital' :
                  activeTab === 'ambulances' ? 'Ambulance' : 'Doctor'
                }
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            {['pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'].includes(activeTab) && (
              <form onSubmit={handleAddGeneralProvider} className="space-y-4">
                <input required type="text" placeholder="Name" value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    required
                    value={newProvider.division}
                    onChange={(e) => setNewProvider({...newProvider, division: e.target.value, district: ''})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Division</option>
                    {BANGLADESH_LOCATIONS.map(l => (
                      <option key={l.division} value={l.division}>{l.division}</option>
                    ))}
                  </select>
                  <select
                    required
                    value={newProvider.district}
                    onChange={(e) => setNewProvider({...newProvider, district: e.target.value})}
                    disabled={!newProvider.division}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50"
                  >
                    <option value="">District</option>
                    {newProvider.division && BANGLADESH_LOCATIONS.find(l => l.division === newProvider.division)?.districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <input required type="text" placeholder="Location" value={newProvider.location} onChange={e => setNewProvider({...newProvider, location: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="text" placeholder="Contact Number" value={newProvider.contact} onChange={e => setNewProvider({...newProvider, contact: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="email" placeholder="Email" value={newProvider.email} onChange={e => setNewProvider({...newProvider, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <button type="submit" className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl capitalize">Add {activeTab.slice(0, -1)}</button>
              </form>
            )}

            {activeTab === 'doctors' && (
              <form onSubmit={handleAddDoctor} className="space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group cursor-pointer" onClick={() => document.getElementById('doctor-image-upload')?.click()}>
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group-hover:border-emerald-500 transition-colors">
                      {newDoctor.image ? (
                        <img src={newDoctor.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-slate-400 group-hover:text-emerald-500 transition-colors" size={32} />
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 text-white rounded-full shadow-lg">
                      <Plus size={14} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-medium">Click to upload doctor photo</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    required
                    value={newDoctor.division}
                    onChange={(e) => setNewDoctor({...newDoctor, division: e.target.value, district: ''})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Division</option>
                    {BANGLADESH_LOCATIONS.map(l => (
                      <option key={l.division} value={l.division}>{l.division}</option>
                    ))}
                  </select>
                  <select
                    required
                    value={newDoctor.district}
                    onChange={(e) => setNewDoctor({...newDoctor, district: e.target.value})}
                    disabled={!newDoctor.division}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50"
                  >
                    <option value="">District</option>
                    {newDoctor.division && BANGLADESH_LOCATIONS.find(l => l.division === newDoctor.division)?.districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <input required type="text" placeholder="Doctor Name" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="email" placeholder="Doctor Email (to prevent duplicates)" value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="text" placeholder="Specialty" value={newDoctor.specialty} onChange={e => setNewDoctor({...newDoctor, specialty: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="text" placeholder="BMDC Number" value={newDoctor.bmdcNumber} onChange={e => setNewDoctor({...newDoctor, bmdcNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                  <input required type="text" placeholder="Experience (e.g. 10 Years)" value={newDoctor.experience} onChange={e => setNewDoctor({...newDoctor, experience: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                </div>
                <input required type="number" placeholder="Consultation Fee" value={newDoctor.fee} onChange={e => setNewDoctor({...newDoctor, fee: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <button type="submit" className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl">Add Doctor</button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
        {(activeTab === 'users' || activeTab === 'patients') && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {activeTab === 'users' ? 'সকল ইউজার' : 'পেশেন্ট ম্যানেজমেন্ট'}
                </h3>
                <p className="text-sm text-slate-500">
                  {searchTerm ? 'সার্চ রেজাল্ট: ' : 'মোট ইউজার: '}
                  <span className="font-bold text-slate-900">{filteredUsers.length}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={syncAllRoles}
                  className="px-6 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-100"
                >
                  <RefreshCcw size={18} /> রুলস সিঙ্ক করুন
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <Search className="text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="ইউজার বা ইমেইল দিয়ে সার্চ করুন..." 
                className="flex-1 bg-transparent border-none focus:ring-0 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">User</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Email</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Role</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} 
                            className="w-10 h-10 rounded-2xl border border-slate-100 shadow-sm" 
                            alt="" 
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{user.displayName}</span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{user.uid.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">{user.email}</td>
                      <td className="px-6 py-4 capitalize">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          user.role === 'admin' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                          user.role === 'doctor' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          user.role === 'user' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <select 
                          value={user.role} 
                          onChange={(e) => {
                            if (e.target.value === user.role) return;
                            if (e.target.value === 'user' || e.target.value === 'admin') {
                              updateUserRole(user.uid, e.target.value);
                            } else {
                              setShowRoleModal({ user, role: e.target.value });
                              // Pre-populate based on existing role if they were already that role
                              setRoleDetails({
                                specialty: (user as any).specialty || 'General Physician',
                                fee: (user as any).fee || 500,
                                bmdcNumber: (user as any).bmdcNumber || 'Pending',
                                location: (user as any).location || 'Pending',
                                contact: (user as any).contact || 'Pending',
                                division: (user as any).division || '',
                                district: (user as any).district || ''
                              });
                            }
                          }} 
                          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold focus:ring-2 focus:ring-emerald-500/20"
                        >
                          {roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
                        </select>
                        <button 
                          onClick={() => syncUserRole(user)} 
                          className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" 
                          title="Sync/Fix Role from Provider Records"
                        >
                          <RefreshCcw size={18} />
                        </button>
                        <button onClick={() => deleteItem('users', user.uid)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Delete User">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                        No users found matching "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'medicines' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Medicine</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Category</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Price</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {medicines.map((med) => (
                <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-100 flex-shrink-0">
                      {med.image ? (
                        <img src={med.image} alt={med.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                          <Pill size={16} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{med.name}</div>
                      <div className="text-[10px] text-slate-400">{med.generic} | {med.company}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{med.category}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">৳{med.price}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => deleteItem('medicines', med.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'doctors' && (
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <p className="text-sm text-amber-700 font-medium">
              Found {allDoctors.filter(d => !d.bmdcNumber || !d.fee).length} invalid doctors (missing BMDC or Fee).
            </p>
            <button 
              onClick={cleanupDoctors}
              className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
            >
              Cleanup Invalid Doctors
            </button>
          </div>
        )}
        {activeTab === 'doctors' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Doctor</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Type</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Specialty</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Fee</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allDoctors.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => {
                        setUpdatingDoctorId(doc.id);
                        document.getElementById('doctor-image-upload')?.click();
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100 group-hover:opacity-75 transition-opacity">
                        {doc.image ? (
                          <img 
                            src={doc.image} 
                            alt={doc.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <UserIcon className="text-slate-400" size={20} />
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={14} className="text-white drop-shadow-md" />
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{doc.name}</div>
                      <div className="text-[10px] text-slate-400">BMDC: {doc.bmdcNumber || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                      (doc as any).isUserAccount ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {(doc as any).isUserAccount ? 'User Account' : 'Manual Entry'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{doc.specialty}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">৳{doc.fee}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    {(doc as any).isUserAccount ? (
                      <p className="text-[10px] text-slate-400 italic">Manage in Users tab</p>
                    ) : (
                      <>
                        <button 
                          onClick={() => syncUserRole({ uid: doc.userId || '', email: doc.email, displayName: doc.name, role: 'user' } as any)} 
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl" 
                          title="Force Sync to User Account"
                        >
                          <RefreshCcw size={18} />
                        </button>
                        <button onClick={() => deleteItem('doctors', doc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {['pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'].includes(activeTab) && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Name</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Location</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Contact</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(activeTab === 'pharmacies' ? pharmacies : 
                activeTab === 'labs' ? labs : 
                activeTab === 'physios' ? physios : 
                activeTab === 'hospitals' ? hospitals : ambulances).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.location}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.contact}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => deleteItem(activeTab, item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'transactions' && (
          <TransactionsPanel isAdmin />
        )}

        {activeTab === 'services' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Global Service Catalog</h2>
                <p className="text-slate-500">Manage standard prices for Lab Tests and Physio Services.</p>
              </div>
              <button 
                onClick={seedServices}
                className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-sm"
              >
                <Plus size={18} /> সীড ডিফল্ট সার্ভিস
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Lab Tests */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FlaskConical className="text-emerald-500" /> Lab Tests
                </h3>
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left font-sans">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest font-bold">
                      <tr>
                        <th className="px-6 py-4">Test Name</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {labTests.map(test => (
                        <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{test.name}</td>
                          <td className="px-6 py-4 font-bold text-emerald-600">৳{test.price}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => deleteItem('labTests', test.id)} className="text-red-400 hover:text-red-500 transition-colors">
                               <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Physio Services */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="text-emerald-500" /> Physio Services
                </h3>
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left font-sans">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest font-bold">
                      <tr>
                        <th className="px-6 py-4">Service Name</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {physioServices.map(service => (
                        <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{service.name}</td>
                          <td className="px-6 py-4 font-bold text-emerald-600">৳{service.price}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => deleteItem('physioServices', service.id)} className="text-red-400 hover:text-red-500 transition-colors">
                               <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

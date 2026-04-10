import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, where, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { User as UserIcon, Shield, Stethoscope, Pill, FlaskConical, Truck, Building, Activity, Plus, X, Trash2, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  fee: number;
  image?: string;
  bmdcNumber?: string;
  experience?: string;
}

interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
}

interface LabTest {
  id: string;
  name: string;
  category: string;
  price: number;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'doctors' | 'medicines' | 'labTests' | 'appointments' | 'orders' | 'labOrders'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [manualDoctors, setManualDoctors] = useState<Doctor[]>([]);
  const [userDoctors, setUserDoctors] = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form states
  const [newProvider, setNewProvider] = useState({ displayName: '', email: '', role: 'doctor' });
  const [newDoctor, setNewDoctor] = useState({ name: '', specialty: '', fee: 0, bmdcNumber: '', experience: '', email: '' });
  const [newMedicine, setNewMedicine] = useState({ name: '', category: '', price: 0 });
  const [newLabTest, setNewLabTest] = useState({ name: '', category: '', price: 0 });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(allUsers);
      
      // Filter users who are doctors
      const uDocs = allUsers.filter(u => u.role === 'doctor').map(u => ({
        id: u.uid,
        name: u.displayName || 'Unnamed Doctor',
        specialty: (u as any).specialty || 'General Physician',
        fee: (u as any).fee || 0,
        bmdcNumber: (u as any).bmdcNumber,
        experience: (u as any).experience,
        isUserAccount: true
      })) as Doctor[];
      setUserDoctors(uDocs);
    });

    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      setManualDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor)));
    });

    const unsubMedicines = onSnapshot(collection(db, 'medicines'), (snapshot) => {
      setMedicines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine)));
    });

    const unsubLabTests = onSnapshot(collection(db, 'labTests'), (snapshot) => {
      setLabTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LabTest)));
    });

    const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubLabOrders = onSnapshot(collection(db, 'labOrders'), (snapshot) => {
      setLabOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);
    return () => {
      unsubUsers();
      unsubDoctors();
      unsubMedicines();
      unsubLabTests();
      unsubAppointments();
      unsubOrders();
      unsubLabOrders();
    };
  }, []);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newDoctor.email.toLowerCase();
    const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const id = `doc_${cleanEmail}`;
    
    // Check if already exists
    const existing = manualDoctors.find(d => d.id === id);
    if (existing) {
      alert("This Doctor Already Existed");
      return;
    }
    
    await setDoc(doc(db, 'doctors', id), { 
      ...newDoctor, 
      id,
      email 
    });
    
    setNewDoctor({ name: '', specialty: '', fee: 0, bmdcNumber: '', experience: '', email: '' });
    setShowAddModal(false);
    showSuccess("Doctor added successfully!");
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use name as ID to prevent duplicates
    const cleanName = newMedicine.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const id = `med_${cleanName}`;
    
    await setDoc(doc(db, 'medicines', id), { ...newMedicine, id });
    setNewMedicine({ name: '', category: '', price: 0 });
    setShowAddModal(false);
    showSuccess("Medicine added/updated successfully!");
  };

  const handleAddLabTest = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use name as ID to prevent duplicates
    const cleanName = newLabTest.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const id = `lab_${cleanName}`;
    
    await setDoc(doc(db, 'labTests', id), { ...newLabTest, id });
    setNewLabTest({ name: '', category: '', price: 0 });
    setShowAddModal(false);
    showSuccess("Lab test added/updated successfully!");
  };

  const allDoctors = Array.from(
    new Map([...manualDoctors, ...userDoctors].map(doc => [doc.id, doc])).values()
  );

  const cleanupDoctors = async () => {
    if (confirm('This will delete manual doctors and reset user-doctors who miss BMDC or Fee. Continue?')) {
      let manualDeleted = 0;
      let usersReset = 0;

      // Cleanup manual doctors
      for (const docItem of manualDoctors) {
        if (!docItem.bmdcNumber || !docItem.fee || docItem.fee <= 0) {
          await deleteDoc(doc(db, 'doctors', docItem.id));
          manualDeleted++;
        }
      }

      // Cleanup user doctors (reset role to 'user')
      for (const docItem of userDoctors) {
        if (!docItem.bmdcNumber || !docItem.fee || docItem.fee <= 0) {
          await updateDoc(doc(db, 'users', docItem.id), { role: 'user' });
          usersReset++;
        }
      }

      showSuccess(`Cleanup complete! Removed ${manualDeleted} manual entries and reset ${usersReset} user roles.`);
    }
  };

  const cleanupMedicines = async () => {
    if (confirm('Delete all medicines without a price?')) {
      let count = 0;
      for (const med of medicines) {
        if (!med.price || med.price <= 0) {
          await deleteDoc(doc(db, 'medicines', med.id));
          count++;
        }
      }
      showSuccess(`Removed ${count} invalid medicines.`);
    }
  };

  const cleanupLabTests = async () => {
    if (confirm('Delete all lab tests without a price?')) {
      let count = 0;
      for (const test of labTests) {
        if (!test.price || test.price <= 0) {
          await deleteDoc(doc(db, 'labTests', test.id));
          count++;
        }
      }
      showSuccess(`Removed ${count} invalid lab tests.`);
    }
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (confirm('Are you sure you want to delete this?')) {
      await deleteDoc(doc(db, collectionName, id));
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check if user already exists with this email
      const q = query(collection(db, 'users'), where('email', '==', newProvider.email));
      const querySnapshot = await getDocs(q);
      
      let providerData: UserProfile;
      
      if (!querySnapshot.empty) {
        // User exists, update their role
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data() as UserProfile;
        
        await updateDoc(doc(db, 'users', existingData.uid), { 
          role: newProvider.role,
          displayName: newProvider.displayName || existingData.displayName
        });
        
        providerData = { 
          ...existingData, 
          role: newProvider.role,
          displayName: newProvider.displayName || existingData.displayName
        };
        
        // Update local state
        setUsers(prevUsers => prevUsers.map(u => u.uid === existingData.uid ? providerData : u));
      } else {
        // User doesn't exist, create new manual entry using email-based ID
        const docId = `email_${newProvider.email}`;
        providerData = { 
          ...newProvider, 
          uid: docId, // Use docId as temporary UID
          photoURL: `https://picsum.photos/seed/${newProvider.email}/100/100` 
        } as any;
        
        await setDoc(doc(db, 'users', docId), providerData);
        setUsers(prevUsers => [...prevUsers, providerData]);
      }
      
      setShowAddModal(false);
      setNewProvider({ displayName: '', email: '', role: 'doctor', uid: '' });
      console.log("Provider processed successfully");
    } catch (error) {
      console.error("Error processing provider:", error);
      alert("Failed to process provider. Please check console.");
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
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[200] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
          {successMessage}
        </div>
      )}

      {/* Revenue Split Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {roles.filter(r => r.split > 0).map(role => (
          <div key={role.id} className="bg-white p-4 rounded-3xl border border-slate-100 text-center">
            <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mx-auto mb-2">
              <role.icon size={20} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{role.label}</p>
            <p className="text-lg font-bold text-emerald-600">{role.split * 100}%</p>
            <p className="text-[10px] text-slate-400">Shusto: {(1 - role.split) * 100}%</p>
          </div>
        ))}
      </div>

      {/* Quick Actions Card */}
      <div className="bg-emerald-500 rounded-[40px] p-8 text-white shadow-2xl shadow-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Management Panel</h2>
          <p className="text-emerald-50 text-lg">Add and manage doctors, medicines, lab tests, and users.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-3 px-8 py-4 bg-white text-emerald-600 font-bold rounded-2xl hover:bg-emerald-50 transition-all shadow-xl whitespace-nowrap"
        >
          <Plus size={24} />
          Add New {activeTab === 'users' ? 'Provider' : activeTab === 'doctors' ? 'Doctor' : activeTab === 'medicines' ? 'Medicine' : 'Lab Test'}
        </button>
      </div>

      <div className="flex items-center gap-4 border-b border-slate-100 pb-4 overflow-x-auto">
        {(['users', 'doctors', 'medicines', 'labTests', 'appointments', 'orders', 'labOrders'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2 rounded-xl font-bold text-sm transition-all capitalize whitespace-nowrap",
              activeTab === tab ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:bg-slate-50"
            )}
          >
            {tab.replace('Tests', ' Tests').replace('Orders', ' Orders')}
          </button>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Add {activeTab}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            {activeTab === 'users' && (
              <form onSubmit={handleAddProvider} className="space-y-4">
                <input required type="text" placeholder="Name" value={newProvider.displayName} onChange={e => setNewProvider({...newProvider, displayName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="email" placeholder="Email" value={newProvider.email} onChange={e => setNewProvider({...newProvider, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <select value={newProvider.role} onChange={e => setNewProvider({...newProvider, role: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-200">
                  {roles.filter(r => r.id !== 'user').map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
                </select>
                <button type="submit" className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl">Create Provider</button>
              </form>
            )}

            {activeTab === 'doctors' && (
              <form onSubmit={handleAddDoctor} className="space-y-4">
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

            {activeTab === 'medicines' && (
              <form onSubmit={handleAddMedicine} className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-600 text-xs rounded-xl mb-2">
                  Tip: Copy medicine name and price from Medex for accuracy.
                </div>
                <input required type="text" placeholder="Medicine Name" value={newMedicine.name} onChange={e => setNewMedicine({...newMedicine, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="text" placeholder="Category" value={newMedicine.category} onChange={e => setNewMedicine({...newMedicine, category: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="number" placeholder="Price" value={newMedicine.price} onChange={e => setNewMedicine({...newMedicine, price: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <button type="submit" className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl">Add Medicine</button>
              </form>
            )}

            {activeTab === 'labTests' && (
              <form onSubmit={handleAddLabTest} className="space-y-4">
                <input required type="text" placeholder="Test Name" value={newLabTest.name} onChange={e => setNewLabTest({...newLabTest, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="text" placeholder="Category" value={newLabTest.category} onChange={e => setNewLabTest({...newLabTest, category: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="number" placeholder="Price" value={newLabTest.price} onChange={e => setNewLabTest({...newLabTest, price: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <button type="submit" className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl">Add Lab Test</button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
        {activeTab === 'users' && (
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
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{user.displayName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{user.email}</td>
                  <td className="px-6 py-4 capitalize text-sm font-bold text-emerald-600">{user.role}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <select value={user.role} onChange={(e) => updateUserRole(user.uid, e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1">
                      {roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
                    </select>
                    <button onClick={() => deleteItem('users', user.uid)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl" title="Delete User">
                      <Trash2 size={18} />
                    </button>
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
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{doc.name}</div>
                    <div className="text-[10px] text-slate-400">BMDC: {doc.bmdcNumber || 'N/A'}</div>
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
                  <td className="px-6 py-4">
                    {(doc as any).isUserAccount ? (
                      <p className="text-[10px] text-slate-400 italic">Manage in Users tab</p>
                    ) : (
                      <button onClick={() => deleteItem('doctors', doc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'medicines' && (
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <p className="text-sm text-amber-700 font-medium">
              Found {medicines.filter(m => !m.price).length} invalid medicines.
            </p>
            <button onClick={cleanupMedicines} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl">
              Cleanup Medicines
            </button>
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
                  <td className="px-6 py-4 font-medium text-slate-900">{med.name}</td>
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

        {activeTab === 'labTests' && (
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <p className="text-sm text-amber-700 font-medium">
              Found {labTests.filter(t => !t.price).length} invalid lab tests.
            </p>
            <button onClick={cleanupLabTests} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl">
              Cleanup Lab Tests
            </button>
          </div>
        )}
        {activeTab === 'labTests' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Test</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Category</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Price</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {labTests.map((test) => (
                <tr key={test.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{test.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{test.category}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">৳{test.price}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => deleteItem('labTests', test.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'appointments' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Patient</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Doctor</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Status</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {appointments.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{app.userName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{app.doctorName}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-xs font-bold uppercase",
                      app.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                    )}>{app.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => deleteItem('appointments', app.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'orders' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Customer</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Items</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Total</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{order.userName}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{order.items.join(', ')}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">৳{order.total}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => deleteItem('orders', order.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'labOrders' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Patient</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Test</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Price</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {labOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{order.userName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{order.testName}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">৳{order.price}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => deleteItem('labOrders', order.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

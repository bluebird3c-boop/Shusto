import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { User as UserIcon, Shield, Stethoscope, Pill, FlaskConical, Truck, Building, Activity, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
}

export function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProvider, setNewProvider] = useState({
    displayName: '',
    email: '',
    role: 'doctor',
    uid: ''
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const userList: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        userList.push(doc.data() as UserProfile);
      });
      setUsers(userList);
      setLoading(false);
    };
    fetchUsers();
  }, []);

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
        // User doesn't exist, create new manual entry
        const uid = `manual_${Date.now()}`;
        providerData = { 
          ...newProvider, 
          uid,
          photoURL: `https://picsum.photos/seed/${uid}/100/100` 
        } as any;
        
        await setDoc(doc(db, 'users', uid), providerData);
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
          <h2 className="text-3xl font-bold mb-2">Service Provider Management</h2>
          <p className="text-emerald-50 text-lg">Add new doctors, pharmacies, or other service providers to the platform.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-3 px-8 py-4 bg-white text-emerald-600 font-bold rounded-2xl hover:bg-emerald-50 transition-all shadow-xl whitespace-nowrap"
        >
          <Plus size={24} />
          Add New Provider
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User List</h1>
          <p className="text-slate-500">View and manage all registered users.</p>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Add New Provider</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddProvider} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Name</label>
                <input 
                  required
                  type="text" 
                  value={newProvider.displayName}
                  onChange={(e) => setNewProvider({...newProvider, displayName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g. Dr. Rahim"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                <input 
                  required
                  type="email" 
                  value={newProvider.email}
                  onChange={(e) => setNewProvider({...newProvider, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="provider@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                <select 
                  value={newProvider.role}
                  onChange={(e) => setNewProvider({...newProvider, role: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {roles.filter(r => r.id !== 'user').map(role => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all mt-4"
              >
                Create Provider Account
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-900">User</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-900">Email</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-900">Current Role</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => (
              <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                      {user.displayName?.[0] || 'U'}
                    </div>
                    <span className="font-medium text-slate-900">{user.displayName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    user.role === 'admin' ? "bg-purple-100 text-purple-600" :
                    user.role === 'doctor' ? "bg-emerald-100 text-emerald-600" :
                    "bg-slate-100 text-slate-500"
                  )}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={user.role}
                    onChange={(e) => updateUserRole(user.uid, e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

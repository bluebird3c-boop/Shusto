import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, MapPin, Camera, Save, X, Loader2, RefreshCcw } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';

export function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    address: user?.address || '',
    photoURL: user?.photoURL || ''
  });

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        address: formData.address,
        photoURL: formData.photoURL
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const syncMyRole = async () => {
    if (!user || !user.email) return;
    setLoading(true);
    try {
      const email = user.email.toLowerCase().trim();
      const docQuery = query(collection(db, 'doctors'), where('email', '==', email));
      const docSnapshot = await getDocs(docQuery);
      
      if (!docSnapshot.empty) {
        const docData = docSnapshot.docs[0].data();
        await updateDoc(doc(db, 'users', user.uid), { 
          role: 'doctor',
          specialty: docData.specialty,
          fee: docData.fee,
          bmdcNumber: docData.bmdcNumber,
          experience: docData.experience
        });
        alert("Role synced! You are now a Doctor.");
        window.location.reload();
      } else {
        alert("No doctor record found for your email. Please contact Admin.");
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync role.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
        <div className="flex gap-2">
          {user?.role === 'user' && (
            <button 
              onClick={syncMyRole}
              disabled={loading}
              className="px-4 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-all text-sm flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
              Sync My Role
            </button>
          )}
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-8 md:p-12">
          <div className="flex flex-col items-center mb-12">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-emerald-50 bg-slate-100 mb-4">
                {formData.photoURL ? (
                  <img 
                    src={formData.photoURL} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User size={48} />
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="text-white" />
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{user?.displayName}</h2>
            <p className="text-slate-500 font-medium uppercase tracking-widest text-xs bg-slate-50 px-3 py-1 rounded-full mt-2">
              {user?.role}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={20} />
                </div>
                <input 
                  disabled={!isEditing}
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                  placeholder="Your Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input 
                disabled
                type="email"
                value={user?.email || ''}
                className="w-full px-4 py-4 bg-slate-100 border-none rounded-2xl text-slate-500 font-medium cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1 ml-1">Email cannot be changed.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Home Address</label>
              <div className="relative">
                <div className="absolute left-4 top-4 text-slate-400">
                  <MapPin size={20} />
                </div>
                <textarea 
                  disabled={!isEditing}
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={3}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 resize-none"
                  placeholder="Enter your full address"
                />
              </div>
            </div>

            {isEditing && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Profile Picture URL</label>
                <input 
                  type="text"
                  value={formData.photoURL}
                  onChange={(e) => setFormData({...formData, photoURL: e.target.value})}
                  className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            )}

            {isEditing && (
              <div className="flex gap-4 pt-6">
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      displayName: user?.displayName || '',
                      address: user?.address || '',
                      photoURL: user?.photoURL || ''
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <X size={20} />
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

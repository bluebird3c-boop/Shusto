import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, MapPin, Camera, Save, X, Loader2, RefreshCcw } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { BANGLADESH_LOCATIONS } from '../constants/locations';

export function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    address: user?.address || '',
    photoURL: user?.photoURL || '',
    location: (user as any)?.location || '',
    division: user?.division || '',
    district: user?.district || ''
  });

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        address: formData.address,
        photoURL: formData.photoURL,
        location: formData.location,
        division: formData.division,
        district: formData.district
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use Nominatim for free reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
          );
          const data = await response.json();
          
          let locationName = "";
          if (data.address) {
            const addr = data.address;
            locationName = addr.city || addr.town || addr.village || addr.suburb || addr.state || "Unknown Location";
          } else {
            locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          }

          setFormData(prev => ({ 
            ...prev, 
            location: locationName,
            division: data.address?.state || prev.division,
            district: data.address?.city || data.address?.town || data.address?.village || prev.district
          }));
          // Also set address if it's empty
          if (!formData.address && data.display_name) {
            setFormData(prev => ({ ...prev, address: data.display_name }));
          }
          alert(`লোকেশন পাওয়া গেছে: ${locationName}`);
        } catch (error) {
          console.error("Location detection error:", error);
          alert("লোকেশন ডিটেক্ট করতে সমস্যা হয়েছে।");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        alert("লোকেশন পারমিশন পাওয়া যায়নি।");
      }
    );
  };

  const syncMyRole = async () => {
    if (!user || !user.email) return;
    setLoading(true);
    try {
      const email = user.email.toLowerCase().trim();
      const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'];
      let found = false;

      for (const coll of providerCollections) {
        const qDocs = query(collection(db, coll), where('email', '==', email));
        const snapshot = await getDocs(qDocs);
        
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const newRole = coll === 'doctors' ? 'doctor' : 
                         coll === 'pharmacies' ? 'pharmacy' : 
                         coll === 'labs' ? 'lab' : 
                         coll === 'physios' ? 'physio' : 
                         coll === 'hospitals' ? 'hospital' : 'ambulance';

          const updateData: any = { role: newRole };
          if (newRole === 'doctor') {
            updateData.specialty = data.specialty;
            updateData.fee = data.fee;
            updateData.bmdcNumber = data.bmdcNumber;
            updateData.experience = data.experience;
          }
          if (data.location) updateData.location = data.location;
          if (data.contact) updateData.contact = data.contact;

          await updateDoc(doc(db, 'users', user.uid), updateData);
          alert(`Role synced! You are now a ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}.`);
          found = true;
          window.location.reload();
          break;
        }
      }
      
      if (!found) {
        alert("No professional record found for your email. Please contact Admin.");
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
        <h1 className="text-3xl font-bold text-slate-900">আমার প্রোফাইল</h1>
        <div className="flex gap-2">
          {user?.role === 'user' && (
            <button 
              onClick={syncMyRole}
              disabled={loading}
              className="px-4 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-all text-sm flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
              রোল সিঙ্ক করুন
            </button>
          )}
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
            >
              প্রোফাইল এডিট করুন
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
              {user?.role === 'pharmacy' ? 'State' : user?.role}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">পুরো নাম</label>
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
                  placeholder="আপনার নাম"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ইমেইল ঠিকানা</label>
              <input 
                disabled
                type="email"
                value={user?.email || ''}
                className="w-full px-4 py-4 bg-slate-100 border-none rounded-2xl text-slate-500 font-medium cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1 ml-1">ইমেইল পরিবর্তন করা সম্ভব নয়।</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">বিভাগ (Division)</label>
                <select
                  disabled={!isEditing}
                  value={formData.division}
                  onChange={(e) => setFormData({...formData, division: e.target.value, district: ''})}
                  className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 appearance-none"
                >
                  <option value="">বিভাগ নির্বাচন করুন</option>
                  {BANGLADESH_LOCATIONS.map((loc) => (
                    <option key={loc.division} value={loc.division}>{loc.division}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">জেলা (District)</label>
                <select
                  disabled={!isEditing || !formData.division}
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 appearance-none"
                >
                  <option value="">জেলা নির্বাচন করুন</option>
                  {formData.division && BANGLADESH_LOCATIONS.find(l => l.division === formData.division)?.districts.map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">এলাকা (Area / Location)</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <MapPin size={20} />
                </div>
                <input 
                  disabled={!isEditing}
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full pl-12 pr-32 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                  placeholder="আপনার এলাকা (যেমন: মিরপুর, ঢাকা)"
                />
                {isEditing && (
                  <button 
                    onClick={detectLocation}
                    disabled={loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg hover:bg-emerald-100 transition-all flex items-center gap-1"
                  >
                    {loading ? <Loader2 className="animate-spin" size={12} /> : <RefreshCcw size={12} />}
                    AUTO
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">বর্তমান ঠিকানা</label>
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
                  placeholder="আপনার বর্তমান ঠিকানা লিখুন"
                />
              </div>
            </div>

            {isEditing && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">প্রোফাইল পিকচার URL</label>
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
                      photoURL: user?.photoURL || '',
                      location: (user as any)?.location || '',
                      division: user?.division || '',
                      district: user?.district || ''
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <X size={20} />
                  বাতিল করুন
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  সেভ করুন
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

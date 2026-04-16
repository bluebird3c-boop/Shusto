import React, { useEffect, useState } from 'react';
import { Star, Clock, Search } from 'lucide-react';
import { collection, onSnapshot, query, addDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';

interface Appointment {
  id: string;
  doctorName: string;
  status: string;
  date: string;
  fee: number;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  fee: number;
  image?: string;
  rating?: number;
  bmdcNumber?: string;
  experience?: string;
  userId?: string;
  email?: string;
}

export function DoctorDirectory() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success'>('idle');
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!user) return;
    const qApp = query(collection(db, 'appointments'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(qApp, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setMyAppointments(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    // Fetch ONLY from 'doctors' collection
    const qDoctors = query(collection(db, 'doctors'));
    const unsubDoctors = onSnapshot(qDoctors, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Doctor[];
      
      // Filter: Only show doctors with BMDC Number and Fee
      const verifiedDocs = docs.filter(d => d.bmdcNumber && d.fee && d.fee > 0);
      
      setDoctors(verifiedDocs);
      setLoading(false);
    }, (error) => {
      console.error("Doctors fetch error:", error);
      setLoading(false);
    });

    return () => unsubDoctors();
  }, []);

  const handleBook = async () => {
    if (!user || !bookingDoctor) {
      alert("Please login to book an appointment.");
      return;
    }
    
    setBookingStatus('booking');
    try {
      // Use the stored userId if available, otherwise fallback to doctor document ID
      // This avoids restricted queries on the 'users' collection
      const doctorUserId = bookingDoctor.userId || bookingDoctor.id;

      const appointmentData = {
        userId: user.uid,
        userName: user.displayName || 'Patient',
        targetId: doctorUserId,
        doctorName: bookingDoctor.name,
        fee: Number(bookingDoctor.fee),
        status: 'pending',
        date: new Date().toISOString(),
        type: 'video'
      };

      await addDoc(collection(db, 'appointments'), appointmentData);
      setBookingStatus('success');
      
      setTimeout(() => {
        setBookingStatus('idle');
        setBookingDoctor(null);
      }, 2000);
    } catch (error) {
      console.error("Booking error:", error);
      alert("Booking failed: " + (error instanceof Error ? error.message : "Unknown error"));
      setBookingStatus('idle');
    }
  };

  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Section: My Appointments */}
      {myAppointments.length > 0 && (
        <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <Clock className="text-emerald-500" size={24} />
            আমার অ্যাপয়েন্টমেন্ট
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {myAppointments.map((app) => (
              <div key={app.id} className="p-5 rounded-[28px] bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <p className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{app.doctorName}</p>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    app.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" : 
                    app.status === 'cancelled' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  )}>
                    {app.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{new Date(app.date).toLocaleDateString()}</span>
                  </div>
                  <span className="font-bold text-slate-700">৳{app.fee}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ডাক্তার খুঁজুন ({doctors.length})</h1>
            <p className="text-slate-500">সেরা বিশেষজ্ঞ ডাক্তারদের সাথে অ্যাপয়েন্টমেন্ট বুক করুন।</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by specialty or name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full md:w-80"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading doctors...</div>
        ) : filteredDoctors.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
            {searchQuery ? 'No doctors match your search.' : 'No doctors found. Please add some from the Admin Panel.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-[32px] border border-slate-100 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
              >
                <div className="relative mb-6">
                  <img 
                    src={doc.image || `https://picsum.photos/seed/${doc.id}/400/400`} 
                    alt={doc.name} 
                    className="w-full aspect-square object-cover rounded-3xl"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star size={14} fill="currentColor" />
                    {doc.rating || 5.0}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-slate-900">{doc.name}</h3>
                      {doc.bmdcNumber && (
                        <div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-100 uppercase">
                          Verified
                        </div>
                      )}
                    </div>
                    <p className="text-emerald-600 font-medium text-sm">{doc.specialty}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">BMDC Reg</p>
                      <p className="text-xs font-bold text-slate-700">{doc.bmdcNumber || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Experience</p>
                      <p className="text-xs font-bold text-slate-700">{doc.experience || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>Available Today</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Consultation Fee</p>
                      <p className="text-lg font-bold text-slate-900">৳{doc.fee}</p>
                    </div>
                    <button 
                      onClick={() => setBookingDoctor(doc)}
                      className="px-6 py-3 bg-emerald-500 text-white text-sm font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            {bookingStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <Star size={40} fill="currentColor" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Success!</h2>
                <p className="text-slate-500 mb-8">Your appointment with {bookingDoctor.name} has been booked successfully.</p>
                <button 
                  onClick={() => { setBookingDoctor(null); setBookingStatus('idle'); }}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Great, Thanks!
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Confirm Booking</h2>
                  <p className="text-slate-500">Appointment with {bookingDoctor.name}</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl space-y-3 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Consultation Fee</span>
                    <span className="font-bold text-slate-900">৳{bookingDoctor.fee}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Service Charge</span>
                    <span className="font-bold text-slate-900">৳0</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between font-bold text-lg">
                    <span className="text-slate-900">Total</span>
                    <span className="text-emerald-600">৳{bookingDoctor.fee}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setBookingDoctor(null)}
                    disabled={bookingStatus === 'booking'}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleBook}
                    disabled={bookingStatus !== 'idle'}
                    className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {bookingStatus === 'booking' ? 'Booking...' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

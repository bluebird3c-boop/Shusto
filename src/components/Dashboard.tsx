import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Calendar, 
  Clock, 
  ArrowRight, 
  Activity, 
  Thermometer, 
  Droplets,
  TrendingUp,
  Stethoscope, 
  ChevronRight,
  Video
} from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { VideoCall } from './VideoCall';

export function Dashboard() {
  const { user, forceSync } = useAuth();
  const [upcomingAppointment, setUpcomingAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ id: string; channel: string } | null>(null);
  const [activeCall, setActiveCall] = useState<{ id: string; channel: string; patientId: string } | null>(null);
  const [newPrescription, setNewPrescription] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for incoming calls (for patients)
    const qCalls = query(
      collection(db, 'callSessions'),
      where('patientId', '==', user.uid),
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribeCalls = onSnapshot(qCalls, (snapshot) => {
      if (!snapshot.empty) {
        const callData = snapshot.docs[0].data();
        setIncomingCall({ 
          id: snapshot.docs[0].id, 
          channel: callData.channelName
        });
      } else {
        setIncomingCall(null);
      }
    });

    // Listen for new prescriptions
    const qPres = query(
      collection(db, 'prescriptions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(1)
    );

    const unsubscribePres = onSnapshot(qPres, (snapshot) => {
      if (!snapshot.empty) {
        const pres = snapshot.docs[0].data();
        const presDate = new Date(pres.date).getTime();
        const now = Date.now();
        // Only show if created in the last 1 minute
        if (now - presDate < 60000) {
          setNewPrescription({ id: snapshot.docs[0].id, ...pres });
        }
      }
    });

    return () => {
      unsubscribeCalls();
      unsubscribePres();
    };
  }, [user]);

  const joinCall = () => {
    if (incomingCall) {
      setActiveCall({ 
        id: incomingCall.id, 
        channel: incomingCall.channel, 
        patientId: user!.uid 
      });
    }
  };

  const endCall = async () => {
    if (activeCall) {
      try {
        await updateDoc(doc(db, 'callSessions', activeCall.id), { status: 'ended' });
      } catch (e) {
        console.error(e);
      }
      setActiveCall(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await forceSync();
    setSyncing(false);
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid),
      where('status', 'in', ['pending', 'confirmed']),
      orderBy('date', 'asc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setUpcomingAppointment({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setUpcomingAppointment(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const stats = [
    { label: 'হার্ট রেট', value: '৭২ bpm', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'শরীরের তাপমাত্রা', value: '৩৬.৬ °C', icon: Thermometer, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'রক্তচাপ', value: '১২০/৮০', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  if (activeCall) {
    return (
      <VideoCall 
        channelName={activeCall.channel} 
        role="audience" 
        onEnd={endCall} 
      />
    );
  }

  return (
    <div className="space-y-8">
      {newPrescription && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] w-[90%] max-w-md animate-in slide-in-from-top duration-500">
          <div className="bg-emerald-600 text-white p-6 rounded-[32px] shadow-2xl flex items-center justify-between gap-4 border border-white/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div>
                <p className="font-bold">নতুন প্রেসক্রিপশন!</p>
                <p className="text-sm opacity-90">ডা. {newPrescription.doctorName} পাঠিয়েছেন</p>
              </div>
            </div>
            <button 
              onClick={() => setNewPrescription(null)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.displayName?.split(' ')[0]}!</h1>
          <p className="text-slate-500 flex items-center gap-2">
            Here's what's happening with your health today.
            {user?.role === 'user' && (
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                {syncing ? 'Syncing...' : '(Not a Doctor? Sync Role)'}
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <Calendar size={18} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Health Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center gap-5"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", stat.bg, stat.color)}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Appointment */}
        <div
          className="bg-emerald-500 rounded-[40px] p-8 text-white relative overflow-hidden"
        >
          <div className="relative z-10">
            <h3 className="text-lg font-medium opacity-80 mb-2">পরবর্তী অ্যাপয়েন্টমেন্ট</h3>
            
            {loading ? (
              <div className="h-32 flex items-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : upcomingAppointment ? (
              <>
                <h2 className="text-3xl font-bold mb-2">ডা. {upcomingAppointment.doctorName || 'বিশেষজ্ঞ'}</h2>
                <div className="flex items-center gap-4 mb-6 opacity-90">
                  <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                    <Calendar size={14} />
                    {new Date(upcomingAppointment.date).toLocaleDateString('bn-BD')}
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                    <Clock size={14} />
                    {new Date(upcomingAppointment.date).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <p className="text-emerald-50 mb-8 max-w-xs">
                  আপনার অ্যাপয়েন্টমেন্টটি {upcomingAppointment.status === 'confirmed' ? 'নিশ্চিত করা হয়েছে' : 'অনুমোদনের অপেক্ষায় আছে'}। 
                  অনুগ্রহ করে সময়ের ৫ মিনিট আগে প্রস্তুত থাকুন।
                </p>

                <div className="flex gap-3">
                  {incomingCall && (
                    <button 
                      onClick={joinCall}
                      className="flex items-center gap-2 px-8 py-4 bg-white text-emerald-600 rounded-2xl font-bold hover:bg-emerald-50 shadow-lg transition-all animate-bounce"
                    >
                      <Video size={20} />
                      ভিডিও কলে যোগ দিন
                    </button>
                  )}
                  {!incomingCall && upcomingAppointment?.status === 'confirmed' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 px-6 py-3 bg-white/20 rounded-2xl font-bold text-sm">
                        <Video size={18} />
                        ডাক্তারের জন্য অপেক্ষা করা হচ্ছে...
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-6">কোনো অ্যাপয়েন্টমেন্ট নেই</h2>
                <p className="text-emerald-50 mb-8">আজ আপনার কোনো অ্যাপয়েন্টমেন্ট নির্ধারিত নেই।</p>
                <button className="bg-white text-emerald-600 px-8 py-4 rounded-2xl font-bold hover:bg-emerald-50 transition-colors flex items-center gap-2">
                  অ্যাপয়েন্টমেন্ট বুক করুন
                  <ArrowRight size={20} />
                </button>
              </>
            )}
          </div>

          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
            <Stethoscope size={300} />
          </div>
        </div>

        {/* Health Activity */}
        <div className="bg-white rounded-[40px] border border-slate-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900">Health Activity</h3>
            <button className="text-emerald-600 font-bold text-sm">View All</button>
          </div>

          <div className="space-y-6">
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-100 rounded-3xl">
              No recent activity found.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

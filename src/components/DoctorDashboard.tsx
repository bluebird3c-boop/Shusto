import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Calendar, Clock, User, Video, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { VideoCall } from './VideoCall';

interface Appointment {
  id: string;
  userId: string;
  userName: string;
  date: string;
  status: string;
}

export function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeCall, setActiveCall] = useState<{ channel: string; patientId: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const appointmentsRef = collection(db, 'appointments');
    const qApp = query(appointmentsRef, where('targetId', '==', user.uid));

    const unsubscribe = onSnapshot(qApp, (snapshot) => {
      const list: Appointment[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      setAppointments(list);
    });

    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'appointments', id), { status });
  };

  const startCall = async (appointment: Appointment) => {
    const channelName = `call_${user?.uid}_${appointment.userId}`;
    
    await addDoc(collection(db, 'callSessions'), {
      channelName,
      doctorId: user?.uid,
      patientId: appointment.userId,
      status: 'waiting',
      createdAt: new Date().toISOString()
    });

    setActiveCall({ channel: channelName, patientId: appointment.userId });
  };

  if (activeCall) {
    return (
      <VideoCall 
        channelName={activeCall.channel} 
        role="host" 
        onEnd={() => setActiveCall(null)} 
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Doctor Dashboard</h1>
        <p className="text-slate-500">Manage your patients and consultations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Today's Appointments</h2>
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400">
                No appointments scheduled for today.
              </div>
            ) : (
              appointments.map((app) => (
                <div key={app.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{app.userName || 'Patient'}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={14} /> {new Date(app.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          app.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                        )}>{app.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(app.id, 'confirmed')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
                          <CheckCircle size={20} />
                        </button>
                        <button onClick={() => updateStatus(app.id, 'cancelled')} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                          <XCircle size={20} />
                        </button>
                      </>
                    )}
                    {app.status === 'confirmed' && (
                      <button 
                        onClick={() => startCall(app)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all"
                      >
                        <Video size={18} />
                        Start Call
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Quick Stats</h2>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total Patients</span>
              <span className="font-bold text-slate-900">124</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Consultations</span>
              <span className="font-bold text-slate-900">48</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Rating</span>
              <span className="font-bold text-amber-500">4.9/5.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

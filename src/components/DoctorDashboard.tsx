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
  const [activeCall, setActiveCall] = useState<{ id: string; channel: string; patientId: string } | null>(null);
  const [stats, setStats] = useState({ total: 0, today: 0, completed: 0 });

  useEffect(() => {
    if (!user) return;
    
    const appointmentsRef = collection(db, 'appointments');
    const qApp = query(appointmentsRef, where('targetId', '==', user.uid));

    const unsubscribe = onSnapshot(qApp, (snapshot) => {
      const list: Appointment[] = [];
      let todayCount = 0;
      let completedCount = 0;
      const today = new Date().toISOString().split('T')[0];

      snapshot.forEach((doc) => {
        const data = doc.data() as Appointment;
        list.push({ id: doc.id, ...data });
        if (data.date.startsWith(today)) todayCount++;
        if (data.status === 'completed') completedCount++;
      });
      setAppointments(list);
      setStats({ total: list.length, today: todayCount, completed: completedCount });
    });

    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'appointments', id), { status });
  };

  const startCall = async (appointment: Appointment) => {
    const channelName = `call_${user?.uid}_${appointment.userId}`;
    
    const sessionRef = await addDoc(collection(db, 'callSessions'), {
      channelName,
      doctorId: user?.uid,
      doctorName: user?.displayName,
      patientId: appointment.userId,
      patientName: appointment.userName,
      status: 'waiting',
      createdAt: new Date().toISOString()
    });

    setActiveCall({ id: sessionRef.id, channel: channelName, patientId: appointment.userId });
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

  if (activeCall) {
    return (
      <VideoCall 
        channelName={activeCall.channel} 
        role="host" 
        onEnd={endCall} 
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
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startCall(app)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all"
                        >
                          <Video size={18} />
                          Start Call
                        </button>
                        <button 
                          onClick={() => updateStatus(app.id, 'completed')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Mark as Completed"
                        >
                          <CheckCircle size={20} />
                        </button>
                      </div>
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
              <span className="font-bold text-slate-900">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Today's Appointments</span>
              <span className="font-bold text-emerald-600">{stats.today}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Completed</span>
              <span className="font-bold text-blue-600">{stats.completed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

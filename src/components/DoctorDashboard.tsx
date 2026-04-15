import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Calendar, Clock, User, Video, CheckCircle, XCircle, FileText, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { VideoCall } from './VideoCall';

interface Appointment {
  id: string;
  userId: string;
  userName: string;
  date: string;
  status: string;
}

interface PrescriptionItem {
  medicine: string;
  dosage: string;
  duration: string;
}

export function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeCall, setActiveCall] = useState<{ id: string; channel: string; patientId: string } | null>(null);
  const [stats, setStats] = useState({ total: 0, today: 0, completed: 0 });
  const [writingPrescription, setWritingPrescription] = useState<Appointment | null>(null);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([{ medicine: '', dosage: '', duration: '' }]);
  const [savingPrescription, setSavingPrescription] = useState(false);

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

  const handleSavePrescription = async () => {
    if (!writingPrescription || !user) return;
    setSavingPrescription(true);
    try {
      await addDoc(collection(db, 'prescriptions'), {
        userId: writingPrescription.userId,
        userName: writingPrescription.userName,
        doctorId: user.uid,
        doctorName: user.displayName,
        specialty: (user as any).specialty || 'Specialist',
        date: new Date().toISOString(),
        items: prescriptionItems.filter(item => item.medicine),
        status: 'Active'
      });
      setWritingPrescription(null);
      setPrescriptionItems([{ medicine: '', dosage: '', duration: '' }]);
    } catch (error) {
      console.error("Error saving prescription:", error);
    } finally {
      setSavingPrescription(false);
    }
  };

  const addPrescriptionItem = () => {
    setPrescriptionItems([...prescriptionItems, { medicine: '', dosage: '', duration: '' }]);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...prescriptionItems];
    newItems[index][field] = value;
    setPrescriptionItems(newItems);
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
                          onClick={() => setWritingPrescription(app)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all"
                        >
                          <FileText size={18} />
                          Prescription
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

      {/* Prescription Modal */}
      {writingPrescription && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[32px] p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Write Prescription</h2>
                <p className="text-slate-500">Patient: {writingPrescription.userName}</p>
              </div>
              <button onClick={() => setWritingPrescription(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {prescriptionItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl relative">
                  {prescriptionItems.length > 1 && (
                    <button 
                      onClick={() => removePrescriptionItem(index)}
                      className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Medicine</label>
                    <input 
                      type="text" 
                      value={item.medicine}
                      onChange={(e) => updatePrescriptionItem(index, 'medicine', e.target.value)}
                      placeholder="Napa Extend"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Dosage</label>
                    <input 
                      type="text" 
                      value={item.dosage}
                      onChange={(e) => updatePrescriptionItem(index, 'dosage', e.target.value)}
                      placeholder="1+0+1"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duration</label>
                    <input 
                      type="text" 
                      value={item.duration}
                      onChange={(e) => updatePrescriptionItem(index, 'duration', e.target.value)}
                      placeholder="7 days"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              ))}
              <button 
                onClick={addPrescriptionItem}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-emerald-500 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add Medicine
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setWritingPrescription(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePrescription}
                disabled={savingPrescription}
                className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {savingPrescription ? 'Sending...' : 'Send Prescription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MedicineStore } from './components/MedicineStore';
import { Prescriptions } from './components/Prescriptions';
import { DoctorDirectory } from './components/DoctorDirectory';
import { LabTests } from './components/LabTests';
import { AdminDashboard } from './components/AdminDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PharmacyDashboard } from './components/PharmacyDashboard';
import { PhysioDashboard } from './components/PhysioDashboard';
import { HospitalDashboard } from './components/HospitalDashboard';
import { AmbulanceDashboard } from './components/AmbulanceDashboard';
import { LabDashboard } from './components/LabDashboard';
import { ServiceDirectory } from './components/ServiceDirectory';
import { Wallet } from './components/Wallet';
import { Profile } from './components/Profile';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { VideoCall } from './components/VideoCall';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AlertCircle, Phone, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, loading, error } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [incomingCall, setIncomingCall] = useState<{ id: string; channel: string; doctorId: string; doctorName?: string } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'user') return;

    // Listen for incoming calls for patients
    const q = query(
      collection(db, 'callSessions'),
      where('patientId', '==', user.uid),
      where('status', '==', 'waiting')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callData = snapshot.docs[0].data();
        setIncomingCall({ 
          id: snapshot.docs[0].id,
          channel: callData.channelName, 
          doctorId: callData.doctorId,
          doctorName: callData.doctorName 
        });
      } else {
        setIncomingCall(null);
        setCallAccepted(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Loading Shusto...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Issue</h2>
        <p className="text-slate-500 mb-6 max-w-xs">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (incomingCall && callAccepted) {
    return (
      <VideoCall 
        channelName={incomingCall.channel} 
        role="audience" 
        onEnd={async () => {
          setIncomingCall(null);
          setCallAccepted(false);
          // Update session status to ended
          try {
            await updateDoc(doc(db, 'callSessions', incomingCall.id), { status: 'ended' });
          } catch (e) {
            console.error("Error ending call session:", e);
          }
        }} 
      />
    );
  }

  const renderContent = () => {
    // If not on dashboard, show the selected tab for everyone
    if (activeTab !== 'dashboard') {
      switch (activeTab) {
        case 'profile': return <Profile />;
        case 'privacy': return <PrivacyPolicy onBack={() => setActiveTab('dashboard')} />;
        case 'medicine': return <MedicineStore />;
        case 'prescriptions': return <Prescriptions />;
        case 'doctors': return <DoctorDirectory />;
        case 'lab': return <ServiceDirectory type="lab" title="Lab Tests & Centers" description="Find diagnostic centers and book tests near you." />;
        case 'wallet': return <Wallet />;
        case 'physio': return <ServiceDirectory type="physio" title="Physiotherapy Centers" description="Connect with expert physiotherapists for your recovery." />;
        case 'hospital': return <ServiceDirectory type="hospital" title="Hospitals" description="Find top-rated hospitals and clinical centers." />;
        case 'ambulance': return <ServiceDirectory type="ambulance" title="Ambulance Services" description="Emergency ambulance services available 24/7." />;
        default: break;
      }
    }

    // Role-based dashboard routing (when activeTab is 'dashboard')
    if (user.role === 'admin') return <AdminDashboard />;
    if (user.role === 'doctor') return <DoctorDashboard />;
    if (user.role === 'pharmacy') return <PharmacyDashboard />;
    if (user.role === 'physio') return <PhysioDashboard />;
    if (user.role === 'hospital') return <HospitalDashboard />;
    if (user.role === 'ambulance') return <AmbulanceDashboard />;
    if (user.role === 'lab') return <LabDashboard />;
    
    // Default patient dashboard
    return <Dashboard />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Incoming Call Modal */}
      <AnimatePresence>
        {incomingCall && !callAccepted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-8 right-8 z-[100] w-full max-w-sm bg-slate-900 text-white rounded-[32px] p-6 shadow-2xl border border-slate-700/50 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center animate-pulse">
                <Phone size={32} />
              </div>
              <div>
                <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Incoming Call</p>
                <h3 className="text-xl font-bold">Dr. {incomingCall.doctorName || 'Consultant'}</h3>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'callSessions', incomingCall.id), { status: 'declined' });
                  } catch (e) {
                    console.error(e);
                  }
                  setIncomingCall(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-500/10 text-red-500 font-bold rounded-2xl hover:bg-red-500 hover:text-white transition-all"
              >
                <PhoneOff size={20} />
                Decline
              </button>
              <button 
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'callSessions', incomingCall.id), { status: 'active' });
                    setCallAccepted(true);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Phone size={20} />
                Accept
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 lg:ml-72 p-4 md:p-8 lg:p-12 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

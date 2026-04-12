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
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [incomingCall, setIncomingCall] = useState<{ channel: string; doctorId: string } | null>(null);

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
        setIncomingCall({ channel: callData.channelName, doctorId: callData.doctorId });
      } else {
        setIncomingCall(null);
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

  if (!user) {
    return <Login />;
  }

  if (incomingCall) {
    return (
      <VideoCall 
        channelName={incomingCall.channel} 
        role="audience" 
        onEnd={() => setIncomingCall(null)} 
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

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Clock, User, CheckCircle, XCircle, MapPin, Phone } from 'lucide-react';
import { cn } from '../lib/utils';

interface ServiceRequest {
  id: string;
  userId: string;
  userName: string;
  providerId: string;
  providerName: string;
  providerType: string;
  status: string;
  createdAt: string;
}

interface GenericProviderDashboardProps {
  type: 'pharmacy' | 'lab' | 'physio' | 'hospital' | 'ambulance';
  title: string;
  description: string;
}

export function GenericProviderDashboard({ type, title, description }: GenericProviderDashboardProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // In a real app, we'd filter by providerId linked to this user
    // For this demo, we'll show all requests for this provider type
    // so the user can see the "real-time" aspect easily.
    const q = query(
      collection(db, 'serviceRequests'), 
      where('providerType', '==', type)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceRequest[];
      
      // Sort by newest
      setRequests(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, type]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'serviceRequests', id), { status });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500">{description}</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
          <p className="text-xs font-bold text-emerald-600 uppercase">Live System</p>
          <p className="text-sm text-emerald-700 font-medium">Monitoring Requests...</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-sm font-medium text-slate-400 mb-1">New Requests</p>
          <p className="text-3xl font-bold text-slate-900">{requests.filter(r => r.status === 'pending').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-sm font-medium text-slate-400 mb-1">Confirmed</p>
          <p className="text-3xl font-bold text-emerald-600">{requests.filter(r => r.status === 'confirmed').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-sm font-medium text-slate-400 mb-1">Total Handled</p>
          <p className="text-3xl font-bold text-blue-600">{requests.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Incoming Requests</h2>
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-12 rounded-[40px] border border-dashed border-slate-200 text-center text-slate-400">
            No requests received yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-lg hover:shadow-slate-200/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                    <User size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{req.userName}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={14} /> {new Date(req.createdAt).toLocaleString()}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        req.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" : 
                        req.status === 'cancelled' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                      )}>{req.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {req.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => updateStatus(req.id, 'confirmed')}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle size={18} />
                        Confirm
                      </button>
                      <button 
                        onClick={() => updateStatus(req.id, 'cancelled')}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <XCircle size={24} />
                      </button>
                    </>
                  )}
                  {req.status === 'confirmed' && (
                    <button 
                      onClick={() => updateStatus(req.id, 'completed')}
                      className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
                    >
                      Mark Completed
                    </button>
                  )}
                  {req.status === 'completed' && (
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <CheckCircle size={20} />
                      Completed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

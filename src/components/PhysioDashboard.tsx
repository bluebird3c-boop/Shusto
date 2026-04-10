import React from 'react';
import { Activity, Users, Clock, CheckCircle } from 'lucide-react';

export function PhysioDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Physiotherapy Dashboard</h1>
        <p className="text-slate-500">Manage therapy sessions and patient recovery.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <Activity size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Active Sessions</p>
          <p className="text-2xl font-bold text-slate-900">8</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Total Patients</p>
          <p className="text-2xl font-bold text-slate-900">42</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
            <Clock size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Pending Requests</p>
          <p className="text-2xl font-bold text-slate-900">3</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 p-8 text-center text-slate-400">
        <p>Patient session management coming soon.</p>
      </div>
    </div>
  );
}

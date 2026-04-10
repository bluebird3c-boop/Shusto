import React from 'react';
import { Building, Bed, Users, Activity } from 'lucide-react';

export function HospitalDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Hospital Dashboard</h1>
        <p className="text-slate-500">Manage hospital admissions and department status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Bed size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Available Beds</p>
          <p className="text-2xl font-bold text-slate-900">24 / 100</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Current Patients</p>
          <p className="text-2xl font-bold text-slate-900">76</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
            <Activity size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Emergency Cases</p>
          <p className="text-2xl font-bold text-slate-900">5</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 p-8 text-center text-slate-400">
        <p>Hospital management system integration coming soon.</p>
      </div>
    </div>
  );
}

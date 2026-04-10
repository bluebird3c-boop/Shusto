import React from 'react';
import { FlaskConical, ClipboardList, CheckCircle, Clock } from 'lucide-react';

export function LabDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Lab Dashboard</h1>
        <p className="text-slate-500">Manage diagnostic tests and report generation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Pending Tests</p>
          <p className="text-2xl font-bold text-slate-900">15</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Completed Today</p>
          <p className="text-2xl font-bold text-slate-900">28</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
            <Clock size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Avg. Report Time</p>
          <p className="text-2xl font-bold text-slate-900">4.5 hrs</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 p-8 text-center text-slate-400">
        <p>Laboratory information management system coming soon.</p>
      </div>
    </div>
  );
}

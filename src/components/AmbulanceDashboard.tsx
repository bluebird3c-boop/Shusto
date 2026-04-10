import React from 'react';
import { Truck, MapPin, Phone, Clock } from 'lucide-react';

export function AmbulanceDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Ambulance Dashboard</h1>
        <p className="text-slate-500">Real-time emergency vehicle tracking and dispatch.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <Truck size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Available Units</p>
          <p className="text-2xl font-bold text-slate-900">4 / 6</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
            <Phone size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Active Calls</p>
          <p className="text-2xl font-bold text-slate-900">2</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Clock size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Avg. Response Time</p>
          <p className="text-2xl font-bold text-slate-900">12 min</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 p-8 text-center text-slate-400">
        <p>Real-time dispatch and GPS tracking coming soon.</p>
      </div>
    </div>
  );
}

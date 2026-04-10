import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  Calendar, 
  Clock, 
  ArrowRight, 
  Activity, 
  Thermometer, 
  Droplets,
  TrendingUp,
  Stethoscope, 
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Dashboard() {
  const { user } = useAuth();

  const stats = [
    { label: 'Heart Rate', value: '72 bpm', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Body Temp', value: '36.6 °C', icon: Thermometer, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Blood Pressure', value: '120/80', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.displayName?.split(' ')[0]}!</h1>
          <p className="text-slate-500">Here's what's happening with your health today.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <Calendar size={18} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Health Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center gap-5"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", stat.bg, stat.color)}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Appointment */}
        <div
          className="bg-emerald-500 rounded-[40px] p-8 text-white relative overflow-hidden"
        >
          <div className="relative z-10">
            <h3 className="text-lg font-medium opacity-80 mb-2">Upcoming Appointment</h3>
            <h2 className="text-3xl font-bold mb-6">No Appointments</h2>
            
            <p className="text-emerald-50 mb-8">You don't have any appointments scheduled for today.</p>

            <button className="bg-white text-emerald-600 px-8 py-4 rounded-2xl font-bold hover:bg-emerald-50 transition-colors flex items-center gap-2">
              Book Appointment
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
            <Stethoscope size={300} />
          </div>
        </div>

        {/* Health Activity */}
        <div className="bg-white rounded-[40px] border border-slate-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900">Health Activity</h3>
            <button className="text-emerald-600 font-bold text-sm">View All</button>
          </div>

          <div className="space-y-6">
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-100 rounded-3xl">
              No recent activity found.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

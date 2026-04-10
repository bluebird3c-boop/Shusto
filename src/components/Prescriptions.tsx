import React from 'react';
import { FileText, Download, Calendar, User } from 'lucide-react';

const PRESCRIPTIONS = [
  { id: '1', doctor: 'Dr. Sarah Ahmed', specialty: 'Cardiologist', date: '2024-03-15', status: 'Active' },
  { id: '2', doctor: 'Dr. James Wilson', specialty: 'Dermatologist', date: '2024-02-10', status: 'Completed' },
  { id: '3', doctor: 'Dr. Emily Chen', specialty: 'Pediatrician', date: '2024-01-25', status: 'Completed' },
];

export function Prescriptions() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Your Prescriptions</h1>
        <p className="text-slate-500">Access your digital prescriptions anytime, anywhere.</p>
      </div>

      <div className="grid gap-4">
        {PRESCRIPTIONS.map((pres, index) => (
          <div
            key={pres.id}
            className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-lg hover:shadow-slate-100 transition-all"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <FileText size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{pres.doctor}</h3>
                <p className="text-sm text-slate-500">{pres.specialty}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={18} />
                <span className="text-sm font-medium">{pres.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  pres.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {pres.status}
                </span>
              </div>
              <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-2xl hover:bg-slate-800 transition-colors">
                <Download size={18} />
                Download PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

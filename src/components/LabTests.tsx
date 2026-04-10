import React from 'react';
import { FlaskConical, Clock, Info, ChevronRight } from 'lucide-react';

const LAB_TESTS = [
  { id: '1', name: 'Complete Blood Count (CBC)', price: 450, time: '24 Hours', category: 'Blood Test' },
  { id: '2', name: 'Lipid Profile', price: 800, time: '12 Hours', category: 'Heart Health' },
  { id: '3', name: 'Thyroid Panel (T3, T4, TSH)', price: 1200, time: '48 Hours', category: 'Hormones' },
  { id: '4', name: 'Vitamin D Test', price: 2500, time: '24 Hours', category: 'Vitamins' },
  { id: '5', name: 'Kidney Function Test (KFT)', price: 900, time: '24 Hours', category: 'Kidney Health' },
  { id: '6', name: 'Liver Function Test (LFT)', price: 1000, time: '24 Hours', category: 'Liver Health' },
];

export function LabTests() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Lab Tests</h1>
        <p className="text-slate-500">Book diagnostic tests from certified labs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {LAB_TESTS.map((test, index) => (
          <div
            key={test.id}
            className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                <FlaskConical size={32} />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1 block">
                  {test.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{test.name}</h3>
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{test.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Info size={14} />
                    <span>Home Sample Collection</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900 mb-2">৳{test.price}</p>
              <button className="inline-flex items-center gap-1 text-emerald-600 font-bold text-sm hover:gap-2 transition-all">
                Book Test
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

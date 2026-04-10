import React from 'react';
import { Star, Clock, MapPin, Search } from 'lucide-react';

const DOCTORS = [
  { id: '1', name: 'Dr. Sarah Ahmed', specialty: 'Cardiologist', rating: 4.9, reviews: 120, fee: 800, image: 'https://picsum.photos/seed/doc1/400/400' },
  { id: '2', name: 'Dr. James Wilson', specialty: 'Dermatologist', rating: 4.8, reviews: 85, fee: 600, image: 'https://picsum.photos/seed/doc2/400/400' },
  { id: '3', name: 'Dr. Emily Chen', specialty: 'Pediatrician', rating: 5.0, reviews: 210, fee: 700, image: 'https://picsum.photos/seed/doc3/400/400' },
  { id: '4', name: 'Dr. Michael Brown', specialty: 'Neurologist', rating: 4.7, reviews: 64, fee: 1000, image: 'https://picsum.photos/seed/doc4/400/400' },
];

export function DoctorDirectory() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Find a Doctor</h1>
          <p className="text-slate-500">Book an appointment with top specialists.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by specialty or name..." 
            className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full md:w-80"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {DOCTORS.map((doc, index) => (
          <div
            key={doc.id}
            className="bg-white rounded-[32px] border border-slate-100 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
          >
            <div className="relative mb-6">
              <img 
                src={doc.image} 
                alt={doc.name} 
                className="w-full aspect-square object-cover rounded-3xl"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-xs font-bold text-amber-500">
                <Star size={14} fill="currentColor" />
                {doc.rating}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{doc.name}</h3>
                <p className="text-emerald-600 font-medium text-sm">{doc.specialty}</p>
              </div>

              <div className="flex items-center gap-4 text-slate-400 text-sm">
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>Available Today</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Consultation Fee</p>
                  <p className="text-lg font-bold text-slate-900">৳{doc.fee}</p>
                </div>
                <button className="px-6 py-3 bg-emerald-500 text-white text-sm font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all">
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

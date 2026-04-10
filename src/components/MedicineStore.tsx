import React from 'react';
import { Search, ShoppingCart, Filter } from 'lucide-react';

const MEDICINES = [
  { id: '1', name: 'Napa Extend', category: 'Pain Relief', price: 20, image: 'https://picsum.photos/seed/napa/400/300' },
  { id: '2', name: 'Fexo 120', category: 'Allergy', price: 150, image: 'https://picsum.photos/seed/fexo/400/300' },
  { id: '3', name: 'Sergel 20', category: 'Gastric', price: 210, image: 'https://picsum.photos/seed/sergel/400/300' },
  { id: '4', name: 'Alatrol', category: 'Allergy', price: 40, image: 'https://picsum.photos/seed/alatrol/400/300' },
  { id: '5', name: 'Seclo 20', category: 'Gastric', price: 180, image: 'https://picsum.photos/seed/seclo/400/300' },
  { id: '6', name: 'Ace Plus', category: 'Pain Relief', price: 30, image: 'https://picsum.photos/seed/ace/400/300' },
];

export function MedicineStore() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Oushud Store</h1>
          <p className="text-slate-500">Order your medicines with home delivery.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search medicines..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full md:w-64"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
            <Filter size={20} />
          </button>
          <button className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MEDICINES.map((med, index) => (
          <div
            key={med.id}
            className="bg-white rounded-3xl border border-slate-100 overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all"
          >
            <div className="aspect-[4/3] overflow-hidden relative">
              <img 
                src={med.image} 
                alt={med.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-emerald-600 text-xs font-bold rounded-full">
                  {med.category}
                </span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-1">{med.name}</h3>
              <p className="text-sm text-slate-500 mb-4">Pack of 10 tablets</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-emerald-600">৳{med.price}</span>
                <button className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

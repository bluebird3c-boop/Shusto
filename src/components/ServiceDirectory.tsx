import React, { useEffect, useState } from 'react';
import { Search, MapPin, Phone, ExternalLink } from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';

interface ServiceProvider {
  id: string;
  name: string;
  location: string;
  contact: string;
  email: string;
  type: string;
}

interface ServiceDirectoryProps {
  type: 'pharmacy' | 'lab' | 'physio' | 'hospital' | 'ambulance';
  title: string;
  description: string;
}

export function ServiceDirectory({ type, title, description }: ServiceDirectoryProps) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const collectionName = type === 'pharmacy' ? 'pharmacies' : 
                         type === 'lab' ? 'labs' : 
                         type === 'physio' ? 'physios' : 
                         type === 'hospital' ? 'hospitals' : 'ambulances';
    
    const q = query(collection(db, collectionName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceProvider[];
      setProviders(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [type]);

  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500">{description}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={`Search ${type}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full md:w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading {type}s...</div>
      ) : filteredProviders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
          No {type}s found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <div
              key={provider.id}
              className="bg-white p-6 rounded-[32px] border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <MapPin size={28} />
                </div>
                <a 
                  href={`tel:${provider.contact}`}
                  className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                >
                  <Phone size={20} />
                </a>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">{provider.name}</h3>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <MapPin size={14} />
                  <span>{provider.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Phone size={14} />
                  <span>{provider.contact}</span>
                </div>
              </div>

              <button className="w-full py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2">
                View Details
                <ExternalLink size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

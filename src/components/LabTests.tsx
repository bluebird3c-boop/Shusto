import React, { useEffect, useState } from 'react';
import { FlaskConical, Clock, Info, ChevronRight } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

interface LabTest {
  id: string;
  name: string;
  price: number;
  category: string;
  time?: string;
}

export function LabTests() {
  const [manualTests, setManualTests] = useState<LabTest[]>([]);
  const [userLabs, setUserLabs] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch from 'labTests' collection
    const qTests = query(collection(db, 'labTests'));
    const unsubTests = onSnapshot(qTests, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LabTest[];
      setManualTests(docs);
      setLoading(false);
    }, (error) => {
      console.error("Lab tests fetch error:", error);
      setLoading(false);
    });

    // Also fetch from 'users' collection where role is 'lab'
    const qUsers = query(collection(db, 'users'), where('role', '==', 'lab'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || 'Unnamed Lab',
          category: 'Diagnostic Center',
          price: 0, // Labs might not have a single price
          time: '24 Hours'
        };
      }) as LabTest[];
      setUserLabs(docs);
      setLoading(false);
    }, (error) => console.error("Users-Labs fetch error:", error));

    return () => {
      unsubTests();
      unsubUsers();
    };
  }, []);

  const allTests = [...manualTests, ...userLabs];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Lab Tests</h1>
        <p className="text-slate-500">Book diagnostic tests from certified labs.</p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading tests...</div>
      ) : allTests.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
          No lab tests available. Please add some from the Admin Panel.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allTests.map((test) => (
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
                      <span>{test.time || '24 Hours'}</span>
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
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { FlaskConical, Clock, Info, ChevronRight } from 'lucide-react';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { X } from 'lucide-react';

interface LabTest {
  id: string;
  name: string;
  price: number;
  category: string;
  time?: string;
}

export function LabTests() {
  const { user } = useAuth();
  const [manualTests, setManualTests] = useState<LabTest[]>([]);
  const [userLabs, setUserLabs] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingTest, setBookingTest] = useState<LabTest | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success'>('idle');

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

  const handleBook = async () => {
    if (!user || !bookingTest) return;
    setBookingStatus('booking');
    try {
      await addDoc(collection(db, 'labOrders'), {
        userId: user.uid,
        userName: user.displayName,
        testId: bookingTest.id,
        testName: bookingTest.name,
        price: bookingTest.price,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setBookingStatus('success');
      setTimeout(() => {
        setBookingStatus('idle');
        setBookingTest(null);
      }, 2000);
    } catch (error) {
      console.error("Lab booking error:", error);
      setBookingStatus('idle');
    }
  };

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
                <button 
                  onClick={() => setBookingTest(test)}
                  className="inline-flex items-center gap-1 text-emerald-600 font-bold text-sm hover:gap-2 transition-all"
                >
                  Book Test
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {bookingTest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Book Lab Test</h2>
              <button onClick={() => setBookingTest(null)} className="p-2 hover:bg-slate-50 rounded-xl">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl mb-8">
              <p className="text-xs font-bold text-emerald-600 uppercase mb-1">{bookingTest.category}</p>
              <h3 className="text-xl font-bold text-slate-900 mb-4">{bookingTest.name}</h3>
              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Test Price</span>
                <span className="text-2xl font-bold text-emerald-600">৳{bookingTest.price}</span>
              </div>
            </div>

            <button 
              onClick={handleBook}
              disabled={bookingStatus !== 'idle'}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {bookingStatus === 'booking' ? 'Processing...' : bookingStatus === 'success' ? 'Test Booked!' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

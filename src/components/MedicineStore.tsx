import React, { useEffect, useState } from 'react';
import { Search, ShoppingCart, Filter, X, Plus, Loader2, ChevronRight } from 'lucide-react';
import { collection, query, addDoc, where, getDocs, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData, doc, getDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  generic?: string;
  company?: string;
}

interface CartItem extends Medicine {
  quantity: number;
}

export function MedicineStore() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'ordering' | 'success'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchMedicines = async (isLoadMore = false) => {
    if (loading || (isLoadMore && !hasMore)) return;
    
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      let q;
      
      if (searchQuery) {
        // Firestore prefix search
        q = query(
          collection(db, 'medicines'),
          where('name', '>=', searchQuery),
          where('name', '<=', searchQuery + '\uf8ff'),
          orderBy('name'),
          limit(20)
        );
      } else {
        q = query(
          collection(db, 'medicines'),
          orderBy('name'),
          limit(20)
        );
      }

      if (selectedCategory !== 'All') {
        q = query(q, where('category', '==', selectedCategory));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newMeds = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        // Apply better placeholder logic if image is missing
        if (!data.image) {
          const nameLower = (data.name || '').toLowerCase();
          if (nameLower.includes('napa') || nameLower.includes('acetaminophen') || nameLower.includes('paracetamol')) {
            data.image = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600';
          } else if (nameLower.includes('seclo') || nameLower.includes('gastric') || nameLower.includes('omeprazole') || nameLower.includes('sergel') || nameLower.includes('maxpro')) {
            data.image = 'https://images.unsplash.com/photo-1580281658626-ee379f3cce93?q=80&w=600';
          } else if (nameLower.includes('calcium') || nameLower.includes('vitamin') || nameLower.includes('ecap') || nameLower.includes('bextram')) {
            data.image = 'https://images.unsplash.com/photo-1615461066841-f6677c789c6e?q=80&w=600';
          } else if (nameLower.includes('antibiotic') || nameLower.includes('zithrin')) {
            data.image = 'https://images.unsplash.com/photo-1512069772995-ec65ed4563c3?q=80&w=600';
          } else if (nameLower.includes('allergy') || nameLower.includes('fenadin') || nameLower.includes('alatrol')) {
            data.image = 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?q=80&w=600';
          }
        }
        return { id: doc.id, ...data } as Medicine;
      });
      
      if (isLoadMore) {
        setMedicines(prev => [...prev, ...newMeds]);
      } else {
        setMedicines(newMeds);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 20);
    } catch (error) {
      console.error("Error fetching medicines:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedicines();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const addToCart = (medicine: Medicine) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === medicine.id);
      if (existing) {
        return prev.map(item => item.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...medicine, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const categories = ['All', 'Fever & Pain', 'Gastric', 'Allergy', 'Antibiotic', 'Diabetes', 'Blood Pressure', 'Asthma', 'Anxiety', 'Supplements', 'Nutrition'];

  const total = cart.reduce((sum, item) => {
    const p = String(item.price).match(/\d+/) ? Number(String(item.price).match(/\d+/)![0]) : 0;
    return sum + (p * item.quantity);
  }, 0);

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;
    if (total <= 0) {
      alert("অর্ডার করার মতো কোনো পণ্য নেই।");
      return;
    }

    setOrderStatus('ordering');
    try {
      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, 'wallets', user.uid);
        const walletSnap = await transaction.get(walletRef);
        const balance = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;

        if (balance < total) {
          throw new Error('insufficient_balance');
        }

        // Fetch Admin 
        const adminQuery = query(collection(db, 'users'), where('email', '==', 'shustobd@gmail.com'), limit(1));
        const adminSnap = await getDocs(adminQuery);
        if (adminSnap.empty) throw new Error('admin_not_found');
        const adminUid = adminSnap.docs[0].id;
        const adminWalletRef = doc(db, 'wallets', adminUid);

        // 1. Create Order
        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, {
          userId: user.uid,
          userName: user.displayName || user.email,
          items: cart.map(item => `${item.name} x${item.quantity}`),
          total,
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        // 2. Wallet Operations
        transaction.update(walletRef, {
          balance: increment(-total),
          updatedAt: new Date().toISOString()
        });

        // Handle Referral logic
        let adminBonus = total;
        const userDoc = await transaction.get(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData?.referredBy) {
          // 10% of profit (here assumed total is profit as it's direct buy from shusto)
          const commission = total * 0.10;
          const referrerWalletRef = doc(db, 'wallets', userData.referredBy);
          
          transaction.set(referrerWalletRef, {
            uid: userData.referredBy,
            balance: increment(commission),
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Record Affiliate TX
          const affTxRef = doc(collection(db, 'transactions'));
          transaction.set(affTxRef, {
            userId: userData.referredBy,
            amount: commission,
            type: 'affiliate_commission',
            status: 'success',
            details: `Commission from ${user.displayName}'s medicine order (Ref: ${orderRef.id})`,
            createdAt: new Date().toISOString()
          });

          adminBonus -= commission;
        }

        // Credit Admin
        transaction.set(adminWalletRef, {
          uid: adminUid,
          balance: increment(adminBonus),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // 3. Record Main Transaction
        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          userId: user.uid,
          amount: total,
          type: 'payment',
          status: 'success',
          targetId: orderRef.id,
          targetName: 'Medicine Order',
          details: cart.map(item => `${item.name} x${item.quantity}`).join(', '),
          createdAt: new Date().toISOString()
        });
      });

      setOrderStatus('success');
      setTimeout(() => {
        setCart([]);
        setShowCart(false);
        setOrderStatus('idle');
      }, 2000);
    } catch (error: any) {
      console.error("Order error:", error);
      if (error.message === 'insufficient_balance') {
        alert('আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। দয়া করে টাকা যোগ করুন।');
      } else {
        alert("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
      setOrderStatus('idle');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ঔষধ স্টোর</h1>
          <p className="text-slate-500">হোম ডেলিভারি সহ আপনার প্রয়োজনীয় ঔষধ অর্ডার করুন।</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.email === 'shustobd@gmail.com' && (
            <button 
              onClick={async () => {
                if (!confirm('Sync realistic medicine images to Firestore?')) return;
                const medicinePresets = [
                  { name: 'Napa Extend', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800' },
                  { name: 'Seclo 20', image: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?q=80&w=800' },
                  { name: 'Fenadin 120', image: 'https://images.unsplash.com/photo-1628771065518-0d82f1110547?q=80&w=800' },
                  { name: 'Zithrin 500', image: 'https://images.unsplash.com/photo-1512069772995-ec65ed4563c3?q=80&w=800' },
                  { name: 'Calbo-D', image: 'https://images.unsplash.com/photo-1559113513-d56096310226?q=80&w=800' },
                  { name: 'Alatrol', image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?q=80&w=800' },
                  { name: 'Monas 10', image: 'https://images.unsplash.com/photo-1579349281204-9e9005bc1ddd?q=80&w=800' },
                  { name: 'Sergel 20', image: 'https://images.unsplash.com/photo-1580281658626-ee379f3cce93?q=80&w=800' },
                  { name: 'Maxpro 20', image: 'https://images.unsplash.com/photo-1588674585182-0e2313d3ccf9?q=80&w=800' },
                  { name: 'Bextram Gold', image: 'https://images.unsplash.com/photo-1615461066841-f6677c789c6e?q=80&w=800' }
                ];
                for (const med of medicinePresets) {
                  const id = `med_${med.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                  await updateDoc(doc(db, 'medicines', id), { image: med.image }).catch(() => {});
                }
                alert('Images synced! Refresh to see changes.');
              }}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all"
            >
              Sync Images
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search medicines..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full md:w-64"
            />
          </div>
          <div className="relative group">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-600 font-medium cursor-pointer"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <button 
            onClick={() => setShowCart(true)}
            className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 relative"
          >
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
          <p className="text-slate-500 font-medium">Searching 22,000+ medicines...</p>
        </div>
      ) : medicines.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
          No medicines found matching your criteria.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {medicines.map((med) => (
              <div
                key={med.id}
                className="bg-white rounded-3xl border border-slate-100 overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all"
              >
                <div className="aspect-square overflow-hidden relative bg-slate-50 flex items-center justify-center p-2">
                  <img 
                    src={med.image || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600`} 
                    alt={med.name} 
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600';
                    }}
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-md shadow-sm uppercase tracking-tighter">
                      {med.category}
                    </span>
                    {med.company && (
                      <span className="px-2 py-0.5 bg-slate-900/5 backdrop-blur-md text-slate-900 text-[9px] font-black rounded-md uppercase tracking-tighter border border-slate-900/5">
                        {med.company}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{med.name}</h3>
                  <div className="flex flex-col gap-0.5 mb-4">
                    <p className="text-xs font-medium text-emerald-600">{med.generic}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{med.company}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-emerald-600">৳{med.price}</span>
                    <button 
                      onClick={() => addToCart(med)}
                      className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                      কার্টে যোগ করুন
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pb-12">
              <button
                onClick={() => fetchMedicines(true)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More Medicines
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">আপনার কার্ট</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-50 rounded-xl">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                  <ShoppingCart size={64} className="opacity-20" />
                  <p>আপনার কার্ট খালি</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                    <img src={item.image || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=100`} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{item.name}</h4>
                      <p className="text-sm text-slate-500">৳{item.price} x {item.quantity}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-slate-500">মোট পরিমাণ</span>
                  <span className="text-emerald-600 text-2xl">৳{total}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={orderStatus !== 'idle'}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {orderStatus === 'ordering' ? 'অর্ডার করা হচ্ছে...' : orderStatus === 'success' ? 'অর্ডার সফল হয়েছে!' : 'চেকআউট করুন'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Search, ShoppingCart, Filter, X, Plus, Loader2, ChevronRight } from 'lucide-react';
import { collection, query, addDoc, where, getDocs, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
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

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;
    setOrderStatus('ordering');
    try {
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        userName: user.displayName,
        items: cart.map(item => `${item.name} x${item.quantity}`),
        total,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setOrderStatus('success');
      setTimeout(() => {
        setCart([]);
        setShowCart(false);
        setOrderStatus('idle');
      }, 2000);
    } catch (error) {
      console.error("Order error:", error);
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
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img 
                    src={med.image || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400`} 
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

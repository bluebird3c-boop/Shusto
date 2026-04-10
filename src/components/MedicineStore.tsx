import React, { useEffect, useState } from 'react';
import { Search, ShoppingCart, Filter } from 'lucide-react';
import { collection, onSnapshot, query, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { X } from 'lucide-react';

interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
}

interface CartItem extends Medicine {
  quantity: number;
}

export function MedicineStore() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'ordering' | 'success'>('idle');

  useEffect(() => {
    const q = query(collection(db, 'medicines'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medicine[];
      setMedicines(docs);
      setLoading(false);
    }, (error) => {
      console.error("Medicine fetch error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
        <div className="p-12 text-center text-slate-400">Loading medicines...</div>
      ) : medicines.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
          No medicines available. Please add some from the Admin Panel.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {medicines.map((med) => (
            <div
              key={med.id}
              className="bg-white rounded-3xl border border-slate-100 overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <img 
                  src={med.image || `https://picsum.photos/seed/${med.id}/400/300`} 
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
                  <button 
                    onClick={() => addToCart(med)}
                    className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Your Cart</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-50 rounded-xl">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                  <ShoppingCart size={64} className="opacity-20" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                    <img src={item.image || `https://picsum.photos/seed/${item.id}/100/100`} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
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
                  <span className="text-slate-500">Total Amount</span>
                  <span className="text-emerald-600 text-2xl">৳{total}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={orderStatus !== 'idle'}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {orderStatus === 'ordering' ? 'Placing Order...' : orderStatus === 'success' ? 'Order Placed!' : 'Checkout Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

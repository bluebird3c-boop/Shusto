import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Pill, ShoppingBag, Clock, CheckCircle, User as UserIcon } from 'lucide-react';

interface Order {
  id: string;
  userName: string;
  items: string[];
  total: number;
  status: string;
}

export function PharmacyDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(list);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Pharmacy Dashboard</h1>
        <p className="text-slate-500">Manage medicine orders and inventory.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <ShoppingBag size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">New Orders</p>
          <p className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'pending').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Completed</p>
          <p className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'completed').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
            <Pill size={24} />
          </div>
          <p className="text-sm font-medium text-slate-400">Low Stock Items</p>
          <p className="text-2xl font-bold text-slate-900">12</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Recent Orders</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No orders found.</div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{order.userName}</p>
                    <p className="text-sm text-slate-500">{order.items.length} items • ৳{order.total}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400 flex items-center gap-1">
                    <Clock size={14} /> 10 mins ago
                  </span>
                  <button className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all">
                    Process
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

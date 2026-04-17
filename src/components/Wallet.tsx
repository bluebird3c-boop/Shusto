import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Wallet as WalletIcon, Plus, History, ArrowUpRight, ArrowDownLeft, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';

interface Transaction {
  id: string;
  amount: number;
  type: 'payment' | 'add_money' | 'withdrawal';
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

export function Wallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check for payment success from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      alert('পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!');
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to wallet balance
    const walletRef = doc(db, 'wallets', user.uid);
    const unsubscribeWallet = onSnapshot(walletRef, (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().balance || 0);
      } else {
        // Initialize wallet if not exists
        setDoc(walletRef, { uid: user.uid, balance: 0, updatedAt: new Date().toISOString() });
      }
    });

    // Listen to transactions
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });

    return () => {
      unsubscribeWallet();
      unsubscribeTransactions();
    };
  }, [user]);

  const handleAddMoney = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('সঠিক পরিমাণ লিখুন।');
      return;
    }

    try {
      const response = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          userId: user?.uid,
          userName: user?.displayName,
          userEmail: user?.email,
          providerType: 'add_money'
        })
      });

      const data = await response.json();
      if (data.GatewayPageURL) {
        window.location.href = data.GatewayPageURL;
      } else {
        alert('পেমেন্ট গেটওয়ে লোড করা সম্ভব হয়নি। পরে আবার চেষ্টা করুন।');
      }
    } catch (error) {
      console.error("Payment Error:", error);
      alert('পেমেন্ট প্রসেসিং ব্যর্থ হয়েছে।');
    }
  };

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('সঠিক পরিমাণ লিখুন।');
      return;
    }
    if (Number(amount) > balance) {
      alert('আপনার পর্যাপ্ত ব্যালেন্স নেই।');
      return;
    }
    if (!phoneNumber || phoneNumber.length < 11) {
      alert('সঠিক মোবাইল নম্বর লিখুন।');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/withdraw/automatic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          amount: Number(amount),
          method: withdrawMethod,
          phoneNumber: phoneNumber
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        alert(data.message || 'আপনার টাকা সফলভাবে পাঠানো হয়েছে।');
        setShowWithdraw(false);
        setAmount('');
        setPhoneNumber('');
      } else {
        alert(data.error || 'টাকা পাঠানো সম্ভব হয়নি। দয়া করে পরে আবার চেষ্টা করুন।');
      }
    } catch (error) {
      console.error("Withdrawal Error:", error);
      alert('একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading wallet...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Balance Card */}
        <div className="bg-emerald-500 rounded-[40px] p-8 text-white shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <WalletIcon size={24} />
              </div>
              <span className="text-sm font-bold opacity-80 uppercase tracking-wider">Shusto Wallet</span>
            </div>
            <p className="text-sm opacity-80 mb-1">Current Balance</p>
            <h2 className="text-5xl font-bold mb-8">৳{balance.toLocaleString()}</h2>
            <button 
              onClick={() => setShowAddMoney(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 font-bold rounded-2xl hover:bg-emerald-50 transition-all"
            >
              <Plus size={20} />
              Add Money
            </button>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full" />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 flex flex-col justify-center">
          <h3 className="text-xl font-bold text-slate-900 mb-6">কুইক অ্যাকশন</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setShowWithdraw(true)}
              className="p-4 bg-slate-50 rounded-3xl flex flex-col items-center gap-2 hover:bg-slate-100 transition-all group"
            >
              <div className="p-3 bg-white rounded-2xl group-hover:scale-110 transition-transform">
                <CreditCard className="text-slate-600" />
              </div>
              <span className="text-sm font-bold text-slate-600">উইথড্র</span>
            </button>
            <button className="p-4 bg-slate-50 rounded-3xl flex flex-col items-center gap-2 hover:bg-slate-100 transition-all group">
              <div className="p-3 bg-white rounded-2xl group-hover:scale-110 transition-transform">
                <History className="text-slate-600" />
              </div>
              <span className="text-sm font-bold text-slate-600">স্টেটমেন্ট</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Recent Transactions</h2>
          <button className="text-emerald-600 font-bold text-sm hover:underline">View All</button>
        </div>
        <div className="divide-y divide-slate-50">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No transactions yet.</div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    tx.type === 'add_money' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                  )}>
                    {tx.type === 'add_money' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 capitalize">{tx.type.replace('_', ' ')}</p>
                    <p className="text-sm text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-bold text-lg",
                    tx.type === 'add_money' ? "text-emerald-600" : "text-slate-900"
                  )}>
                    {tx.type === 'add_money' ? '+' : '-'}৳{tx.amount}
                  </p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                    tx.status === 'success' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  )}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">টাকা যোগ করুন</h2>
            <p className="text-slate-500 mb-8">আপনার Shusto ওয়ালেটে কত টাকা যোগ করতে চান?</p>
            
            <div className="space-y-6">
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">৳</span>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-12 pr-6 py-5 bg-slate-50 border-none rounded-3xl text-2xl font-bold focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="0.00"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {[500, 1000, 2000].map(val => (
                  <button 
                    key={val}
                    onClick={() => setAmount(val.toString())}
                    className="py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                  >
                    +৳{val}
                  </button>
                ))}
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => {
                    setShowAddMoney(false);
                    setAmount('');
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  বাতিল
                </button>
                <button 
                  onClick={handleAddMoney}
                  className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                >
                  এগিয়ে যান
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">টাকা উত্তোলন (Withdraw)</h2>
            <p className="text-slate-500 mb-8">বিকাশ বা নগদের মাধ্যমে টাকা উত্তোলন করুন।</p>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setWithdrawMethod('bkash')}
                  className={cn(
                    "py-4 rounded-2xl font-bold border-2 transition-all",
                    withdrawMethod === 'bkash' ? "bg-pink-50 border-pink-500 text-pink-600" : "bg-slate-50 border-transparent text-slate-500"
                  )}
                >
                  বিকাশ (bKash)
                </button>
                <button 
                  onClick={() => setWithdrawMethod('nagad')}
                  className={cn(
                    "py-4 rounded-2xl font-bold border-2 transition-all",
                    withdrawMethod === 'nagad' ? "bg-orange-50 border-orange-500 text-orange-600" : "bg-slate-50 border-transparent text-slate-500"
                  )}
                >
                  নগদ (Nagad)
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">পরিমাণ (Amount)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">৳</span>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-xl font-bold focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">মোবাইল নম্বর (Phone)</label>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-lg font-bold focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="01XXXXXXXXX"
                />
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => {
                    setShowWithdraw(false);
                    setAmount('');
                    setPhoneNumber('');
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  বাতিল
                </button>
                <button 
                  onClick={handleWithdraw}
                  disabled={processing}
                  className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
                >
                  {processing ? 'প্রসেসিং...' : 'সাবমিট করুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

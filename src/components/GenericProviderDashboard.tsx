import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, orderBy, getDoc, setDoc, increment, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Clock, User, CheckCircle, XCircle, MapPin, Phone, Plus, Trash2, Image as ImageIcon, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

interface ServiceRequest {
  id: string;
  userId: string;
  userName: string;
  userLocation?: string;
  providerId: string | null;
  providerName: string;
  providerType: string;
  status: string;
  price?: number;
  details?: string;
  createdAt: string;
}

interface Post {
  id: string;
  providerId: string;
  providerName: string;
  providerType: string;
  title: string;
  description: string;
  price?: string;
  image?: string;
  createdAt: string;
}

interface GenericProviderDashboardProps {
  type: 'pharmacy' | 'lab' | 'physio' | 'hospital' | 'ambulance';
  title: string;
  description: string;
}

export function GenericProviderDashboard({ type, title, description }: GenericProviderDashboardProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'posts'>('requests');
  const [showAddPost, setShowAddPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', description: '', price: '', image: '' });
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Wallet balance listener
    const unsubWallet = onSnapshot(doc(db, 'wallets', user.uid), (doc) => {
      if (doc.exists()) {
        setWalletBalance(doc.data().balance || 0);
      }
    });

    // Requests listener - show direct orders OR global orders of this type
    const qRequests = query(
      collection(db, 'serviceRequests'), 
      where('providerType', '==', type)
    );

    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceRequest[];

      // Filter: Show direct orders for this provider OR general orders for "Any Center" in the same location
      const providerLocation = (user as any).location;
      
      const filteredList = list.filter(req => {
        // Direct order - always show
        if (req.providerId === user.uid || req.providerId === `u_${user.uid}`) {
          return true;
        }
        
        // General order - filter by type (already done in query) AND location
        if (req.providerId === null) {
          // If provider has no location specified, show all general orders for now (fallback)
          if (!providerLocation || providerLocation === 'Pending') return true;
          
          // Match by location (case insensitive, partial match)
          return req.userLocation?.toLowerCase().includes(providerLocation.toLowerCase()) || 
                 providerLocation.toLowerCase().includes(req.userLocation?.toLowerCase() || "");
        }
        
        return false;
      });

      setRequests(filteredList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });

    // Posts listener
    const qPosts = query(
      collection(db, 'posts'),
      where('providerType', '==', type),
      where('providerId', 'in', [user.uid, `u_${user.uid}`])
    );

    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => {
      unsubWallet();
      unsubRequests();
      unsubPosts();
    };
  }, [user, type]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'serviceRequests', id), { status });

      if (status === 'completed' && user) {
        // Handle Revenue Split
        const reqSnap = await getDoc(doc(db, 'serviceRequests', id));
        if (reqSnap.exists()) {
          const reqData = reqSnap.data();
          const amount = reqData.price || 0;
          const userId = reqData.userId;

          if (amount > 0) {
            const { calculateRevenueSplit } = await import('../utils/revenueSplit');
            const { providerShare, shustoShare } = calculateRevenueSplit(amount, type);

            // 1. Update Provider Wallet
            const providerWalletRef = doc(db, 'wallets', user.uid);
            await setDoc(providerWalletRef, {
              uid: user.uid,
              balance: increment(providerShare),
              updatedAt: new Date().toISOString()
            }, { merge: true });

            // 2. Handle Referral Commission (10% of Shusto's Share)
            let finalShustoShare = shustoShare;
            const userSnap = await getDoc(doc(db, 'users', userId));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData.referredBy) {
                const commission = shustoShare * 0.10;
                const referrerRef = doc(db, 'wallets', userData.referredBy);
                
                await setDoc(referrerRef, {
                  uid: userData.referredBy,
                  balance: increment(commission),
                  updatedAt: new Date().toISOString()
                }, { merge: true });

                // Record Affiliate Transaction
                await addDoc(collection(db, 'transactions'), {
                  userId: userData.referredBy, // The pharmacy/state who gets the commission
                  amount: commission,
                  type: 'affiliate_commission',
                  status: 'success',
                  details: `Commission from ${reqData.userName}'s purchase (Ref: ${id})`,
                  createdAt: new Date().toISOString()
                });

                finalShustoShare -= commission;
              }
            }

            // 3. Update Admin Wallet (Shusto's Remaining Profit)
            const adminQuery = query(collection(db, 'users'), where('email', '==', 'shustobd@gmail.com'), limit(1));
            const adminSnap = await getDocs(adminQuery);
            if (!adminSnap.empty) {
              const adminUid = adminSnap.docs[0].id;
              const adminWalletRef = doc(db, 'wallets', adminUid);
              await setDoc(adminWalletRef, {
                uid: adminUid,
                balance: increment(finalShustoShare),
                updatedAt: new Date().toISOString()
              }, { merge: true });

              // Record Split Transaction
              await addDoc(collection(db, 'transactions'), {
                userId: adminUid,
                providerId: user.uid,
                amount: amount,
                providerShare,
                shustoShare: finalShustoShare,
                type: 'payment',
                status: 'success',
                targetId: id,
                targetName: `Split from ${user.displayName} (${type})`,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'posts'), {
        ...newPost,
        providerId: `u_${user.uid}`,
        providerName: user.displayName || 'Provider',
        providerType: type,
        createdAt: new Date().toISOString()
      });
      setNewPost({ title: '', description: '', price: '', image: '' });
      setShowAddPost(false);
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const deletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  return (
    <div className="space-y-8">
      {type === 'pharmacy' && (
        <div className="bg-emerald-900 text-white p-8 rounded-[40px] relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Reffaral & State Status</h2>
            <p className="text-emerald-300 mb-6">আমাদের রেফারেল প্রোগ্রামের মাধ্যমে ১০% এক্সট্রা ইনকাম করুন।</p>
            
            <div className="flex flex-wrap gap-6 items-end">
              <div className="flex-1 min-w-[300px]">
                <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">আপনার রেফারেল লিংক</label>
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value={`${window.location.origin}?ref=${user?.uid}`}
                    className="flex-1 bg-white/10 border border-white/10 px-4 py-3 rounded-xl font-mono text-xs focus:outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}?ref=${user?.uid}`);
                      alert("লিংক কপি করা হয়েছে!");
                    }}
                    className="px-6 py-3 bg-white text-emerald-900 font-bold rounded-xl hover:bg-emerald-50 transition-all"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 min-w-[200px]">
                <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">রেফারেল পেমেন্ট (১০%)</p>
                <p className="text-2xl font-black">৳{Math.round(walletBalance * 0.1)} <span className="text-[10px] font-normal text-emerald-300">Est. Bonus</span></p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Tag size={300} />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('requests')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === 'requests' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            অনুরোধসমূহ
          </button>
          {type !== 'lab' && type !== 'physio' && (
            <button 
              onClick={() => setActiveTab('posts')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'posts' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              পোস্ট ম্যানেজ করুন
            </button>
          )}
        </div>
      </div>

      {activeTab === 'requests' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <p className="text-sm font-medium text-slate-400 mb-1">ব্যালেন্স</p>
              <p className="text-3xl font-bold text-slate-900 font-sans">৳{walletBalance}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <p className="text-sm font-medium text-slate-400 mb-1">নতুন অনুরোধ</p>
              <p className="text-3xl font-bold text-slate-900">{requests.filter(r => r.status === 'pending').length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <p className="text-sm font-medium text-slate-400 mb-1">নিশ্চিত করা হয়েছে</p>
              <p className="text-3xl font-bold text-emerald-600">{requests.filter(r => r.status === 'confirmed').length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <p className="text-sm font-medium text-slate-400 mb-1">মোট অনুরোধ</p>
              <p className="text-3xl font-bold text-blue-600">{requests.length}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">আগত অনুরোধসমূহ</h2>
            {loading ? (
              <div className="p-12 text-center text-slate-400">অনুরোধ লোড হচ্ছে...</div>
            ) : requests.length === 0 ? (
              <div className="bg-white p-12 rounded-[40px] border border-dashed border-slate-200 text-center text-slate-400">
                এখনো কোনো অনুরোধ পাওয়া যায়নি।
              </div>
            ) : (
              <div className="grid gap-4">
                {requests.map((req) => (
                  <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-lg hover:shadow-slate-200/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                        <User size={28} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{req.userName}</h3>
                        <p className="text-xs text-emerald-600 font-bold mb-1">{req.userLocation ? `Location: ${req.userLocation}` : 'Location: Not specified'}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1"><Clock size={14} /> {new Date(req.createdAt).toLocaleString()}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            req.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" : 
                            req.status === 'cancelled' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                          )}>{req.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.providerId === null && req.status === 'pending' && (
                         <div className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-full border border-amber-100">
                           সাধারণ অনুরোধ (General)
                         </div>
                      )}
                      {req.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => updateStatus(req.id, 'confirmed')}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <CheckCircle size={18} />
                            Confirm
                          </button>
                          <button 
                            onClick={() => updateStatus(req.id, 'cancelled')}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <XCircle size={24} />
                          </button>
                        </>
                      )}
                      {req.status === 'confirmed' && (
                        <button 
                          onClick={() => updateStatus(req.id, 'completed')}
                          className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
                        >
                          Mark Completed
                        </button>
                      )}
                      {req.status === 'completed' && (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold">
                          <CheckCircle size={20} />
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Your Posts & Products</h2>
            <button 
              onClick={() => setShowAddPost(true)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus size={18} />
              Create New Post
            </button>
          </div>

          {posts.length === 0 ? (
            <div className="bg-white p-12 rounded-[40px] border border-dashed border-slate-200 text-center text-slate-400">
              You haven't posted anything yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4 relative group">
                  <button 
                    onClick={() => deletePost(post.id)}
                    className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                  {post.image && (
                    <img src={post.image} alt={post.title} className="w-full h-40 object-cover rounded-2xl" />
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{post.title}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2">{post.description}</p>
                  </div>
                  {post.price && (
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <Tag size={16} />
                      ৳{post.price}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Post Modal */}
      {showAddPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Create New Post</h2>
              <button onClick={() => setShowAddPost(false)} className="p-2 hover:bg-slate-50 rounded-xl"><XCircle size={24} className="text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Title / Product Name</label>
                <input 
                  required
                  type="text" 
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  placeholder="e.g. ICU Bed Available, MRI Test 20% Off"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={newPost.description}
                  onChange={(e) => setNewPost({...newPost, description: e.target.value})}
                  placeholder="Describe your service or product..."
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Price (Optional)</label>
                  <input 
                    type="text" 
                    value={newPost.price}
                    onChange={(e) => setNewPost({...newPost, price: e.target.value})}
                    placeholder="e.g. 5000/day"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Image URL (Optional)</label>
                  <input 
                    type="text" 
                    value={newPost.image}
                    onChange={(e) => setNewPost({...newPost, image: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all mt-4"
              >
                Post Now
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

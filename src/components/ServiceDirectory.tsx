import React, { useEffect, useState } from 'react';
import { Search, MapPin, Phone, ExternalLink, Clock, CheckCircle, Tag, XCircle } from 'lucide-react';
import { collection, onSnapshot, query, addDoc, where, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';

interface ServiceProvider {
  id: string;
  name: string;
  location: string;
  contact: string;
  email: string;
  type: string;
}

interface Post {
  id: string;
  title: string;
  description: string;
  price?: string;
  image?: string;
}

interface ServiceDirectoryProps {
  type: 'pharmacy' | 'lab' | 'physio' | 'hospital' | 'ambulance';
  title: string;
  description: string;
}

export function ServiceDirectory({ type, title, description }: ServiceDirectoryProps) {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [providerPosts, setProviderPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success'>('idle');

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

  useEffect(() => {
    if (!selectedProvider) {
      setProviderPosts([]);
      return;
    }

    setLoadingPosts(true);
    // Provider ID can be u_UID or just UID depending on how it was created
    const q = query(
      collection(db, 'posts'),
      where('providerId', 'in', [selectedProvider.id, selectedProvider.id.replace('u_', '')])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setProviderPosts(docs);
      setLoadingPosts(false);
    });

    return () => unsubscribe();
  }, [selectedProvider]);

  const handleBook = async (post?: Post) => {
    if (!user || !selectedProvider) return;
    
    // For services, we might need a default fee if it's a general request,
    // or the item price if a post is selected.
    const price = post ? Number(post.price) : 0; // If general, maybe 0 for now or handled later

    setBookingStatus('booking');
    try {
      if (price > 0) {
        // Check Wallet Balance
        const walletRef = doc(db, 'wallets', user.uid);
        const walletSnap = await getDoc(walletRef);
        const balance = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;

        if (balance < price) {
          alert('আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। দয়া করে টাকা যোগ করুন।');
          setBookingStatus('idle');
          return;
        }

        // Deduct & Record Transaction
        await updateDoc(walletRef, {
          balance: increment(-price),
          updatedAt: new Date().toISOString()
        });

        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          amount: price,
          type: 'payment',
          status: 'success',
          targetName: selectedProvider.name,
          details: post ? `Interested in: ${post.title}` : 'General inquiry',
          createdAt: new Date().toISOString()
        });
      }

      await addDoc(collection(db, 'serviceRequests'), {
        userId: user.uid,
        userName: user.displayName || user.email,
        providerId: selectedProvider.id,
        providerName: selectedProvider.name,
        providerType: type,
        status: 'pending',
        price: price, // Added price field
        createdAt: new Date().toISOString(),
        details: post ? `Interested in: ${post.title}` : 'General inquiry'
      });

      setBookingStatus('success');
      setTimeout(() => {
        setBookingStatus('idle');
      }, 2000);
    } catch (error) {
      console.error("Booking error:", error);
      alert("Something went wrong. Please try again.");
      setBookingStatus('idle');
    }
  };

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
            placeholder={`সার্চ করুন...`}
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

              <button 
                onClick={() => setSelectedProvider(provider)}
                className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                দেখুন
                <ExternalLink size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Provider Details Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <MapPin size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedProvider.name}</h2>
                  <p className="text-slate-500 text-sm">{selectedProvider.location}</p>
                </div>
              </div>
              <button onClick={() => setSelectedProvider(null)} className="p-2 hover:bg-white rounded-xl transition-colors">
                <XCircle size={32} className="text-slate-300 hover:text-red-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4">উপলব্ধ সেবা ও পণ্যসমূহ</h3>
                {loadingPosts ? (
                  <div className="text-center py-12 text-slate-400">সেবা লোড হচ্ছে...</div>
                ) : providerPosts.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400">
                    এই প্রোভাইডার এখনো কোনো পোস্ট বা পণ্য তালিকাভুক্ত করেনি।
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {providerPosts.map((post) => (
                      <div key={post.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 hover:shadow-lg transition-all">
                        {post.image && (
                          <img src={post.image} alt={post.title} className="w-24 h-24 object-cover rounded-2xl flex-shrink-0" />
                        )}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900">{post.title}</h4>
                            <p className="text-slate-500 text-xs line-clamp-2 mb-2">{post.description}</p>
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            {post.price && (
                              <span className="text-emerald-600 font-bold text-sm">৳{post.price}</span>
                            )}
                            <button 
                              onClick={() => handleBook(post)}
                              className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                            >
                              আগ্রহী
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 p-8 rounded-[32px] border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold text-emerald-900 mb-1">অন্য কিছু প্রয়োজন?</h3>
                  <p className="text-emerald-700/70 text-sm">সরাসরি প্রোভাইডারের সাথে যোগাযোগ করুন অথবা একটি সাধারণ অনুরোধ পাঠান।</p>
                </div>
                <div className="flex gap-3">
                  <a 
                    href={`tel:${selectedProvider.contact}`}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-all shadow-sm"
                  >
                    <Phone size={18} />
                    কল করুন
                  </a>
                  <button 
                    onClick={() => handleBook()}
                    disabled={bookingStatus !== 'idle'}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {bookingStatus === 'booking' ? 'পাঠানো হচ্ছে...' : bookingStatus === 'success' ? 'অনুরোধ পাঠানো হয়েছে!' : 'অনুরোধ পাঠান'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

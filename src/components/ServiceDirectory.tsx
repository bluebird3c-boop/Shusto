import React, { useEffect, useState } from 'react';
import { Search, MapPin, Phone, ExternalLink, Clock, CheckCircle, Tag, XCircle, Navigation, ChevronDown, Activity, X, Truck, Filter } from 'lucide-react';
import { collection, onSnapshot, query, addDoc, where, doc, getDoc, updateDoc, increment, runTransaction, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';
import { AMBULANCE_ROUTES } from '../constants';
import { BANGLADESH_LOCATIONS } from '../constants/locations';

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
  const [activeView, setActiveView] = useState<'centers' | 'services'>('services');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [globalServices, setGlobalServices] = useState<any[]>([]);
  const [allProviderPosts, setAllProviderPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [selectedGlobalService, setSelectedGlobalService] = useState<any | null>(null);
  const [providerPosts, setProviderPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success'>('idle');

  // Ambulance specific state
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [showAmbulanceForm, setShowAmbulanceForm] = useState(false);
  const [ambulancePrice, setAmbulancePrice] = useState(0);

  useEffect(() => {
    // Calculate genuine price for ambulance
    if (type === 'ambulance' && pickupLocation && destinationLocation) {
      const route = AMBULANCE_ROUTES.find(r => 
        (r.from.toLowerCase().includes(pickupLocation.toLowerCase()) && r.to.toLowerCase().includes(destinationLocation.toLowerCase())) ||
        (r.from.toLowerCase().includes(destinationLocation.toLowerCase()) && r.to.toLowerCase().includes(pickupLocation.toLowerCase()))
      );
      setAmbulancePrice(route ? route.price : 2000); // Default/Base price
    } else if (type === 'ambulance') {
      setAmbulancePrice(0);
    }
  }, [type, pickupLocation, destinationLocation]);

  useEffect(() => {
    // For all types, we now prioritize services over centers
    setActiveView('services');

    const collectionName = type === 'pharmacy' ? 'pharmacies' : 
                         type === 'lab' ? 'labs' : 
                         type === 'physio' ? 'physios' : 
                         type === 'hospital' ? 'hospitals' : 'ambulances';
    
    // Still fetch providers for context/mapping if needed, but primary view is services
    const qProviders = query(collection(db, collectionName));
    const unsubProviders = onSnapshot(qProviders, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceProvider[];
      setProviders(docs);
    });

    // Fetch All Posts for Pharmacy and Hospital (to show all products directly)
    let unsubPosts = () => {};
    if (type === 'pharmacy' || type === 'hospital') {
      const qPosts = query(
        collection(db, 'posts'),
        where('providerType', '==', type)
      );
      unsubPosts = onSnapshot(qPosts, (snapshot) => {
        setAllProviderPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
        setLoading(false);
      });
    }

    // Fetch Global Services if Lab or Physio
    let unsubGlobal = () => {};
    if (type === 'lab' || type === 'physio') {
      const globalColl = type === 'lab' ? 'labTests' : 'physioServices';
      const qGlobal = query(collection(db, globalColl));
      unsubGlobal = onSnapshot(qGlobal, (snapshot) => {
        setGlobalServices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    }

    // Ambulance loading state
    if (type === 'ambulance') {
      setLoading(false);
    }

    return () => {
      unsubProviders();
      unsubPosts();
      unsubGlobal();
    };
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

  const handleBook = async (post?: Post | any) => {
    // If it's a global service, it won't have a provider yet
    if (!user) return;
    if (!post && !selectedProvider) return;
    
    // For services, we might need a default fee if it's a general request,
    // or the item price if a post is selected.
    // improved price extraction: find first number in string
    let price = 0;
    let details = post ? `Interested in: ${post.title || post.name}` : 'General inquiry';
    let targetProviderId = selectedProvider?.id || null;
    let targetProviderName = selectedProvider?.name || 'Any Center';

    if (type === 'ambulance' && pickupLocation && destinationLocation) {
      price = ambulancePrice;
      details = `Ambulance service requested from ${pickupLocation} to ${destinationLocation}. Genuine Price: ৳${ambulancePrice}`;
    } else {
      const priceRaw = String(post?.price || "");
      const priceMatch = priceRaw.match(/\d+/);
      price = priceMatch ? Number(priceMatch[0]) : 0;
    }

    setBookingStatus('booking');
    try {
      if (price > 0) {
        await runTransaction(db, async (transaction) => {
          const walletRef = doc(db, 'wallets', user.uid);
          const walletSnap = await transaction.get(walletRef);
          const balance = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;

          if (balance < price) {
            throw new Error('insufficient_balance');
          }

          // 1. Create Request
          const requestRef = doc(collection(db, 'serviceRequests'));
          transaction.set(requestRef, {
            userId: user.uid,
            userName: user.displayName || user.email,
            userLocation: (user as any).location || 'Unknown',
            providerId: targetProviderId,
            providerName: targetProviderName,
            providerType: type,
            status: 'pending',
            price: price,
            createdAt: new Date().toISOString(),
            details: details,
            pickup: pickupLocation || null,
            destination: destinationLocation || null
          });

          // 2. Deduct & Record Transaction
          transaction.update(walletRef, {
            balance: increment(-price),
            updatedAt: new Date().toISOString()
          });

          const txRef = doc(collection(db, 'transactions'));
          transaction.set(txRef, {
            userId: user.uid,
            amount: price,
            type: 'payment',
            status: 'success',
            targetId: requestRef.id,
            targetName: targetProviderName,
            details: details,
            createdAt: new Date().toISOString()
          });
        });
      } else {
        await addDoc(collection(db, 'serviceRequests'), {
          userId: user.uid,
          userName: user.displayName || user.email,
          userLocation: (user as any).location || 'Unknown',
          providerId: targetProviderId,
          providerName: targetProviderName,
          providerType: type,
          status: 'pending',
          price: price, // Added price field
          createdAt: new Date().toISOString(),
          details: details,
          pickup: pickupLocation || null,
          destination: destinationLocation || null
        });
      }

      setBookingStatus('success');
      setTimeout(() => {
        setBookingStatus('idle');
        setSelectedGlobalService(null);
      }, 2000);
    } catch (error: any) {
      console.error("Booking error:", error);
      if (error.message === 'insufficient_balance') {
        alert('আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। দয়া করে টাকা যোগ করুন।');
      } else {
        alert("বুকিং করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
      setBookingStatus('idle');
    }
  };

  const [detectingLocation, setDetectingLocation] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("আপনার ব্রাউজার জিওলোকেশন সাপোর্ট করে না।");
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use Nominatim for free reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
          );
          const data = await response.json();
          
          let locationString = "";
          if (data.address) {
            const addr = data.address;
            locationString = addr.city || addr.town || addr.village || addr.suburb || addr.state || "Unknown Location";
          } else {
            locationString = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          }
          
          if (user) {
            await updateDoc(doc(db, 'users', user.uid), {
              location: locationString,
              lat: latitude,
              lng: longitude,
              address: data.display_name || '',
              updatedAt: new Date().toISOString()
            });
            alert(`আপনার এলাকা সেট করা হয়েছে: ${locationString}`);
            window.location.reload(); // Reload to refresh user context
          }
        } catch (error) {
          console.error("Error saving location:", error);
          alert("লোকেশন সেভ করতে সমস্যা হয়েছে।");
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        setDetectingLocation(false);
        console.error("Geolocation error:", error);
        alert("লোকেশন অ্যাক্সেস করা সম্ভব হয়নি। দয়া করে পারমিশন চেক করুন।");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const filteredProviders = providers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDivision = !selectedDivision || (p as any).division === selectedDivision;
    const matchesDistrict = !selectedDistrict || (p as any).district === selectedDistrict;
    return matchesSearch && matchesDivision && matchesDistrict;
  });

  const filteredGlobalServices = globalServices.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllPosts = allProviderPosts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.providerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const provider = providers.find(prov => prov.id === p.providerId || prov.id === `u_${p.providerId}`);
    const matchesDivision = !selectedDivision || (provider as any)?.division === selectedDivision;
    const matchesDistrict = !selectedDistrict || (provider as any)?.district === selectedDistrict;
    return matchesSearch && matchesDivision && matchesDistrict;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setSelectedDistrict('');
              }}
              className="text-xs font-bold text-slate-600 focus:outline-none bg-transparent"
            >
              <option value="">সকল বিভাগ</option>
              {BANGLADESH_LOCATIONS.map(l => (
                <option key={l.division} value={l.division}>{l.division}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedDivision}
              className="text-xs font-bold text-slate-600 focus:outline-none bg-transparent disabled:opacity-50"
            >
              <option value="">সকল জেলা</option>
              {selectedDivision && BANGLADESH_LOCATIONS.find(l => l.division === selectedDivision)?.districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {activeView !== 'ambulance_form' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={`সার্চ করুন...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full md:w-64 font-sans"
              />
            </div>
          )}
        </div>
      </div>

      {user && !(user as any).location && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[32px] flex flex-col md:flex-row items-center gap-6 text-amber-800 animate-in fade-in slide-in-from-top-2">
           <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0">
             <MapPin size={24} />
           </div>
           <div className="flex-1 text-center md:text-left">
             <p className="font-bold mb-1">এলাকা (Area) সেট করা নেই</p>
             <p className="text-sm opacity-80">
               আপনার প্রোফাইল থেকে এলাকা সেট করুন যাতে আপনার নিকটবর্তী প্রোভাইডাররা সার্ভিস অনুরোধটি দ্রুত দেখতে পায়।
             </p>
           </div>
           <button 
             onClick={detectLocation}
             disabled={detectingLocation}
             className="px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
           >
             {detectingLocation ? (
               <>লোডিং...</>
             ) : (
               <>
                 <Navigation size={18} />
                 লোকেশন ডিটেক্ট করুন
               </>
             )}
           </button>
        </div>
      )}

      {/* Ambulance Direct Booking View */}
      {type === 'ambulance' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900 rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
                  <Navigation size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">অ্যাম্বুলেন্স বুক করুন</h3>
                  <p className="text-slate-400">সরাসরি লোকেশন সিলেক্ট করে জেনুইন প্রাইসে অ্যাম্বুলেন্স দ্রুত ডাকুন।</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">পিকআপ পয়েন্ট</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={20} />
                    <select 
                      value={pickupLocation} 
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="w-full pl-12 pr-4 py-5 bg-white/10 border border-white/10 rounded-3xl focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none font-bold text-lg"
                    >
                      <option value="" className="text-slate-900">পিকআপ সিলেক্ট করুন</option>
                      {Array.from(new Set(AMBULANCE_ROUTES.flatMap(r => [r.from, r.to]))).map(loc => (
                        <option key={loc} value={loc} className="text-slate-900">{loc}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">গন্তব্যস্থল</label>
                  <div className="relative">
                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400" size={20} />
                    <select 
                      value={destinationLocation} 
                      onChange={(e) => setDestinationLocation(e.target.value)}
                      className="w-full pl-12 pr-4 py-5 bg-white/10 border border-white/10 rounded-3xl focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none font-bold text-lg"
                    >
                      <option value="" className="text-slate-900">গন্তব্য সিলেক্ট করুন</option>
                      {Array.from(new Set(AMBULANCE_ROUTES.flatMap(r => [r.from, r.to]))).map(loc => (
                        <option key={loc} value={loc} className="text-slate-900">{loc}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                  </div>
                </div>
              </div>

              {ambulancePrice > 0 && (
                <div className="bg-emerald-500/20 border border-emerald-500/30 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-8">
                  <div>
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Genuine Price (Shusto Identity)</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black">৳{ambulancePrice}</span>
                      <span className="text-slate-400 text-sm">/ নির্ধারিত প্রাইস</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleBook()}
                    disabled={bookingStatus !== 'idle'}
                    className="w-full md:w-auto px-12 py-5 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-500/40 disabled:opacity-50 text-xl"
                  >
                    {bookingStatus === 'booking' ? 'লোডিং...' : bookingStatus === 'success' ? 'সফল হয়েছে!' : 'বুকিং কনফার্ম করুন'}
                  </button>
                </div>
              )}
            </div>
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Truck size={300} />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading...</div>
      ) : activeView === 'services' && (type === 'lab' || type === 'physio') ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGlobalServices.map((service) => (
              <div 
                key={service.id} 
                className="bg-white p-6 rounded-[32px] border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <CheckCircle size={24} />
                  </div>
                  <p className="text-emerald-600 font-black text-[10px] uppercase tracking-tighter mb-1">{service.category || type}</p>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{service.name}</h3>
                </div>

                <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="text-right flex-1">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter mb-1">Genuine Price</p>
                    <p className="text-xl font-black text-slate-900 mb-1">৳{service.price}</p>
                    <button 
                      onClick={() => setSelectedGlobalService(service)}
                      className="w-full mt-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      বুক করুন
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeView === 'services' && (type === 'pharmacy' || type === 'hospital') ? (
        <div className="space-y-6">
          {filteredAllPosts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
              এখনো কোনো সেবা বা পণ্য পাওয়া যায়নি।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredAllPosts.map((post) => (
                <div key={post.id} className="bg-white p-5 rounded-[32px] border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col justify-between">
                  <div className="space-y-4">
                    {post.image && (
                      <img src={post.image} alt={post.title} className="w-full h-40 object-cover rounded-2xl mb-2" />
                    )}
                    <div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full mb-2 inline-block">
                        {post.providerName || 'Shusto Verified'}
                      </span>
                      <h3 className="font-bold text-slate-900 line-clamp-1 mb-1">{post.title}</h3>
                      <p className="text-slate-500 text-xs line-clamp-2">{post.description}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Shusto Price</p>
                      <p className="text-lg font-black text-slate-900">৳{post.price}</p>
                    </div>
                    <button 
                      onClick={() => {
                        const originalProvider = providers.find(p => p.id === post.providerId || p.id === `u_${post.providerId}`);
                        if (originalProvider) setSelectedProvider(originalProvider);
                        handleBook(post);
                      }}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 transition-all shadow-lg"
                    >
                      কিনুন
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Global Service Booking Modal */}
      {selectedGlobalService && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-slate-100">
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">সার্ভিস বুকিং</h2>
                <button onClick={() => setSelectedGlobalService(null)} className="p-2 hover:bg-slate-50 rounded-xl">
                  <X size={24} className="text-slate-400" />
                </button>
             </div>

             <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-slate-100">
                <p className="text-emerald-600 font-black text-[10px] uppercase tracking-tighter mb-1">{selectedGlobalService.category}</p>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{selectedGlobalService.name}</h3>
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="text-slate-500 font-medium font-sans">Total Price</span>
                  <span className="text-3xl font-black text-emerald-600">৳{selectedGlobalService.price}</span>
                </div>
             </div>

             <button 
               onClick={() => handleBook(selectedGlobalService)}
               disabled={bookingStatus !== 'idle'}
               className="w-full py-5 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-2xl shadow-emerald-500/40 transition-all disabled:opacity-50"
             >
               {bookingStatus === 'booking' ? 'প্রসেসিং হচ্ছে...' : bookingStatus === 'success' ? 'বুকিং সফল হয়েছে!' : 'বুকিং কনফার্ম করুন'}
             </button>
          </div>
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
              {type === 'ambulance' ? (
                <div className="mb-8">
                   <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden mb-8">
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                          <Navigation size={24} className="text-emerald-400" />
                          লোকেশন সেট করুন
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">পিকআপ পয়েন্ট</label>
                            <div className="relative">
                              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
                              <select 
                                value={pickupLocation} 
                                onChange={(e) => setPickupLocation(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/10 rounded-2xl focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none font-bold"
                              >
                                <option value="" className="text-slate-900">পিকআপ সিলেক্ট করুন</option>
                                {Array.from(new Set(AMBULANCE_ROUTES.flatMap(r => [r.from, r.to]))).map(loc => (
                                  <option key={loc} value={loc} className="text-slate-900">{loc}</option>
                                ))}
                                <option value="Other" className="text-slate-900">অন্যান্য</option>
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">গন্তব্যস্থল</label>
                            <div className="relative">
                              <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400" size={18} />
                              <select 
                                value={destinationLocation} 
                                onChange={(e) => setDestinationLocation(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/10 rounded-2xl focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none font-bold"
                              >
                                <option value="" className="text-slate-900">গন্তব্য সিলেক্ট করুন</option>
                                {Array.from(new Set(AMBULANCE_ROUTES.flatMap(r => [r.from, r.to]))).map(loc => (
                                  <option key={loc} value={loc} className="text-slate-900">{loc}</option>
                                ))}
                                <option value="Other" className="text-slate-900">অন্যান্য</option>
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                            </div>
                          </div>
                        </div>

                        {ambulancePrice > 0 && (
                          <div className="bg-emerald-500/20 border border-emerald-500/30 p-6 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
                            <div>
                              <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Genuine Price (Shusto Identity)</p>
                              <p className="text-3xl font-black">৳{ambulancePrice}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-white/60 mb-2 font-medium">নিশ্চিত প্রাইস, কোন লুকানো খরচ নেই</p>
                              <button 
                                onClick={() => handleBook()}
                                disabled={bookingStatus !== 'idle'}
                                className="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-emerald-50 transition-all shadow-xl disabled:opacity-50"
                              >
                                {bookingStatus === 'booking' ? 'লোডিং...' : bookingStatus === 'success' ? 'সফল!' : 'বুক করুন'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Navigation size={150} />
                      </div>
                   </div>
                </div>
              ) : (
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
              )}

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

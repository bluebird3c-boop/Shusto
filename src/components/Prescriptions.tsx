import React, { useEffect, useState, useRef } from 'react';
import { FileText, Download, Calendar, XCircle, User, Phone, MapPin, Activity, CheckCircle2 } from 'lucide-react';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { downloadElementAsPDF } from '../lib/pdfUtils';
import { cn } from '../lib/utils';

interface Prescription {
  id: string;
  userId: string;
  userName?: string;
  doctorName: string;
  doctorId: string;
  specialty: string;
  date: string;
  status: string;
  items?: { medicine: string; dosage: string; duration: string }[];
  pdfUrl?: string;
}

export function Prescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'prescriptions'),
      or(
        where('userId', '==', user.uid),
        where('doctorId', '==', user.uid)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Prescription[];
      setPrescriptions(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    }, (error) => {
      console.error("Prescriptions fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDownloadPDF = async (pres: Prescription) => {
    setDownloadingId(pres.id);
    setSelectedPrescription(pres);
    // Wait for modal to render completely
    setTimeout(async () => {
      try {
        await downloadElementAsPDF('prescription-paper', `prescription-${pres.id}.pdf`);
      } catch (err) {
        console.error("PDF download error:", err);
        alert("Download failed. Opening Print dialog instead...");
        window.print();
      } finally {
        setDownloadingId(null);
      }
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto px-4 md:px-0 mb-20 mt-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">আপনার প্রেসক্রিপশন</h1>
          <p className="text-slate-500 font-medium">যেকোনো সময়, যেকোনো জায়গা থেকে আপনার ডিজিটাল প্রেসক্রিপশন দেখুন।</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
          <Activity size={18} className="text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">সর্বমোট প্রেসক্রিপশন: {prescriptions.length}</span>
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[40px] border border-slate-100 shadow-sm">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-bold animate-pulse">লোড হচ্ছে...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">কোনো প্রেসক্রিপশন নেই</h3>
            <p className="text-slate-400">আপনার এখন পর্যন্ত কোনো ডিজিটাল প্রেসক্রিপশন তৈরি করা হয়নি।</p>
          </div>
        ) : (
          prescriptions.map((pres) => (
            <div
              key={pres.id}
              className="group bg-white p-2 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="p-6 md:flex items-center justify-between gap-6">
                <div className="flex items-center gap-6 mb-4 md:mb-0">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                      {user?.uid === pres.doctorId ? pres.userName || 'Unknown Patient' : pres.doctorName}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Calendar size={14} className="text-slate-400" />
                      <span className="font-medium">{new Date(pres.date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span className="mx-1">•</span>
                      <span className="font-bold text-emerald-600">{pres.items?.length || 0}টি ঔষধ</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedPrescription(pres)}
                    className="flex-1 md:flex-none px-6 py-3 bg-slate-50 text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all border border-slate-100"
                  >
                    বিস্তারিত
                  </button>
                  <button 
                    onClick={() => handleDownloadPDF(pres)}
                    disabled={downloadingId === pres.id}
                    className={cn(
                      "p-3 rounded-2xl transition-all flex items-center justify-center",
                      downloadingId === pres.id 
                        ? "bg-slate-100 text-slate-400" 
                        : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
                    )}
                  >
                    {downloadingId === pres.id ? (
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download size={22} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Prescription View Modal / PDF Template */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto pt-20 pb-20">
          <div className="w-full max-w-3xl relative">
            {/* Close Button UI */}
            <div className="flex justify-end mb-4 gap-3 no-print">
               <button 
                onClick={handlePrint}
                className="bg-white/10 text-white p-3 rounded-2xl hover:bg-white/20 transition-all border border-white/20 backdrop-blur-lg flex items-center gap-2"
                title="Print Prescription"
              >
                <Activity size={20} />
                <span className="font-bold text-sm">প্রিন্ট</span>
              </button>
               <button 
                onClick={() => handleDownloadPDF(selectedPrescription)}
                className="bg-white/10 text-white p-3 rounded-2xl hover:bg-white/20 transition-all border border-white/20 backdrop-blur-lg flex items-center gap-2"
                title="Download as PDF"
              >
                <Download size={20} />
                <span className="font-bold text-sm">ডাউনলোড</span>
              </button>
              <button 
                onClick={() => setSelectedPrescription(null)}
                className="bg-white/10 text-white p-3 rounded-2xl hover:bg-white/20 transition-all border border-white/20 backdrop-blur-lg"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* The Actual "Paper" Prescription */}
            <div 
              id="prescription-paper"
              className="bg-white rounded-none shadow-2xl overflow-hidden min-h-[1000px] border-[16px] border-emerald-500/5"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {/* Header */}
              <div className="bg-slate-900 p-10 text-white flex justify-between items-start">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter mb-1">{selectedPrescription.doctorName}</h2>
                    <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs">{selectedPrescription.specialty}</p>
                  </div>
                  <div className="space-y-1 opacity-70">
                    <p className="text-sm flex items-center gap-2 font-medium">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      BMDC Reg No: {Math.floor(Math.random() * 90000) + 10000}
                    </p>
                    <p className="text-sm flex items-center gap-2 font-medium">
                      <MapPin size={14} className="text-emerald-400" />
                      Shusto Digital Care Center
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block p-4 bg-emerald-500 rounded-3xl mb-4">
                    <span className="text-4xl font-black">Shusto</span>
                  </div>
                  <p className="text-xxs font-mono opacity-50 uppercase tracking-[0.2em]">HEALTHCARE SYSTEM</p>
                </div>
              </div>

              {/* Patient Info Bar */}
              <div className="bg-slate-50 border-y border-slate-100 px-10 py-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Patient Name</p>
                  <p className="font-bold text-slate-800">{selectedPrescription.userName || 'Member'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Date</p>
                  <p className="font-bold text-slate-800">{new Date(selectedPrescription.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Prescription ID</p>
                  <p className="font-mono text-xs font-bold text-slate-800 uppercase">#{selectedPrescription.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Status</p>
                  <p className="text-emerald-600 font-black text-xs uppercase tracking-widest">{selectedPrescription.status}</p>
                </div>
              </div>

              {/* RX Body */}
              <div className="p-10">
                <div className="mb-8">
                   <div className="relative inline-block mb-8">
                    <span className="text-6xl font-serif italic text-slate-200 absolute -top-4 -left-2 select-none">Rx</span>
                    <h3 className="text-2xl font-black text-slate-800 pl-8 relative z-10">প্রেসক্রিপশন / Prescription</h3>
                   </div>
                </div>

                <div className="space-y-0 border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 bg-slate-900 text-[10px] text-white font-black uppercase tracking-widest p-4">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Medicine / ঔষধ</div>
                    <div className="col-span-3 text-center">Dosage / ডোজ</div>
                    <div className="col-span-3 text-right">Duration / দিন</div>
                  </div>
                  
                  {selectedPrescription.items?.map((item, idx) => (
                    <div key={idx} className={cn(
                      "grid grid-cols-12 p-6 items-center text-sm",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    )}>
                      <div className="col-span-1 text-slate-300 font-mono font-bold">{idx + 1}</div>
                      <div className="col-span-5">
                        <p className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">{item.medicine}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium italic">General medicine guidelines apply</p>
                      </div>
                      <div className="col-span-3 text-center">
                        <span className="px-4 py-2 bg-emerald-50 text-emerald-700 font-black rounded-xl border border-emerald-100">
                          {item.dosage}
                        </span>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="font-bold text-slate-600">{item.duration} দিন</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes Section Helper */}
                <div className="mt-12 p-8 border-2 border-dashed border-slate-100 rounded-3xl">
                   <h4 className="text-xs uppercase font-black text-slate-400 mb-4 tracking-widest tracking-widest">Doctor's Advise / ডাক্তারের পরামর্শ</h4>
                   <p className="text-slate-600 text-sm leading-relaxed font-medium">
                     ১. পরিষ্কার পানি পান করুন ও পর্যাপ্ত বিশ্রাম নিন। <br/>
                     ২. ঔষধ সেবনে সমস্যা হলে ডাক্তারের সাথে যোগাযোগ করুন। <br/>
                     ৩. কোনো পার্শ্বপ্রতিক্রিয়া দেখা দিলে ঔষধ বন্ধ করুন।
                   </p>
                </div>
              </div>

              {/* Footer / Signature Area */}
              <div className="mt-auto px-10 pb-12 pt-20">
                <div className="flex justify-between items-end border-t border-slate-100 pt-12">
                   <div>
                     <p className="text-[8px] uppercase font-black text-slate-300 tracking-[0.3em] mb-4">Verification QR</p>
                     <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-slate-300 rounded-2xl">
                       <p className="text-[10px] text-center font-mono">Digital<br/>Seal</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <div className="w-48 h-px bg-slate-300 ml-auto mb-2" />
                     <p className="text-sm font-black text-slate-900">{selectedPrescription.doctorName}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedPrescription.specialty}</p>
                     <p className="text-[8px] text-slate-300 font-mono mt-1 italic tracking-tight">Digitally Signed & Verified via Shusto</p>
                   </div>
                </div>
                
                <div className="mt-12 text-center">
                  <p className="text-[9px] text-slate-300 font-medium uppercase tracking-[0.2em]">
                    This is a computer generated digital prescription. No physical signature is required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { ArrowLeft, Shield, Youtube, Instagram, Facebook } from 'lucide-react';
import { cn } from '../lib/utils';

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  const socialLinks = [
    { name: 'Youtube', icon: Youtube, url: 'https://youtube.com/@ShustoBd', color: 'text-red-600' },
    { name: 'Instagram', icon: Instagram, url: 'https://instagram.com/ShustoBd', color: 'text-pink-600' },
    { name: 'Facebook', icon: Facebook, url: 'https://facebook.com/ShustoBd', color: 'text-blue-600' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 bg-white rounded-[40px] shadow-sm border border-slate-100">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 font-medium"
      >
        <ArrowLeft size={20} />
        অ্যাপে ফিরে যান
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
          <Shield size={24} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">গোপনীয়তা নীতি (Privacy Policy)</h1>
      </div>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-600">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">১. ভূমিকা</h2>
          <p>সুস্থ (Shusto) অ্যাপে আপনাকে স্বাগতম। আমরা আপনার ব্যক্তিগত তথ্য এবং আপনার গোপনীয়তার অধিকার রক্ষা করতে প্রতিশ্রুতিবদ্ধ। আমাদের নীতি বা আপনার ব্যক্তিগত তথ্য সংক্রান্ত আমাদের কার্যক্রম সম্পর্কে আপনার যদি কোনো প্রশ্ন বা উদ্বেগ থাকে, তবে অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">২. আমরা যে তথ্য সংগ্রহ করি</h2>
          <p>আপনি যখন আমাদের অ্যাপে নিবন্ধন করেন বা আমাদের পণ্য ও পরিষেবা সম্পর্কে আগ্রহ প্রকাশ করেন, তখন আপনি স্বেচ্ছায় আমাদের যে তথ্যগুলো প্রদান করেন আমরা তা সংগ্রহ করি।</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>নাম এবং যোগাযোগের তথ্য (ইমেইল, ঠিকানা)</li>
            <li>প্রমাণপত্র (পাসওয়ার্ড এবং নিরাপত্তার জন্য প্রয়োজনীয় তথ্য)</li>
            <li>চিকিৎসা সংক্রান্ত তথ্য (প্রেসক্রিপশন, অ্যাপয়েন্টমেন্টের ইতিহাস)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">৩. আমরা কীভাবে আপনার তথ্য ব্যবহার করি</h2>
          <p>আমরা আমাদের অ্যাপের মাধ্যমে সংগৃহীত ব্যক্তিগত তথ্য বিভিন্ন ব্যবসায়িক উদ্দেশ্যে ব্যবহার করি, যা নিচে বর্ণনা করা হলো:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>অ্যাকাউন্ট তৈরি এবং লগইন প্রক্রিয়া সহজতর করতে।</li>
            <li>আপনাকে প্রশাসনিক তথ্য পাঠাতে।</li>
            <li>আপনার অ্যাপয়েন্টমেন্ট এবং অর্ডারগুলো পরিচালনা করতে।</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">৪. ডাটা নিরাপত্তা</h2>
          <p>আপনার ব্যক্তিগত তথ্য সুরক্ষিত রাখতে আমরা প্রশাসনিক, প্রযুক্তিগত এবং শারীরিক নিরাপত্তা ব্যবস্থা ব্যবহার করি। যদিও আমরা আপনার প্রদান করা তথ্য সুরক্ষিত রাখতে যথাযথ পদক্ষেপ নিয়েছি, তবুও মনে রাখবেন যে কোনো নিরাপত্তাই ১০০% অভেদ্য নয়।</p>
        </section>

        <section className="pt-8 border-t border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6">আমাদের সোশ্যাল মিডিয়া</h2>
          <div className="flex flex-wrap gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all border border-transparent hover:border-slate-100 group"
              >
                <social.icon size={20} className={cn("transition-colors", social.color)} />
                <span className="font-bold text-slate-700 group-hover:text-slate-900">@ShustoBd</span>
              </a>
            ))}
          </div>
        </section>

        <p className="text-sm text-slate-400 pt-8">সর্বশেষ আপডেট: ১৫ এপ্রিল, ২০২৬</p>
      </div>
    </div>
  );
}

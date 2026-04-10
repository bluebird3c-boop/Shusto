import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 bg-white rounded-[40px] shadow-sm border border-slate-100">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8"
      >
        <ArrowLeft size={20} />
        Back to App
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
          <Shield size={24} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
      </div>

      <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-2">1. Introduction</h2>
          <p>Welcome to Shusto. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-2">2. Information We Collect</h2>
          <p>We collect personal information that you voluntarily provide to us when registering at the App, expressing an interest in obtaining information about us or our products and services, or otherwise contacting us.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Name and Contact Data (Email, Address)</li>
            <li>Credentials (Passwords, security information used for authentication)</li>
            <li>Medical Data (Prescriptions, appointment history)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-2">3. How We Use Your Information</h2>
          <p>We use personal information collected via our App for a variety of business purposes described below:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To facilitate account creation and logon process.</li>
            <li>To send administrative information to you.</li>
            <li>To fulfill and manage your appointments and orders.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-2">4. Data Security</h2>
          <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.</p>
        </section>

        <p className="text-sm text-slate-400 pt-8">Last updated: April 10, 2026</p>
      </div>
    </div>
  );
}

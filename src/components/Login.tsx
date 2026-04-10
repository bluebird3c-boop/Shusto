import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { LogIn, HeartPulse } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setError(null);
      await login();
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to login. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div 
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl mb-6">
          <HeartPulse size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Shusto</h1>
        <p className="text-slate-500 mb-8">Your complete telehealth companion. Login to access doctors, medicines, and more.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 text-sm font-medium rounded-2xl border border-rose-100">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 px-6 rounded-2xl font-semibold hover:bg-slate-800 transition-colors"
        >
          <LogIn size={20} />
          Continue with Google
        </button>
        
        <p className="mt-8 text-xs text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

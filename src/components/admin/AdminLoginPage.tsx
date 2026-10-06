import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, ShieldCheck, AlertCircle, Key, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ShokhLogo } from '../ShokhLogo';

interface AdminLoginPageProps {
  onBackToStore: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onBackToStore, onLoginSuccess }) => {
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('sokhtshirt@gmail.com');
  const [password, setPassword] = useState('imtaslitimaz');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await loginAdmin(email, password, rememberMe);
      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMsg(res.error || 'Invalid credentials or login locked.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login attempt failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('sokhtshirt@gmail.com');
    setPassword('imtaslitimaz');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#0d2822] selection:text-white">
      {/* Back button */}
      <div className="absolute top-6 left-6">
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-black px-4 py-2 rounded-xl bg-white border border-neutral-200/80 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Storefront</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0d2822] border border-[#23584c] flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-[#34d399]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">
          Vizora Admin Portal
        </h2>
        <p className="mt-1 text-xs text-neutral-500 font-medium">
          Sign in to manage catalog, orders, customers &amp; wholesale operations
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Quick Credentials Info Box */}
        <div className="mb-4 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Key className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-emerald-900">Admin Login Credentials</span>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[11px] font-bold text-emerald-700 bg-white hover:bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Fill In
            </button>
          </div>

          <div className="mt-2.5 pt-2 border-t border-emerald-100 text-xs space-y-1">
            <div className="flex items-center justify-between text-neutral-600">
              <span>Email:</span>
              <code className="font-mono font-bold text-neutral-900 bg-white/70 px-1.5 py-0.5 rounded border border-emerald-100">
                sokhtshirt@gmail.com
              </code>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>Password:</span>
              <code className="font-mono font-bold text-neutral-900 bg-white/70 px-1.5 py-0.5 rounded border border-emerald-100">
                imtaslitimaz
              </code>
            </div>
          </div>
        </div>

        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-neutral-200/80 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-neutral-800 mb-1">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sokhtshirt@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#0d2822] font-semibold text-neutral-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#0d2822] font-semibold text-neutral-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-neutral-300 text-[#0d2822] focus:ring-0 cursor-pointer"
                />
                <span className="text-neutral-600 font-medium">Keep me signed in</span>
              </label>

              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Supabase Ready</span>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0d2822] hover:bg-[#123830] text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer mt-3"
            >
              {loading ? 'Authenticating Admin...' : 'LOGIN TO ADMIN PORTAL'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-neutral-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protected with cryptographic rate-limiting &amp; Supabase auth</span>
        </div>
      </div>
    </div>
  );
};

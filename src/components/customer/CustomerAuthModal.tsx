import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  RotateCcw,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { supabase, logSupabaseError } from '../../lib/supabaseClient';
import { metaPixel } from '../../services/metaPixel';

export const CustomerAuthModal: React.FC = () => {
  const {
    isCustomerAuthModalOpen,
    closeCustomerAuthModal,
    customerAuthModalDefaultTab,
    loginCustomer,
    registerCustomer,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'track'>(
    customerAuthModalDefaultTab || 'login'
  );

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regArea, setRegArea] = useState<'dhaka' | 'outside'>('dhaka');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  // Guest Track Order state
  const [trackOrderNumber, setTrackOrderNumber] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<any | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  if (!isCustomerAuthModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setResendStatus(null);
    setLoginLoading(true);
    try {
      const res = await loginCustomer(loginIdentifier, loginPassword);
      if (!res.success) {
        setLoginError(res.error || 'Invalid credentials.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccessMsg(null);
    setRegLoading(true);
    try {
      const res = await registerCustomer({
        fullName: regFullName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        address: regAddress,
        deliveryArea: regArea,
      });
      if (res.success) {
        metaPixel.trackCompleteRegistration({
          method: 'Customer Account Signup',
          status: true,
        });
        if (res.emailConfirmationRequired) {
          setRegSuccessMsg(
            'Account created successfully in Supabase! Please check your email inbox to confirm your account, then sign in.'
          );
        } else {
          closeCustomerAuthModal();
        }
      } else {
        setRegError(res.error || 'Registration failed.');
      }
    } finally {
      setRegLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!loginIdentifier || !loginIdentifier.includes('@')) {
      setResendStatus('Please enter a valid email address in the field above.');
      return;
    }
    setResendingEmail(true);
    setResendStatus(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: loginIdentifier.trim().toLowerCase(),
      });
      if (error) {
        logSupabaseError('resendConfirmation', error);
        setResendStatus(`Could not resend email: ${error.message}`);
      } else {
        setResendStatus('Confirmation email sent! Please check your inbox.');
      }
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to resend confirmation email.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTrackResult(null);
    setTrackLoading(true);
    try {
      const res = await api.storeTrackOrder(trackOrderNumber, trackPhone);
      if (res.success && res.order) {
        setTrackResult(res.order);
      } else {
        setTrackError(res.error || 'Order not found.');
      }
    } catch (err: any) {
      setTrackError(err.message || 'Unable to track order. Please check inputs.');
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh]">
        {/* Header Tabs */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-1 bg-neutral-200/70 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('login')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'login' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'register' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'
              }`}
            >
              Register
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'track' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'
              }`}
            >
              Track Order
            </button>
          </div>

          <button
            onClick={closeCustomerAuthModal}
            className="p-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">Welcome Back to Shokh Outfits</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Sign in to view your orders, live courier tracking and 1-click reordering
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                  {loginError.toLowerCase().includes('email not confirmed') && (
                    <div className="pt-2 border-t border-rose-200/60 flex flex-col gap-1.5">
                      <p className="text-[11px] text-neutral-600 font-normal">
                        Supabase requires email verification for this account. Check your inbox or click below to resend:
                      </p>
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendingEmail}
                        className="self-start px-3 py-1 bg-black text-white text-[11px] font-bold rounded-lg hover:bg-neutral-800 transition-all cursor-pointer"
                      >
                        {resendingEmail ? 'Sending...' : 'Resend Confirmation Email'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {resendStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{resendStatus}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. yourname@example.com"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer mt-2"
                >
                  {loginLoading ? 'Signing In...' : 'LOG IN'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">Create Customer Account</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Save your delivery addresses and track previous garments
                </p>
              </div>

              {regSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Account Created in Supabase!</p>
                    <p className="text-[11px] mt-0.5 text-neutral-700">{regSuccessMsg}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setLoginIdentifier(regEmail);
                      }}
                      className="mt-2 text-xs font-bold underline text-emerald-900 block"
                    >
                      Go to Sign In →
                    </button>
                  </div>
                </div>
              )}

              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Monir Hossain"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-800 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-800 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="01XXXXXXXXX"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Password (Min 6 chars) *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Delivery Address</label>
                  <input
                    type="text"
                    placeholder="House, Road, Area, City"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-700">
                    <input
                      type="radio"
                      name="area"
                      checked={regArea === 'dhaka'}
                      onChange={() => setRegArea('dhaka')}
                      className="text-black"
                    />
                    <span>Inside Dhaka (৳70)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-700">
                    <input
                      type="radio"
                      name="area"
                      checked={regArea === 'outside'}
                      onChange={() => setRegArea('outside')}
                      className="text-black"
                    />
                    <span>Outside Dhaka (৳130)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer mt-2"
                >
                  {regLoading ? 'Registering...' : 'CREATE ACCOUNT'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: GUEST ORDER TRACKING */}
          {activeTab === 'track' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">Track Any Order</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Guest or registered customers can track their parcel using Order ID &amp; Phone number
                </p>
              </div>

              {trackError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}

              <form onSubmit={handleTrackOrder} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-800 mb-1">Order ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CTG0291 or SHK-8912"
                      value={trackOrderNumber}
                      onChange={(e) => setTrackOrderNumber(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-800 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="01XXXXXXXXX"
                      value={trackPhone}
                      onChange={(e) => setTrackPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={trackLoading}
                  className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>{trackLoading ? 'Searching Parcel...' : 'TRACK ORDER'}</span>
                </button>
              </form>

              {/* Track Result Display */}
              {trackResult && (
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4 animate-in fade-in duration-200 mt-4">
                  <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
                    <div>
                      <p className="font-mono font-black text-sm text-neutral-900">
                        #{trackResult.orderNumber}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Placed on {new Date(trackResult.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800">
                      {trackResult.orderStatus}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="space-y-2 pt-1">
                    <p className="font-bold text-neutral-700 text-[11px]">Delivery Progress</p>
                    <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500">
                      <span>Confirmed</span>
                      <span>Processing</span>
                      <span>Shipped</span>
                      <span>Delivered</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-black transition-all duration-500"
                        style={{
                          width:
                            trackResult.orderStatus === 'delivered'
                              ? '100%'
                              : trackResult.orderStatus === 'shipped'
                              ? '75%'
                              : trackResult.orderStatus === 'processing'
                              ? '50%'
                              : '25%',
                        }}
                      />
                    </div>
                  </div>

                  {trackResult.trackingNumber && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-bold flex items-center justify-between">
                      <span>Courier Tracking #:</span>
                      <span className="font-mono">{trackResult.trackingNumber}</span>
                    </div>
                  )}

                  {/* Items */}
                  <div className="pt-2 border-t border-neutral-200/80 space-y-1">
                    <p className="font-bold text-neutral-700 text-[11px]">Items in Order:</p>
                    {trackResult.items?.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-neutral-800 text-[11px]">
                        <span>{it.quantity} × {it.productName} ({it.variant?.color}/{it.variant?.size})</span>
                        <span className="font-bold">৳{it.finalPrice}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-black text-neutral-900 pt-2 border-t border-neutral-200">
                      <span>Total:</span>
                      <span>৳{trackResult.total?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

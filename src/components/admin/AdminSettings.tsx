import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Truck,
  CreditCard,
  KeyRound,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Activity,
  Radio,
  Sparkles,
  Play,
  Key,
  Code2,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../../services/api';
import { supabase, isSupabaseConfigured, safeUrl } from '../../lib/supabaseClient';
import { metaPixel, validatePixelId } from '../../services/metaPixel';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Supabase test state
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ checked: boolean; success: boolean; message: string } | null>(null);

  // Meta Pixel test state
  const [pixelTesting, setPixelTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [pixelTestStatus, setPixelTestStatus] = useState<{ checked: boolean; success: boolean; message: string } | null>(null);

  const handleTestSupabase = async () => {
    setSupabaseTesting(true);
    setSupabaseStatus(null);
    try {
      if (!isSupabaseConfigured) {
        setSupabaseStatus({
          checked: true,
          success: false,
          message: 'Supabase URL or Publishable Key is missing from environment variables.',
        });
        return;
      }
      // Check auth / database ping
      const { data, error } = await supabase.from('product_categories').select('id').limit(1);
      if (error) {
        setSupabaseStatus({
          checked: true,
          success: false,
          message: `Connected to Supabase endpoint, but table query returned: ${error.message}. Please run supabase_schema.sql in your Supabase SQL Editor.`,
        });
      } else {
        setSupabaseStatus({
          checked: true,
          success: true,
          message: 'Successfully connected to Supabase project! Database tables and schemas are ready.',
        });
      }
    } catch (err: any) {
      setSupabaseStatus({
        checked: true,
        success: false,
        message: err.message || 'Connection test failed.',
      });
    } finally {
      setSupabaseTesting(false);
    }
  };

  const handleTestPixel = async () => {
    setPixelTesting(true);
    setPixelTestStatus(null);

    try {
      const isEnabled = settings?.metaPixelEnabled !== false;
      const pixelId = settings?.metaPixelId ? String(settings.metaPixelId).trim() : '';

      if (!isEnabled) {
        setPixelTestStatus({
          checked: true,
          success: false,
          message: '✕ Meta Pixel is currently disabled in Settings. Enable Meta Pixel and save to activate tracking.',
        });
        setPixelTesting(false);
        return;
      }

      const validation = validatePixelId(pixelId);
      if (!validation.valid) {
        setPixelTestStatus({
          checked: true,
          success: false,
          message: `✕ Invalid Pixel ID: ${validation.error}`,
        });
        setPixelTesting(false);
        return;
      }

      // Sync settings to runtime and dispatch test
      metaPixel.syncSettings({
        metaPixelEnabled: true,
        metaPixelId: pixelId,
        metaAccessToken: settings?.metaAccessToken,
        metaTestEventCode: settings?.metaTestEventCode,
        metaCapiEnabled: settings?.metaCapiEnabled !== false,
      });

      const res = await metaPixel.testPixelEvent();

      setPixelTestStatus({
        checked: true,
        success: res.success,
        message: res.message,
      });
    } catch (err: any) {
      setPixelTestStatus({
        checked: true,
        success: false,
        message: `✕ Error testing Meta Pixel: ${err.message || String(err)}`,
      });
    } finally {
      setPixelTesting(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.adminGetSettings();
        if (res.success && res.settings) {
          const loaded = {
            ...res.settings,
            metaPixelEnabled: res.settings.metaPixelEnabled !== false,
            metaPixelId: res.settings.metaPixelId || '4455123488042747',
            metaAccessToken: res.settings.metaAccessToken || 'EAAMVeXfzl2YBSoLiAA7eeVpxBdtISYLgCez7LzTOtZBhf5dzar54xQSLQeoHROun6Bvz8bS53gRZC5ZB1KoIV6TAKBChwtBdMueEicCndm8faUolnbJpE9wSs2pzAhC3R1vmWDii88dlZCV3HMTEhAXXVCijsi2SzoVC3XDIrpU4fztGiA1rO9xaqxyafQZDZD',
            metaTestEventCode: res.settings.metaTestEventCode || 'TEST89137',
            metaCapiEnabled: res.settings.metaCapiEnabled !== false,
          };
          setSettings(loaded);
          metaPixel.syncSettings({
            metaPixelEnabled: loaded.metaPixelEnabled,
            metaPixelId: loaded.metaPixelId,
            metaAccessToken: loaded.metaAccessToken,
            metaTestEventCode: loaded.metaTestEventCode,
            metaCapiEnabled: loaded.metaCapiEnabled,
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Meta Pixel ID if enabled
    if (settings.metaPixelEnabled) {
      const cleanId = String(settings.metaPixelId || '').trim();
      const val = validatePixelId(cleanId);
      if (!val.valid) {
        alert(`Meta Pixel Error: ${val.error}`);
        return;
      }
    }

    try {
      setSavingSettings(true);
      const res = await api.adminUpdateSettings(settings);
      if (res.success) {
        setSaveSuccess(true);
        // Sync runtime Meta Pixel immediately
        metaPixel.syncSettings({
          metaPixelEnabled: settings.metaPixelEnabled !== false,
          metaPixelId: settings.metaPixelId,
          metaAccessToken: settings.metaAccessToken,
          metaTestEventCode: settings.metaTestEventCode,
          metaCapiEnabled: settings.metaCapiEnabled !== false,
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('shokh_meta_pixel_updated', {
              detail: {
                metaPixelEnabled: settings.metaPixelEnabled,
                metaPixelId: settings.metaPixelId,
                metaAccessToken: settings.metaAccessToken,
                metaTestEventCode: settings.metaTestEventCode,
                metaCapiEnabled: settings.metaCapiEnabled,
              },
            })
          );
        }
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert(res.error || 'Failed to save settings to database.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters long.', error: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', error: true });
      return;
    }

    try {
      setPasswordSaving(true);
      const res = await api.adminChangePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordMsg({ text: 'Admin password updated successfully!', error: false });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ text: res.error || 'Failed to update password.', error: true });
      }
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Failed to update password.', error: true });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-16 text-center text-neutral-400 text-xs">
        Loading settings...
      </div>
    );
  }

  const isPixelEnabled = settings.metaPixelEnabled !== false;
  const currentPixelId = String(settings.metaPixelId || '').trim();
  const isPixelValidFormat = /^\d{8,24}$/.test(currentPixelId);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Store &amp; System Settings</h2>
        <p className="text-xs text-neutral-400 font-medium mt-0.5">
          Configure business profile, delivery charges, payment gateways, Meta Pixel &amp; Conversions API, and admin security
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Store settings &amp; Meta Pixel configuration saved successfully!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        {/* 1. Store Profile */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
            <Store className="w-4 h-4 text-neutral-600" />
            <h3 className="text-sm font-extrabold text-neutral-900 uppercase tracking-wider">
              1. Business Profile &amp; Contact
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-neutral-800 mb-1">Business Name</label>
              <input
                type="text"
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-800 mb-1">Tagline</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-800 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-800 mb-1">WhatsApp Business Number</label>
              <input
                type="text"
                value={settings.whatsapp}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-emerald-700"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-neutral-800 mb-1">Store Address (Dhaka)</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* 2. Shipping & Delivery Rates */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
            <Truck className="w-4 h-4 text-neutral-600" />
            <h3 className="text-sm font-extrabold text-neutral-900 uppercase tracking-wider">
              2. Shipping Rates &amp; Free Delivery
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-neutral-800 mb-1">Inside Dhaka Fee (৳)</label>
              <input
                type="number"
                min={0}
                value={settings.deliveryChargeInsideDhaka}
                onChange={(e) => setSettings({ ...settings, deliveryChargeInsideDhaka: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-800 mb-1">Outside Dhaka Fee (৳)</label>
              <input
                type="number"
                min={0}
                value={settings.deliveryChargeOutsideDhaka}
                onChange={(e) => setSettings({ ...settings, deliveryChargeOutsideDhaka: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-800 mb-1">Free Shipping Threshold (৳)</label>
              <input
                type="number"
                min={0}
                value={settings.freeDeliveryThreshold}
                onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
              />
            </div>
          </div>
        </div>

        {/* 3. Payment Methods */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
            <CreditCard className="w-4 h-4 text-neutral-600" />
            <h3 className="text-sm font-extrabold text-neutral-900 uppercase tracking-wider">
              3. Payment Gateways
            </h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 bg-neutral-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.codEnabled}
                onChange={(e) => setSettings({ ...settings, codEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-black cursor-pointer"
              />
              <div>
                <p className="font-bold text-neutral-900">Cash on Delivery (COD)</p>
                <p className="text-[11px] text-neutral-500">Allow customers to pay cash when product is delivered</p>
              </div>
            </label>

            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.bkashEnabled}
                  onChange={(e) => setSettings({ ...settings, bkashEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-black cursor-pointer"
                />
                <div>
                  <p className="font-bold text-neutral-900">bKash / Nagad Mobile Banking</p>
                  <p className="text-[11px] text-neutral-500">Display merchant number during checkout</p>
                </div>
              </label>

              {settings.bkashEnabled && (
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">bKash Merchant / Personal Number</label>
                  <input
                    type="text"
                    value={settings.bkashMerchantNumber}
                    onChange={(e) => setSettings({ ...settings, bkashMerchantNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. TRACKING & ANALYTICS (META PIXEL & CONVERSIONS API) */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-[#1877F2]" />
              <h3 className="text-sm font-extrabold text-neutral-900 uppercase tracking-wider">
                4. Tracking &amp; Analytics (Meta Pixel &amp; CAPI)
              </h3>
            </div>
            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                  isPixelEnabled && isPixelValidFormat
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPixelEnabled && isPixelValidFormat ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
                  }`}
                />
                {isPixelEnabled && isPixelValidFormat ? '● Connected / Active' : '○ Tracking Disabled'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 text-xs text-neutral-600 leading-relaxed">
            <p>
              Dual-layer Meta Tracking: <strong>Browser Pixel</strong> + <strong>Server-side Conversions API (CAPI)</strong>.
              Captures conversions even with iOS ad-blockers and privacy shields. Tracks real orders with <code>BDT</code> currency and duplicate purchase protection.
            </p>
          </div>

          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl">
              <div>
                <p className="font-bold text-neutral-900">Enable Meta Tracking (Pixel + CAPI)</p>
                <p className="text-[11px] text-neutral-500">
                  When turned ON, both browser Pixel and server-side Conversions API events are actively dispatched.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    metaPixelEnabled: !isPixelEnabled,
                  })
                }
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer ${
                  isPixelEnabled ? 'bg-[#1877F2]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPixelEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Pixel ID Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-neutral-800">
                  Meta Pixel ID *
                </label>
                {currentPixelId && !isPixelValidFormat && (
                  <span className="text-[11px] font-bold text-rose-600">
                    Must be 8–24 numeric digits
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="4455123488042747"
                value={settings.metaPixelId || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    metaPixelId: e.target.value.replace(/\s+/g, ''),
                  })
                }
                className={`w-full px-3 py-2.5 bg-neutral-50 border rounded-xl font-mono font-bold text-sm tracking-wide ${
                  currentPixelId && !isPixelValidFormat
                    ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:outline-rose-500'
                    : 'border-neutral-200 focus:outline-black'
                }`}
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Your Meta Business Pixel ID (e.g. <code>4455123488042747</code>).
              </p>
            </div>

            {/* Meta Access Token (Conversions API) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-neutral-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Conversions API (CAPI) Access Token</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[11px] font-bold text-neutral-500 hover:text-black flex items-center gap-1 cursor-pointer"
                >
                  {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showToken ? 'Hide Token' : 'Show Token'}</span>
                </button>
              </div>
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="EAAMVeXfzl2YBSoLiAA7eeVpx..."
                value={settings.metaAccessToken || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    metaAccessToken: e.target.value.trim(),
                  })
                }
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-xs focus:outline-black"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Generated from Meta Events Manager &rarr; Settings &rarr; Conversions API &rarr; Generate access token.
              </p>
            </div>

            {/* Test Event Code */}
            <div>
              <label className="block font-bold text-neutral-800 mb-1 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-neutral-500" />
                <span>Meta Test Event Code (Optional for Testing)</span>
              </label>
              <input
                type="text"
                placeholder="TEST89137"
                value={settings.metaTestEventCode || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    metaTestEventCode: e.target.value.trim().toUpperCase(),
                  })
                }
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold text-xs uppercase focus:outline-black max-w-xs"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Enter your test code (e.g. <code>TEST89137</code>) from Meta Events Manager &rarr; Test Events tab to view live test logs in real time.
              </p>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-neutral-400">Quick ID Presets:</span>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, metaPixelId: '4455123488042747' })}
                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[11px] font-mono font-medium transition-colors cursor-pointer"
              >
                Business Portfolio (4455123488042747)
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, metaPixelId: '1421849056571633' })}
                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[11px] font-mono font-medium transition-colors cursor-pointer"
              >
                Store Pixel (1421849056571633)
              </button>
            </div>

            {/* Test Status feedback toast */}
            {pixelTestStatus && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 ${
                  pixelTestStatus.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {pixelTestStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                )}
                <div>
                  <p className="font-bold">
                    {pixelTestStatus.success ? 'Meta Pixel & CAPI Verified' : 'Pixel Test Notice'}
                  </p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{pixelTestStatus.message}</p>
                </div>
              </div>
            )}

            {/* Test Button & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestPixel}
                disabled={pixelTesting}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Play className={`w-3.5 h-3.5 ${pixelTesting ? 'animate-spin' : ''}`} />
                <span>{pixelTesting ? 'Sending Test Event to Meta...' : 'Test Meta Pixel & CAPI'}</span>
              </button>

              <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero Duplicate Purchase Protection Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingSettings}
            className="px-6 py-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{savingSettings ? 'Saving Settings...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>

      {/* 5. Security / Password Update Form */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
          <KeyRound className="w-4 h-4 text-neutral-600" />
          <h3 className="text-sm font-extrabold text-neutral-900 uppercase tracking-wider">
            5. Admin Security &amp; Password
          </h3>
        </div>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              passwordMsg.error ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {passwordMsg.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block font-bold text-neutral-800 mb-1">Current Password *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-800 mb-1">New Password (Min 6 chars) *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-800 mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold transition-all cursor-pointer"
          >
            {passwordSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* 6. Supabase Database Connection */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-extrabold text-neutral-900 uppercase tracking-wider">
              6. Supabase Database Architecture
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isSupabaseConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
              {isSupabaseConfigured ? 'Custom Supabase Connected' : 'Disconnected (Local DB Active)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Supabase Project URL</span>
            <span className="font-mono text-neutral-800 break-all select-all font-semibold">
              {safeUrl || 'None configured (Disconnected)'}
            </span>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Connection Status</span>
            <span className="font-mono text-neutral-800 font-semibold">
              {isSupabaseConfigured ? 'Connected via Environment' : 'Clean Slate / Ready to Reconnect'}
            </span>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs space-y-2">
            <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
              <span>How to Reconnect Your Supabase Database:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-neutral-600 text-[11px] leading-relaxed">
              <li>Open your project settings / environment secrets in AI Studio or your hosting platform.</li>
              <li>Add <code>VITE_SUPABASE_URL</code> with your Supabase Project URL (e.g. <code>https://your-ref.supabase.co</code>).</li>
              <li>Add <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> with your Supabase anon/publishable key.</li>
              <li>In your Supabase Dashboard, open <strong>SQL Editor</strong> and run <code>supabase_schema.sql</code> (provided in the root directory) to set up all tables and RLS policies.</li>
            </ol>
          </div>
        )}

        {supabaseStatus && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 ${
            supabaseStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            {supabaseStatus.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />}
            <div>
              <p className="font-bold">{supabaseStatus.success ? 'Supabase Connection Live' : 'Connection Notice'}</p>
              <p className="text-[11px] mt-0.5 text-neutral-600">{supabaseStatus.message}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestSupabase}
              disabled={supabaseTesting}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${supabaseTesting ? 'animate-spin' : ''}`} />
              <span>{supabaseTesting ? 'Testing Ping...' : 'Test Supabase Connection'}</span>
            </button>
          </div>

          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isSupabaseConfigured ? 'RLS Enabled & Publishable Key Secured' : 'Local Database Engine Active'}</span>
          </div>
        </div>
      </div>

      {/* 7. Reset Store Data */}
      <div className="bg-rose-50/60 p-6 rounded-3xl border border-rose-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-rose-100 pb-3">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-extrabold text-rose-900 uppercase tracking-wider">
              7. Factory Reset / Clean Store Data
            </h3>
          </div>
        </div>

        <p className="text-xs text-rose-800 font-medium leading-relaxed">
          Wipe all customer profiles, customer history, order records, custom designs, wholesale inquiries, and product catalog data. Admin credentials and system settings will remain active.
        </p>

        <button
          type="button"
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete all customer data, orders, products, and history? This will make the store completely new.')) {
              const res = await api.adminResetAllStoreData();
              if (res.success) {
                alert('Store data has been successfully wiped. The website is clean and like new.');
                window.location.reload();
              } else {
                alert(res.error || 'Failed to reset store data.');
              }
            }
          }}
          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Store to Fresh State</span>
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Users,
  Percent,
  TrendingUp,
  SlidersHorizontal,
  History,
  Store,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Palette,
  Briefcase,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Tag,
  Activity,
  MessageSquare,
  Mail,
  Zap,
  HelpCircle,
  Settings,
  Info,
  Download,
  Database,
  ArrowUpRight,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminOverview } from './AdminOverview';
import { AdminOrders } from './AdminOrders';
import { AdminProducts } from './AdminProducts';
import { AdminInventory } from './AdminInventory';
import { AdminCustomers } from './AdminCustomers';
import { AdminCustomOrders } from './AdminCustomOrders';
import { AdminWholesale } from './AdminWholesale';
import { AdminDiscounts } from './AdminDiscounts';
import { AdminReports } from './AdminReports';
import { AdminSettings } from './AdminSettings';
import { AdminActivityLogs } from './AdminActivityLogs';
import { AdminDiagnostics } from './AdminDiagnostics';
import { AdminSeoManager } from './AdminSeoManager';
import { AdminLoginPage } from './AdminLoginPage';
import { api } from '../../services/api';
import { supabase, safeUrl } from '../../lib/supabaseClient';

export type AdminTab =
  | 'overview'
  | 'orders'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'wholesale'
  | 'custom-orders'
  | 'discounts'
  | 'reports'
  | 'settings'
  | 'logs'
  | 'diagnostics'
  | 'chat'
  | 'seo';

interface AdminPanelProps {
  onExitToStore: () => void;
  initialTab?: AdminTab;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExitToStore, initialTab = 'overview' }) => {
  const { admin, adminToken, isAdminLoading, logoutAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [currency, setCurrency] = useState<'$' | '৳'>('$');
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Expandable other tools
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [realtimeOrderToast, setRealtimeOrderToast] = useState<{ title: string; message: string; orderId?: string } | null>(null);

  // Fetch notifications & live stats from Supabase
  const fetchLiveNotifs = async () => {
    try {
      const res = await api.adminGetNotifications();
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || res.notifications.filter((n: any) => !n.isRead).length || 0);
      }
      const statsRes = await api.adminGetStats('7d');
      if (statsRes.success && statsRes.summary) {
        setPendingOrdersCount(statsRes.summary.newOrdersCount || 0);
      }
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.adminMarkAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!adminToken) return;
    fetchLiveNotifs();

    // Supabase Realtime subscription for orders INSERT
    const channel = supabase
      .channel('admin-panel-orders-realtime-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[Supabase Realtime] New order inserted:', payload);
          const newOrder: any = payload.new;
          const orderNum = newOrder?.order_number || newOrder?.id?.slice(0, 8) || 'New';
          const total = newOrder?.total_amount || newOrder?.total || 0;

          setRealtimeOrderToast({
            title: `🔔 New Order #${orderNum} Placed!`,
            message: `Total Amount: ৳${Number(total).toLocaleString()}. Click to review order.`,
            orderId: newOrder?.id,
          });

          fetchLiveNotifs();
        }
      )
      .subscribe();

    const interval = setInterval(fetchLiveNotifs, 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [adminToken]);

  // Keyboard shortcut listener (Cmd+F / Ctrl+F for sidebar search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        const input = document.getElementById('vizora-sidebar-search');
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Export Data to CSV
  const handleExportCSV = async () => {
    try {
      const ordersRes = await api.adminGetOrders({ page: 1, limit: 100 });
      const orders = ordersRes.orders || [];
      if (orders.length === 0) {
        alert('No orders available to export yet.');
        return;
      }

      const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'Total', 'Payment Status', 'Order Status'];
      const rows = orders.map((o: any) => [
        `"${o.orderNumber || o.order_number || ''}"`,
        `"${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}"`,
        `"${o.shippingAddress?.fullName || o.customerName || ''}"`,
        `"${o.shippingAddress?.phone || o.customerPhone || ''}"`,
        `"${o.totalAmount || o.total || 0}"`,
        `"${o.paymentStatus || 'Pending'}"`,
        `"${o.status || o.orderStatus || 'Pending'}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `shokh_vizora_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // If loading authentication status
  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6f5] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-emerald-200 border-t-[#0d2822] rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
          Verifying Supabase Admin Credentials...
        </p>
      </div>
    );
  }

  // If not logged in as Admin, show the secure Admin Login Page
  if (!adminToken || !admin) {
    return (
      <AdminLoginPage
        onBackToStore={onExitToStore}
        onLoginSuccess={() => {
          setActiveTab('overview');
        }}
      />
    );
  }

  const handleNavClick = (tab: AdminTab, statusFilter = 'all', typeFilter = 'all') => {
    setActiveTab(tab);
    setOrderStatusFilter(statusFilter);
    setOrderTypeFilter(typeFilter);
    setSelectedOrderId(undefined);
    setSidebarOpen(false);
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId || undefined);
    setActiveTab('orders');
    setOrderStatusFilter('all');
    setOrderTypeFilter('all');
  };

  const displayName = admin.name || 'Tony Robert';
  const displayGreetingName = displayName.split(' ')[0] || 'Tony';

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-neutral-900 flex font-sans antialiased selection:bg-[#0d2822] selection:text-white">
      
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 1. LEFT SIDEBAR (Dark Forest Green #0d2822 matching screenshot) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#0d2822] text-white flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl w-64 sm:w-72' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-white/5">
          <div 
            className="flex items-center gap-2.5 cursor-pointer overflow-hidden"
            onClick={() => handleNavClick('overview')}
          >
            {/* Diamond Logo in mint green */}
            <div className="w-8 h-8 rounded-lg bg-[#143d34] border border-[#23584c] flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-4 h-4 text-[#34d399]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5L18.5 12 12 18.5 5.5 12 12 5.5z" />
              </svg>
            </div>
            
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  Vizora
                </span>
                <span className="text-[10px] text-emerald-400/70 font-semibold tracking-wider uppercase">
                  Shokh Outfits BD
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-emerald-200/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-emerald-200/60 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Search Bar */}
        {!sidebarCollapsed && (
          <div className="px-4 pt-4 pb-1">
            <div className="relative">
              <div className="flex items-center bg-[#13372f] border border-[#1b4b3f] rounded-xl px-3 py-2 text-xs">
                <Search className="w-3.5 h-3.5 text-emerald-400/60 mr-2 shrink-0" />
                <input
                  id="vizora-sidebar-search"
                  type="text"
                  placeholder="Search"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-emerald-400/50 focus:outline-none w-full"
                />
                <kbd className="hidden sm:inline-block text-[10px] font-mono text-emerald-300/80 bg-[#0d2822] border border-[#1e5246] px-1.5 py-0.5 rounded shrink-0">
                  ⌘ F
                </kbd>
              </div>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          
          {/* SECTION 1: MAIN MENU */}
          <div>
            {!sidebarCollapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-emerald-400/60">
                Main Menu
              </p>
            )}

            <div className="space-y-1">
              {/* DASHBOARD */}
              <button
                onClick={() => handleNavClick('overview')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                  activeTab === 'overview'
                    ? 'bg-[#164237] text-white font-bold shadow-xs'
                    : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className={`w-4 h-4 ${activeTab === 'overview' ? 'text-[#34d399]' : 'text-emerald-300/60'}`} />
                  {!sidebarCollapsed && <span>Dashboard</span>}
                </div>
                {activeTab === 'overview' && !sidebarCollapsed && (
                  <span className="w-1 h-5 bg-[#34d399] rounded-full absolute right-2" />
                )}
              </button>

              {/* PRODUCTS */}
              <button
                onClick={() => handleNavClick('products')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                  activeTab === 'products'
                    ? 'bg-[#164237] text-white font-bold shadow-xs'
                    : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className={`w-4 h-4 ${activeTab === 'products' ? 'text-[#34d399]' : 'text-emerald-300/60'}`} />
                  {!sidebarCollapsed && <span>Products</span>}
                </div>
                {activeTab === 'products' && !sidebarCollapsed && (
                  <span className="w-1 h-5 bg-[#34d399] rounded-full absolute right-2" />
                )}
              </button>

              {/* ORDER */}
              <button
                onClick={() => handleNavClick('orders')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                  activeTab === 'orders'
                    ? 'bg-[#164237] text-white font-bold shadow-xs'
                    : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className={`w-4 h-4 ${activeTab === 'orders' ? 'text-[#34d399]' : 'text-emerald-300/60'}`} />
                  {!sidebarCollapsed && <span>Order</span>}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-1.5">
                    {pendingOrdersCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] rounded-full font-bold bg-[#34d399] text-[#0d2822]">
                        {pendingOrdersCount}
                      </span>
                    )}
                    {activeTab === 'orders' && (
                      <span className="w-1 h-5 bg-[#34d399] rounded-full ml-1" />
                    )}
                  </div>
                )}
              </button>

              {/* CUSTOMER */}
              <button
                onClick={() => handleNavClick('customers')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                  activeTab === 'customers'
                    ? 'bg-[#164237] text-white font-bold shadow-xs'
                    : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className={`w-4 h-4 ${activeTab === 'customers' ? 'text-[#34d399]' : 'text-emerald-300/60'}`} />
                  {!sidebarCollapsed && <span>Customer</span>}
                </div>
                {activeTab === 'customers' && !sidebarCollapsed && (
                  <span className="w-1 h-5 bg-[#34d399] rounded-full absolute right-2" />
                )}
              </button>

              {/* CHAT (with badge 10 matching screenshot) */}
              <button
                onClick={() => handleNavClick('chat')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                  activeTab === 'chat'
                    ? 'bg-[#164237] text-white font-bold shadow-xs'
                    : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className={`w-4 h-4 ${activeTab === 'chat' ? 'text-[#34d399]' : 'text-emerald-300/60'}`} />
                  {!sidebarCollapsed && <span>Chat</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="px-1.5 py-0.2 rounded-md bg-[#164237] border border-[#23584c] text-[10px] font-bold text-emerald-300">
                    10
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 2: OTHER */}
          <div>
            {!sidebarCollapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-emerald-400/60">
                Other
              </p>
            )}

            <div className="space-y-1">
              {/* EMAIL */}
              <button
                onClick={() => {
                  alert('Email Broadcast & Customer Notification Service connected to Supabase Auth.');
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-100/70 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-emerald-300/60" />
                  {!sidebarCollapsed && <span>Email</span>}
                </div>
              </button>

              {/* ANALYTICS */}
              <button
                onClick={() => handleNavClick('reports')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'reports' ? 'bg-[#164237] text-white font-bold' : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-emerald-300/60" />
                  {!sidebarCollapsed && <span>Analytics</span>}
                </div>
              </button>

              {/* INTEGRATION (Supabase, Meta Pixel) */}
              <button
                onClick={() => handleNavClick('diagnostics')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'diagnostics' ? 'bg-[#164237] text-white font-bold' : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-emerald-300/60" />
                  {!sidebarCollapsed && <span>Integration</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              {/* PERFORMANCE / INVENTORY */}
              <button
                onClick={() => handleNavClick('inventory')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'inventory' ? 'bg-[#164237] text-white font-bold' : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-emerald-300/60" />
                  {!sidebarCollapsed && <span>Performance</span>}
                </div>
              </button>

              {/* SEO MANAGER */}
              <button
                onClick={() => handleNavClick('seo')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                  activeTab === 'seo'
                    ? 'bg-[#164237] text-white font-bold shadow-xs'
                    : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className={`w-4 h-4 ${activeTab === 'seo' ? 'text-[#34d399]' : 'text-emerald-300/60'}`} />
                  {!sidebarCollapsed && <span>SEO Meta Tags</span>}
                </div>
                {activeTab === 'seo' && !sidebarCollapsed && (
                  <span className="w-1 h-5 bg-[#34d399] rounded-full absolute right-2" />
                )}
              </button>

              {/* Expandable store sections */}
              {!sidebarCollapsed && (
                <div className="pt-2">
                  <button
                    onClick={() => setMoreToolsOpen(!moreToolsOpen)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-[11px] font-semibold text-emerald-400/80 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>More Store Tools</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreToolsOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {moreToolsOpen && (
                    <div className="pl-6 space-y-1 pt-1 border-l border-white/10 ml-4">
                      <button
                        onClick={() => handleNavClick('wholesale')}
                        className={`w-full text-left py-1 px-2 rounded text-xs transition-colors cursor-pointer ${
                          activeTab === 'wholesale' ? 'text-[#34d399] font-bold' : 'text-emerald-200/60 hover:text-white'
                        }`}
                      >
                        Wholesale B2B
                      </button>
                      <button
                        onClick={() => handleNavClick('custom-orders')}
                        className={`w-full text-left py-1 px-2 rounded text-xs transition-colors cursor-pointer ${
                          activeTab === 'custom-orders' ? 'text-[#34d399] font-bold' : 'text-emerald-200/60 hover:text-white'
                        }`}
                      >
                        Custom Orders
                      </button>
                      <button
                        onClick={() => handleNavClick('discounts')}
                        className={`w-full text-left py-1 px-2 rounded text-xs transition-colors cursor-pointer ${
                          activeTab === 'discounts' ? 'text-[#34d399] font-bold' : 'text-emerald-200/60 hover:text-white'
                        }`}
                      >
                        Discounts &amp; Coupons
                      </button>
                      <button
                        onClick={() => handleNavClick('logs')}
                        className={`w-full text-left py-1 px-2 rounded text-xs transition-colors cursor-pointer ${
                          activeTab === 'logs' ? 'text-[#34d399] font-bold' : 'text-emerald-200/60 hover:text-white'
                        }`}
                      >
                        Activity Logs
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* SECTION 3: ACCOUNT (Pinned at bottom matching screenshot) */}
        <div className="p-4 border-t border-white/5 space-y-2">
          {!sidebarCollapsed && (
            <p className="px-2 text-[10px] font-bold tracking-wider uppercase text-emerald-400/60">
              Account
            </p>
          )}

          {/* Help Center */}
          <button
            onClick={() => setInfoModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-100/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-emerald-300/60 shrink-0" />
            {!sidebarCollapsed && <span>Help Center</span>}
          </button>

          {/* Settings */}
          <button
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'settings' ? 'text-[#34d399] bg-[#164237]' : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4 text-emerald-300/60 shrink-0" />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>

          {/* User Profile Card (Tony Robert) */}
          <div className="pt-2">
            <div className="flex items-center justify-between bg-[#13372f] border border-[#1b4b3f] rounded-xl p-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-emerald-400/30">
                  <img
                    src="/src/assets/images/admin_tony_avatar_1791011957374.jpg"
                    alt="Tony Robert"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-emerald-400/70 truncate">
                      Store Administrator
                    </p>
                  </div>
                )}
              </div>

              {/* Logout / Exit button */}
              <button
                onClick={async () => {
                  await logoutAdmin();
                  onExitToStore();
                }}
                className="p-1 text-emerald-300/70 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer shrink-0"
                title="Sign Out to Storefront"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </aside>

      {/* 2. MAIN VIEWPORT */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        
        {/* TOP BAR CONTRACT: Title on Left, Team Pile + Notification + Export on Right */}
        <header className="h-16 sm:h-20 px-3 sm:px-8 flex items-center justify-between border-b border-neutral-200/60 bg-[#f4f6f5] sticky top-0 z-30">
          
          {/* Left: Mobile hamburger + Dashboard Title + Welcome back */}
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white border border-neutral-200 text-neutral-700 shadow-xs cursor-pointer shrink-0 active:scale-95"
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-black text-neutral-900 tracking-tight truncate">
                {activeTab === 'overview' ? 'Dashboard' : 
                 activeTab === 'products' ? 'Product Catalog' :
                 activeTab === 'orders' ? 'Order Management' :
                 activeTab === 'customers' ? 'Customers' :
                 activeTab === 'inventory' ? 'Stock & Inventory' :
                 activeTab === 'wholesale' ? 'Wholesale B2B' :
                 activeTab === 'custom-orders' ? 'Custom Apparel Studio' :
                 activeTab === 'discounts' ? 'Discounts & Coupons' :
                 activeTab === 'reports' ? 'Analytics & Reports' :
                 activeTab === 'settings' ? 'Store Settings' :
                 activeTab === 'logs' ? 'Activity Audit Logs' :
                 activeTab === 'diagnostics' ? 'Supabase Diagnostics' : 'Dashboard'}
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-400 font-medium hidden xs:block truncate">
                Welcome back {displayGreetingName}
              </p>
            </div>
          </div>

          {/* Right: Currency Toggle + Team Avatar Pile + Info + Bell + Export */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Currency Switcher */}
            <button
              onClick={() => setCurrency(currency === '$' ? '৳' : '$')}
              className="px-2 py-1 sm:px-2.5 text-[11px] sm:text-xs font-bold rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 shadow-2xs cursor-pointer"
              title="Toggle Currency ($ USD / ৳ BDT)"
            >
              {currency === '$' ? '$ USD' : '৳ BDT'}
            </button>

            {/* Supabase Live Connected Badge */}
            <div 
              onClick={() => setInfoModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-700 cursor-pointer shadow-2xs hover:bg-emerald-100/70 transition-colors"
              title="Click to view Supabase connection details"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Supabase Live</span>
            </div>

            {/* Overlapping Team Avatar Pile (+ button) matching screenshot */}
            <div className="hidden sm:flex items-center -space-x-2 overflow-hidden py-1">
              <img
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Team member 1"
              />
              <img
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                alt="Team member 2"
              />
              <img
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80"
                alt="Team member 3"
              />
              <button
                onClick={() => setInfoModalOpen(true)}
                className="inline-flex h-8 w-8 rounded-full items-center justify-center bg-white border border-neutral-200 text-xs font-bold text-neutral-600 ring-2 ring-white hover:bg-neutral-50 shadow-2xs cursor-pointer"
                title="Team & Access"
              >
                +
              </button>
            </div>

            {/* Info Icon Button (i) */}
            <button
              onClick={() => setInfoModalOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-neutral-200/90 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="Supabase System Information"
            >
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-neutral-200/90 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-colors shadow-2xs cursor-pointer relative"
                title="Notifications"
              >
                <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${unreadCount > 0 ? 'text-rose-600 animate-bounce' : ''}`} />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-rose-500 rounded-full animate-ping opacity-75" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full ring-2 ring-white" />
                  </>
                )}
              </button>

              {/* Notification dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-neutral-200/80 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">Notifications</h4>
                      <p className="text-[10px] text-neutral-400">{unreadCount} unread alerts</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="py-2 divide-y divide-neutral-50 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-neutral-400 text-center py-6">All caught up!</p>
                    ) : (
                      notifications.slice(0, 6).map((n) => (
                        <div key={n.id} className={`py-2.5 px-2 rounded-xl text-xs transition-colors ${!n.isRead ? 'bg-emerald-50/60 font-semibold' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-neutral-900">{n.title || n.message}</p>
                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />}
                          </div>
                          <p className="text-[11px] text-neutral-600 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-neutral-400 mt-1">{new Date(n.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dark Forest Green Export Button matching screenshot */}
            <button
              onClick={handleExportCSV}
              className="hidden sm:flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-[#0d2822] hover:bg-[#123830] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              title="Export Orders & Data to CSV"
            >
              <span>Export</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            {/* Exit to Storefront button */}
            <button
              onClick={onExitToStore}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white hover:bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Return to Customer Storefront"
            >
              <Store className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storefront</span>
            </button>
          </div>

        </header>

        {/* Tab Content Display */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto bg-[#f4f6f5] space-y-4">
          {unreadCount > 0 && (
            <div className="bg-gradient-to-r from-emerald-900 to-[#0d2822] text-white p-4 rounded-2xl shadow-md border border-emerald-700/50 flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-[#34d399] animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <span>New Notifications Highlight</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase">
                      {unreadCount} Unread Alerts
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-100/80 mt-0.5">
                    You have new incoming orders or low stock inventory warnings requiring your review.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setNotificationsOpen(true)}
                  className="px-3.5 py-2 bg-[#34d399] hover:bg-[#2bc28a] text-neutral-950 font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  View Alerts
                </button>
                <button
                  onClick={handleMarkAllRead}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Mark Read
                </button>
              </div>
            </div>
          )}
          {activeTab === 'overview' && (
            <AdminOverview
              onViewOrder={handleViewOrder}
              onViewProducts={() => setActiveTab('products')}
              onNavigateTab={(tab, filter) => {
                if (tab === 'orders') handleNavClick('orders', filter || 'all');
                else if (tab === 'customers') handleNavClick('customers');
                else if (tab === 'reports') handleNavClick('reports');
              }}
              currency={currency}
              onToggleCurrency={() => setCurrency(currency === '$' ? '৳' : '$')}
            />
          )}

          {activeTab === 'orders' && (
            <AdminOrders 
              initialOrderId={selectedOrderId} 
              initialStatusFilter={orderStatusFilter}
              initialTypeFilter={orderTypeFilter}
            />
          )}

          {activeTab === 'products' && (
            <AdminProducts />
          )}

          {activeTab === 'inventory' && (
            <AdminInventory />
          )}

          {activeTab === 'customers' && (
            <AdminCustomers />
          )}

          {activeTab === 'wholesale' && (
            <AdminWholesale />
          )}

          {activeTab === 'custom-orders' && (
            <AdminCustomOrders />
          )}

          {activeTab === 'discounts' && (
            <AdminDiscounts />
          )}

          {activeTab === 'reports' && (
            <AdminReports />
          )}

          {activeTab === 'settings' && (
            <AdminSettings />
          )}

          {activeTab === 'logs' && (
            <AdminActivityLogs />
          )}

          {activeTab === 'diagnostics' && (
            <AdminDiagnostics />
          )}

          {activeTab === 'chat' && (
            <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] max-w-4xl mx-auto">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div>
                  <h3 className="text-lg font-black text-neutral-900">Customer Support &amp; WhatsApp Inquiries</h3>
                  <p className="text-xs text-neutral-400">Live conversation stream connected to store customers</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                  10 Active Inquiries
                </span>
              </div>
              <div className="py-6 space-y-4">
                {[
                  { name: 'Rahim Khan', msg: 'Is the Drop Shoulder Tee available in XXL?', time: '5m ago' },
                  { name: 'Tanvir Ahmed', msg: 'Sent custom hoodie design file for 50 pieces wholesale.', time: '18m ago' },
                  { name: 'Shakil Hasan', msg: 'Checked payment for order #SO-8821.', time: '1h ago' }
                ].map((chat, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">{chat.name}</h4>
                      <p className="text-xs text-neutral-600 mt-0.5">{chat.msg}</p>
                    </div>
                    <span className="text-[11px] text-neutral-400">{chat.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <AdminSeoManager />
          )}
        </main>
      </div>

      {/* Info & Supabase Connection Modal */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900">Supabase Connection Status</h3>
                  <p className="text-xs text-emerald-600 font-semibold">● Connected &amp; Realtime Synced</p>
                </div>
              </div>
              <button
                onClick={() => setInfoModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/70">
                <span className="text-neutral-400 font-bold block text-[10px] uppercase">Supabase Host</span>
                <span className="font-mono text-neutral-800 break-all">{safeUrl}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/70">
                  <span className="text-neutral-400 font-bold block text-[10px] uppercase">Database Engine</span>
                  <span className="font-bold text-neutral-800">PostgreSQL (Supabase)</span>
                </div>
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/70">
                  <span className="text-neutral-400 font-bold block text-[10px] uppercase">Active Schema</span>
                  <span className="font-bold text-neutral-800">public tables created</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <p className="font-bold text-emerald-800">Tables Linked &amp; Synced:</p>
                <p className="text-emerald-700 text-[11px] mt-1 leading-relaxed">
                  • <code>products</code>, <code>product_variants</code>, <code>product_images</code><br/>
                  • <code>orders</code>, <code>order_items</code>, <code>profiles</code><br/>
                  • <code>custom_orders</code>, <code>wholesale_orders</code>, <code>store_settings</code>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setInfoModalOpen(false);
                  handleNavClick('diagnostics');
                }}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Run Diagnostics
              </button>
              <button
                onClick={() => setInfoModalOpen(false)}
                className="px-4 py-2 bg-[#0d2822] text-white rounded-xl text-xs font-bold hover:bg-[#123830] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realtime Order Toast Notification */}
      {realtimeOrderToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0d2822] text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3.5 animate-in slide-in-from-bottom-5 duration-300 max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-[#34d399] flex items-center justify-center shrink-0 border border-emerald-400/30">
            <ShoppingBag className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">{realtimeOrderToast.title}</p>
            <p className="text-[11px] text-emerald-100/80 truncate mt-0.5">{realtimeOrderToast.message}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setRealtimeOrderToast(null);
                if (realtimeOrderToast.orderId) {
                  handleViewOrder(realtimeOrderToast.orderId);
                } else {
                  setActiveTab('orders');
                }
              }}
              className="px-2.5 py-1.5 bg-[#34d399] hover:bg-[#2bc28a] text-neutral-950 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
            >
              View
            </button>
            <button
              onClick={() => setRealtimeOrderToast(null)}
              className="p-1 text-emerald-200 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

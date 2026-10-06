import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Tag,
  Users,
  BarChart2,
  Send,
  Percent,
  Package,
  Building2,
  Settings,
  Store,
  ChevronLeft,
  ChevronRight,
  Bell,
  Calendar,
  ChevronDown,
  LogOut,
  ExternalLink,
  ShieldAlert,
  Search,
  CheckCircle2,
  X,
  FileText,
  Sun,
  Moon,
  Menu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

export type AdminTab =
  | 'orders'
  | 'products'
  | 'customers'
  | 'inventory'
  | 'custom-orders'
  | 'wholesale'
  | 'discounts'
  | 'reports'
  | 'settings'
  | 'logs';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onExitToStore: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  onExitToStore,
  children,
}) => {
  const { admin, logoutAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const handleTabSelect = (tab: AdminTab) => {
    onSelectTab(tab);
    setMobileDrawerOpen(false);
  };

  // Poll notifications & order count & Supabase Realtime
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.adminGetNotifications();
        if (res.success && res.notifications) {
          setNotifications(res.notifications);
          setUnreadCount(res.notifications.filter((n: any) => !n.isRead).length);
        }
        const statsRes = await api.adminGetStats('7d');
        if (statsRes.success && statsRes.summary) {
          setNewOrdersCount(statsRes.summary.newOrdersCount || 0);
        }
      } catch {
        // silent
      }
    };

    fetchNotifications();

    // Supabase Realtime subscription for INSERT, UPDATE, DELETE on orders table when connected
    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('admin-layout-orders-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => {
              fetchNotifications();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime channel error:', err);
      }
    }

    const interval = setInterval(fetchNotifications, 25000);
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(interval);
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.adminMarkAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const todayDateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#0d0f14] text-neutral-900 dark:text-neutral-100 flex font-sans antialiased">
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* 1. SIDEBAR (Responsive drawer on mobile/tablet, sticky on desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:z-30 flex flex-col bg-white dark:bg-[#141720] border-r border-neutral-200/90 dark:border-neutral-800 transition-all duration-300 select-none ${
          mobileDrawerOpen
            ? 'translate-x-0 w-72 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand / Logo Header */}
        <div className="h-16 sm:h-18 px-4 sm:px-5 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => handleTabSelect('orders')}>
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black text-base shadow-sm shrink-0">
              S
            </div>
            {(!collapsed || mobileDrawerOpen) && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight leading-none text-black dark:text-white">
                  SHOKH
                </span>
                <span className="text-[10px] tracking-[0.2em] font-bold text-neutral-400 uppercase mt-0.5">
                  Outfits Admin
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Close Button for Mobile Drawer */}
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="lg:hidden w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 items-center justify-center cursor-pointer transition-colors shadow-2xs"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {/* Main Menu */}
          <div>
            {(!collapsed || mobileDrawerOpen) && (
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Main Menu
              </p>
            )}
            <nav className="space-y-1">
              {/* Orders with Badge */}
              <button
                onClick={() => handleTabSelect('orders')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'orders'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
                title="Orders"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className={`w-4 h-4 shrink-0 ${currentTab === 'orders' ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                  {(!collapsed || mobileDrawerOpen) && <span>Orders</span>}
                </div>
                {(!collapsed || mobileDrawerOpen) && newOrdersCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white min-w-5 text-center">
                    {newOrdersCount}
                  </span>
                )}
              </button>

              {/* Products */}
              <button
                onClick={() => handleTabSelect('products')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'products'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
                title="Products"
              >
                <Tag className={`w-4 h-4 shrink-0 ${currentTab === 'products' ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                {(!collapsed || mobileDrawerOpen) && <span>Products</span>}
              </button>

              {/* Inventory */}
              <button
                onClick={() => handleTabSelect('inventory')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'inventory'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
                title="Inventory"
              >
                <Package className={`w-4 h-4 shrink-0 ${currentTab === 'inventory' ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                {(!collapsed || mobileDrawerOpen) && <span>Inventory</span>}
              </button>

              {/* Customers */}
              <button
                onClick={() => handleTabSelect('customers')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'customers'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
                title="Customers"
              >
                <Users className={`w-4 h-4 shrink-0 ${currentTab === 'customers' ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                {(!collapsed || mobileDrawerOpen) && <span>Customers</span>}
              </button>

              {/* Custom Orders */}
              <button
                onClick={() => handleTabSelect('custom-orders')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'custom-orders'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
                title="Custom Orders"
              >
                <Send className={`w-4 h-4 shrink-0 ${currentTab === 'custom-orders' ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                {(!collapsed || mobileDrawerOpen) && <span>Custom Orders</span>}
              </button>

              {/* Wholesale */}
              <button
                onClick={() => handleTabSelect('wholesale')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'wholesale'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
                title="Wholesale Orders"
              >
                <Building2 className={`w-4 h-4 shrink-0 ${currentTab === 'wholesale' ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                {(!collapsed || mobileDrawerOpen) && <span>Wholesale</span>}
              </button>

              {/* Discounts / Coupons */}
              <button
                onClick={() => handleTabSelect('discounts')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'discounts'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
                title="Discounts & Coupons"
              >
                <Percent className={`w-4 h-4 shrink-0 ${currentTab === 'discounts' ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                {(!collapsed || mobileDrawerOpen) && <span>Discounts</span>}
              </button>

              {/* Analytics / Reports */}
              <button
                onClick={() => handleTabSelect('reports')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'reports'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
                title="Reports & Analytics"
              >
                <BarChart2 className={`w-4 h-4 shrink-0 ${currentTab === 'reports' ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                {(!collapsed || mobileDrawerOpen) && <span>Analytics</span>}
              </button>

              {/* Activity Logs */}
              <button
                onClick={() => handleTabSelect('logs')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'logs'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
                title="Activity Logs"
              >
                <FileText className={`w-4 h-4 shrink-0 ${currentTab === 'logs' ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                {(!collapsed || mobileDrawerOpen) && <span>Activity Logs</span>}
              </button>

              {/* Settings */}
              <button
                onClick={() => handleTabSelect('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'settings'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold shadow-2xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
                title="Store Settings"
              >
                <Settings className={`w-4 h-4 shrink-0 ${currentTab === 'settings' ? 'text-black dark:text-white' : 'text-neutral-400'}`} />
                {(!collapsed || mobileDrawerOpen) && <span>Settings</span>}
              </button>
            </nav>
          </div>

          {/* Sales Channels */}
          <div>
            {(!collapsed || mobileDrawerOpen) && (
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Sales Channel
              </p>
            )}
            <nav className="space-y-1">
              <button
                onClick={() => {
                  onExitToStore();
                  setMobileDrawerOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer group"
                title="View Online Store"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-4 h-4 text-neutral-500 group-hover:text-black dark:group-hover:text-white" />
                  {(!collapsed || mobileDrawerOpen) && <span>Online Store</span>}
                </div>
                {(!collapsed || mobileDrawerOpen) && <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-black dark:group-hover:text-white" />}
              </button>

              <button
                onClick={() => handleTabSelect('wholesale')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Point of Sale / Wholesale"
              >
                <ShoppingBag className="w-4 h-4 text-neutral-400" />
                {(!collapsed || mobileDrawerOpen) && <span>Point of Sale</span>}
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom Switch to Storefront Button */}
        <div className="p-3 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={() => {
              onExitToStore();
              setMobileDrawerOpen(false);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Store className="w-3.5 h-3.5" />
            {(!collapsed || mobileDrawerOpen) && <span>Switch to Customer Store</span>}
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 bg-[#F0F2F5] dark:bg-[#0d0f14] pl-0 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        
        {/* TOP BAR */}
        <header className="sticky top-0 z-20 h-16 sm:h-18 bg-white dark:bg-[#141720] border-b border-neutral-200/80 dark:border-neutral-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          {/* Mobile Hamburger + Greeting */}
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F0F2F5] dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center text-neutral-800 dark:text-neutral-100 cursor-pointer active:scale-95 transition-all shrink-0"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="truncate">
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-none truncate">
                Good Morning, {admin?.name ? admin.name.split(' ')[0] : 'Jonathan'}!
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5 sm:mt-1 hidden sm:block truncate">
                Here's what's happening with your store today
              </p>
            </div>
          </div>

          {/* Right Header Actions: Calendar Pill, Notification Bell, Theme Toggle, Admin Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-[#F0F2F5] dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-200 cursor-pointer transition-colors active:scale-95"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600" />
              )}
            </button>

            {/* Date Pill */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F0F2F5] dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>{todayDateStr}</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
                className="relative w-10 h-10 rounded-xl bg-[#F0F2F5] dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-200 cursor-pointer transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">Notifications</h4>
                      <p className="text-[11px] text-neutral-500">{unreadCount} unread alerts</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-bold text-neutral-700 hover:text-black cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-neutral-50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-neutral-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3.5 hover:bg-neutral-50 transition-colors ${
                            !notif.isRead ? 'bg-neutral-50/70' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                notif.type === 'new_order'
                                  ? 'bg-emerald-500'
                                  : notif.type === 'low_stock'
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-500'
                              }`}
                            />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-neutral-900">{notif.title}</p>
                              <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{notif.message}</p>
                              <p className="text-[10px] text-neutral-400 mt-1">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Avatar & Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-[#F0F2F5] hover:bg-neutral-100 border border-neutral-200/80 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-black text-white font-black text-xs flex items-center justify-center uppercase shadow-2xs">
                  {admin?.name ? admin.name[0] : 'M'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-extrabold text-neutral-900 leading-tight">
                    {admin?.name || 'Monir Jonathan'}
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-400 leading-tight">
                    Store Owner
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2.5 border-b border-neutral-100 mb-1">
                    <p className="text-xs font-bold text-neutral-900">{admin?.name}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{admin?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      onSelectTab('settings');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Store Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectTab('logs');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Audit Logs</span>
                  </button>
                  <div className="my-1 border-t border-neutral-100" />
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logoutAdmin();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* TAB CONTENT CONTAINER */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto bg-[#F0F2F5] dark:bg-[#0d0f14]">
          {children}
        </main>
      </div>
    </div>
  );
};

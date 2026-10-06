import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShoppingBag,
  MapPin,
  Clock,
  RotateCcw,
  LogOut,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Truck,
  Shield,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { CartItem } from '../../types';

interface CustomerAccountDrawerProps {
  onReorder: (items: any[]) => void;
  onOpenAdmin?: () => void;
}

export const CustomerAccountDrawer: React.FC<CustomerAccountDrawerProps> = ({ onReorder, onOpenAdmin }) => {
  const {
    admin,
    customer,
    isCustomerDrawerOpen,
    closeCustomerDrawer,
    logoutCustomer,
    refreshCustomer,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [newAddressText, setNewAddressText] = useState('');
  const [newAddressArea, setNewAddressArea] = useState<'dhaka' | 'outside'>('dhaka');
  const [showAddAddress, setShowAddAddress] = useState(false);

  useEffect(() => {
    if (isCustomerDrawerOpen && customer) {
      const fetchCustomerOrders = async () => {
        try {
          setLoadingOrders(true);
          const res = await api.customerGetOrders();
          if (res.success) {
            setOrders(res.orders || []);
          }
        } catch (err) {
          console.error('Failed to load customer orders:', err);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchCustomerOrders();
    }
  }, [isCustomerDrawerOpen, customer]);

  if (!isCustomerDrawerOpen || !customer) return null;

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressText.trim()) return;

    const updatedAddresses = [
      ...(customer.addresses || []),
      {
        id: `addr-${Date.now()}`,
        label: `Address ${(customer.addresses?.length || 0) + 1}`,
        address: newAddressText.trim(),
        deliveryArea: newAddressArea,
        phone: customer.phone,
        isDefault: (customer.addresses?.length || 0) === 0,
      }
    ];

    try {
      await api.customerUpdateProfile({ addresses: updatedAddresses });
      await refreshCustomer();
      setNewAddressText('');
      setShowAddAddress(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add address');
    }
  };

  const handleRemoveAddress = async (id: string) => {
    const updated = (customer.addresses || []).filter((a) => a && a.id !== id);
    try {
      await api.customerUpdateProfile({ addresses: updated });
      await refreshCustomer();
    } catch (err: any) {
      alert(err.message || 'Failed to remove address');
    }
  };

  const handleReorderClick = (order: any) => {
    if (order.items && order.items.length > 0) {
      onReorder(order.items);
      closeCustomerDrawer();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-[#F8F9FA]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {customer.fullName ? customer.fullName[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 leading-tight">
                  {customer.fullName}
                </h3>
                <p className="text-xs text-neutral-500 font-medium">{customer.email}</p>
              </div>
            </div>

            <button
              onClick={closeCustomerDrawer}
              className="p-2 rounded-xl border border-neutral-200 hover:bg-white text-neutral-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="px-6 pt-3 pb-2 border-b border-neutral-100 flex items-center gap-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'orders' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-black'
              }`}
            >
              My Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'addresses' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-black'
              }`}
            >
              Saved Addresses
            </button>
          </div>

          {/* Admin Banner - Only visible to authenticated Admins */}
          {admin && onOpenAdmin && (
            <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/90 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-emerald-950">Store Administrator</span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-200 text-emerald-900">Active</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-medium">Catalog, Orders & Settings Access</p>
                </div>
              </div>
              <button
                onClick={() => {
                  closeCustomerDrawer();
                  onOpenAdmin();
                }}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Portal</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {loadingOrders ? (
                  <div className="py-16 text-center text-neutral-400">Loading your purchase history...</div>
                ) : orders.length === 0 ? (
                  <div className="py-16 text-center text-neutral-400 space-y-2">
                    <ShoppingBag className="w-8 h-8 mx-auto text-neutral-300" />
                    <p>You haven't placed any orders yet.</p>
                  </div>
                ) : (
                  orders.map((o) => (
                    <div
                      key={o.id}
                      className="p-4 rounded-2xl border border-neutral-200 bg-[#F8F9FA] space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                        <div>
                          <p className="font-mono font-black text-xs text-neutral-900">
                            #{o.orderNumber}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            o.orderStatus === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.orderStatus === 'shipped'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.orderStatus}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5">
                        {o.items?.map((it: any, i: number) => (
                          <div key={i} className="flex justify-between text-neutral-800 text-[11px]">
                            <span className="truncate max-w-56 font-medium">
                              {it.quantity} × {it.productName} ({it.variant?.color} / {it.variant?.size})
                            </span>
                            <span className="font-bold">৳{it.finalPrice}</span>
                          </div>
                        ))}
                      </div>

                      {/* Total & Reorder Button */}
                      <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-neutral-400">Total Paid: </span>
                          <span className="font-black text-sm text-neutral-900">৳{o.total?.toLocaleString()}</span>
                        </div>

                        <button
                          onClick={() => handleReorderClick(o)}
                          className="px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>1-Click Reorder</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-neutral-900">Saved Delivery Addresses</h4>
                  <button
                    onClick={() => setShowAddAddress(!showAddAddress)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 font-bold text-xs text-neutral-800 cursor-pointer"
                  >
                    + Add New
                  </button>
                </div>

                {showAddAddress && (
                  <form onSubmit={handleAddAddress} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                    <p className="font-bold text-neutral-800">New Address Details</p>
                    <textarea
                      rows={2}
                      required
                      placeholder="House, Road, Area, District"
                      value={newAddressText}
                      onChange={(e) => setNewAddressText(e.target.value)}
                      className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl focus:outline-none"
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="areaChoice"
                          checked={newAddressArea === 'dhaka'}
                          onChange={() => setNewAddressArea('dhaka')}
                        />
                        <span>Inside Dhaka</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="areaChoice"
                          checked={newAddressArea === 'outside'}
                          onChange={() => setNewAddressArea('outside')}
                        />
                        <span>Outside Dhaka</span>
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-black text-white rounded-xl font-bold cursor-pointer"
                    >
                      Save Address
                    </button>
                  </form>
                )}

                <div className="space-y-2.5">
                  {customer.addresses?.map((addr) => (
                    <div key={addr.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="font-bold text-neutral-900">{addr.label}</span>
                          <span className="text-[10px] uppercase font-bold text-neutral-400">({addr.deliveryArea})</span>
                        </div>
                        <p className="text-neutral-700 leading-relaxed font-medium">{addr.address}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveAddress(addr.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )) || <p className="text-neutral-400">No addresses saved.</p>}
                </div>
              </div>
            )}
          </div>

          {/* Footer Logout */}
          <div className="p-4 border-t border-neutral-100 bg-[#F8F9FA] flex items-center justify-between">
            <span className="text-neutral-500 text-xs font-medium">
              {admin ? `Admin: ${admin.email}` : 'Signed in as customer'}
            </span>
            <button
              onClick={logoutCustomer}
              className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

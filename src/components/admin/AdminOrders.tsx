import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  Clock,
  RotateCcw,
  FileText,
  Printer,
  X,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

interface AdminOrdersProps {
  initialOrderId?: string;
  initialStatusFilter?: string;
  initialTypeFilter?: string;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ 
  initialOrderId,
  initialStatusFilter = 'all',
  initialTypeFilter = 'all',
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (initialStatusFilter) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  useEffect(() => {
    if (initialTypeFilter) setTypeFilter(initialTypeFilter);
  }, [initialTypeFilter]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [statusNoteInput, setStatusNoteInput] = useState('');

  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.adminGetOrders({
        status: statusFilter,
        type: typeFilter,
        search,
      });
      if (res.success) {
        setOrders(res.orders || []);
        if (initialOrderId) {
          const matched = (res.orders || []).find((o: any) => o && (o.id === initialOrderId || o.orderNumber === initialOrderId));
          if (matched) setSelectedOrder(matched);
        }
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [statusFilter, typeFilter, search, initialOrderId]);

  useEffect(() => {
    fetchOrders(false);

    // 1. Auto-polling every 5 seconds for order updates
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 5000);

    // 2. Refetch on tab focus
    const handleFocus = () => {
      fetchOrders(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Supabase Realtime channel listener for instant multi-browser order sync
    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('orders-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => {
              fetchOrders(true);
            }
          )
          .subscribe();
      } catch (err) {
        // Fallback to auto-polling
      }
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchOrders]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder || !selectedOrder.id) return;
    try {
      setStatusUpdating(true);
      const res = await api.adminUpdateOrderStatus(selectedOrder.id, newStatus, statusNoteInput);
      if (res.success) {
        setSelectedOrder((prev: any) => ({ ...prev, orderStatus: newStatus }));
        setOrders((prev) =>
          prev.map((o) => (o && o.id === selectedOrder.id ? { ...o, orderStatus: newStatus } : o))
        );
        setStatusNoteInput('');
      } else {
        alert(res.error || 'Failed to update order status in Supabase');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSaveTracking = async () => {
    if (!selectedOrder || !selectedOrder.id || !trackingNumberInput) return;
    try {
      const res = await api.adminUpdateOrderTracking(selectedOrder.id, trackingNumberInput, 'Steadfast Courier');
      if (res.success) {
        setSelectedOrder((prev: any) => ({ ...prev, trackingNumber: trackingNumberInput }));
        setOrders((prev) =>
          prev.map((o) => (o && o.id === selectedOrder.id ? { ...o, trackingNumber: trackingNumberInput } : o))
        );
        setTrackingNumberInput('');
      } else {
        alert(res.error || 'Failed to save tracking number in Supabase');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save tracking number');
    }
  };

  const printInvoice = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Delivered</span>;
      case 'shipped':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 flex items-center gap-1"><Truck className="w-3 h-3" /> Shipped</span>;
      case 'processing':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 flex items-center gap-1"><Package className="w-3 h-3" /> Processing</span>;
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Confirmed</span>;
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelled</span>;
      case 'returned':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Returned</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Order Management</h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Process, fulfill and track customer retail, printed, wholesale &amp; custom orders
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order #, Name, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-black w-60 sm:w-72"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'all', label: 'All Orders' },
          { key: 'pending', label: 'Pending / New' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'processing', label: 'Processing' },
          { key: 'shipped', label: 'Shipped' },
          { key: 'delivered', label: 'Delivered' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === tab.key
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:text-black border border-neutral-200/80 hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="h-6 w-px bg-neutral-300 mx-1 shrink-0" />

        {/* Order Types */}
        {(['all', 'retail', 'printed', 'wholesale', 'custom'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition-all cursor-pointer ${
              typeFilter === type
                ? 'bg-neutral-200 text-black font-bold'
                : 'text-neutral-500 hover:text-black'
            }`}
          >
            {type === 'all' ? 'All Types' : type}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    No orders found matching the filter.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-black text-neutral-900">
                      {o.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-900">{o.customer?.fullName}</span>
                        <span className="text-[11px] text-neutral-400">{o.customer?.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-neutral-700 font-semibold truncate max-w-44 block">
                        {o.items?.map((it: any) => it.productName).join(', ') || 'Item'}
                      </span>
                      <span className="text-[10px] text-neutral-400">({o.itemsCount || 1} pcs)</span>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-[10px] font-bold">
                      <span className={`px-2 py-0.5 rounded ${
                        o.orderType === 'wholesale' ? 'bg-purple-100 text-purple-800' :
                        o.orderType === 'custom' ? 'bg-amber-100 text-amber-800' :
                        o.orderType === 'printed' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-neutral-100 text-neutral-800'
                      }`}>
                        {o.orderType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-neutral-900 whitespace-nowrap">
                      ৳{o.total?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(o.orderStatus)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-[11px] font-bold ${o.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {o.paymentMethod?.toUpperCase()} ({o.paymentStatus})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ORDER DETAILS MODAL DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-black">
                  #
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-neutral-900">
                      Order #{selectedOrder.orderNumber}
                    </h3>
                    {getStatusBadge(selectedOrder.orderStatus)}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString()} via {selectedOrder.channel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={printInvoice}
                  className="p-2 rounded-xl border border-neutral-200 hover:bg-white text-neutral-600 cursor-pointer"
                  title="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-xl border border-neutral-200 hover:bg-white text-neutral-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Order Status Workflow Buttons */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3">
                <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Update Order Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { s: 'pending', label: 'Pending' },
                    { s: 'confirmed', label: 'Confirm' },
                    { s: 'processing', label: 'Processing' },
                    { s: 'shipped', label: 'Shipped' },
                    { s: 'delivered', label: 'Delivered' },
                    { s: 'cancelled', label: 'Cancel Order' },
                    { s: 'returned', label: 'Returned' },
                  ].map((item) => (
                    <button
                      key={item.s}
                      disabled={statusUpdating || selectedOrder.orderStatus === item.s}
                      onClick={() => handleUpdateStatus(item.s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedOrder.orderStatus === item.s
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Optional Status Note */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add an internal note or courier comment (optional)..."
                    value={statusNoteInput}
                    onChange={(e) => setStatusNoteInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Courier Tracking input */}
              <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1 text-xs">
                  <p className="font-bold text-neutral-900">Courier Tracking</p>
                  <p className="text-neutral-500">
                    Current: <span className="font-bold text-neutral-800">{selectedOrder.trackingNumber || 'No tracking number added yet'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Enter Tracking ID..."
                    value={trackingNumberInput}
                    onChange={(e) => setTrackingNumberInput(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs w-44 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveTracking}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Customer & Shipping Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-neutral-200 bg-white">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Customer Information
                  </h4>
                  <p className="text-sm font-extrabold text-neutral-900">{selectedOrder.customer?.fullName}</p>
                  <p className="text-xs text-neutral-600 mt-1">Phone: {selectedOrder.customer?.phone}</p>
                  <p className="text-xs text-neutral-600">Email: {selectedOrder.customer?.email || 'N/A'}</p>
                  <div className="mt-3 pt-3 border-t border-neutral-100">
                    <a
                      href={`https://wa.me/880${selectedOrder.customer?.phone?.replace(/[^0-9]/g, '').slice(-10)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat with customer on WhatsApp</span>
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-neutral-200 bg-white">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Shipping &amp; Delivery Address
                  </h4>
                  <p className="text-xs text-neutral-800 leading-relaxed font-semibold">
                    {selectedOrder.customer?.address}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Area: <span className="font-bold uppercase">{selectedOrder.customer?.deliveryArea === 'outside' ? 'Outside Dhaka (৳130)' : 'Inside Dhaka (৳70)'}</span>
                  </p>
                  {selectedOrder.customerNotes && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-800">
                      <strong>Customer Note:</strong> {selectedOrder.customerNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Items List Snapshot */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Purchased Items Snapshot ({selectedOrder.items?.length})
                </h4>
                <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden bg-white">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shrink-0"
                        />
                        <div>
                          <p className="text-xs font-bold text-neutral-900">{item.productName}</p>
                          <p className="text-[11px] text-neutral-500">
                            Color: <span className="font-semibold text-neutral-700">{item.variant?.color}</span> | Size: <span className="font-semibold text-neutral-700">{item.variant?.size}</span> | SKU: {item.sku}
                          </p>
                          {item.customDesignUrl && (
                            <a
                              href={item.customDesignUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>View High-Res Customer Artwork</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-neutral-900">৳{item.finalPrice?.toLocaleString()}</p>
                        <p className="text-[10px] text-neutral-400">{item.quantity} × ৳{item.unitPrice}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5 text-xs text-neutral-700">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold text-neutral-900">৳{selectedOrder.subtotal?.toLocaleString()}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({selectedOrder.couponCode || 'Promo'}):</span>
                    <span className="font-bold">-৳{selectedOrder.discountAmount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span className="font-bold text-neutral-900">৳{selectedOrder.deliveryFee}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-200 text-sm font-black text-neutral-900">
                  <span>Total Amount:</span>
                  <span>৳{selectedOrder.total?.toLocaleString()}</span>
                </div>
              </div>

              {/* Status History Audit Trail */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Order Status Audit History
                </h4>
                <div className="space-y-2 border-l-2 border-neutral-200 pl-4 py-1">
                  {selectedOrder.statusHistory?.map((hist: any, i: number) => (
                    <div key={i} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-neutral-900">{hist.status}</span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(hist.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      {hist.note && <p className="text-neutral-600 mt-0.5">{hist.note}</p>}
                      <p className="text-[10px] text-neutral-400">By: {hist.changedBy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                Close Order Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

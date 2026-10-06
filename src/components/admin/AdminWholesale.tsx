import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  MessageSquare,
  CheckCircle2,
  Package,
  Phone,
  Calendar,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminWholesale: React.FC = () => {
  const [wholesaleOrders, setWholesaleOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetWholesaleOrders();
      if (res.success) {
        setWholesaleOrders(res.wholesaleOrders || []);
      }
    } catch (err) {
      console.error('Failed to load wholesale orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await api.adminUpdateWholesaleOrderStatus(id, newStatus);
      if (res.success) {
        setWholesaleOrders((prev) =>
          prev.map((w) => (w && w.id === id ? { ...w, status: newStatus } : w))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const filtered = wholesaleOrders
    .filter((w) => w && w.id)
    .filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.customerName?.toLowerCase().includes(q) ||
      w.productName?.toLowerCase().includes(q) ||
      w.companyName?.toLowerCase().includes(q) ||
      w.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Wholesale &amp; Bulk Orders</h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Bulk manufacturing inquiries, size/color distribution matrices &amp; WhatsApp direct negotiations
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search wholesale inquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-black w-60 sm:w-72"
          />
        </div>
      </div>

      {/* Wholesale Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            Loading wholesale orders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-xs bg-white rounded-3xl border border-neutral-200">
            No wholesale bulk orders found.
          </div>
        ) : (
          filtered.map((w) => {
            const cleanPhone = w.phone.replace(/[^0-9]/g, '');
            const whatsappText = encodeURIComponent(
              `Hello ${w.customerName}! Regarding your wholesale inquiry for "${w.productName}" (${w.totalQuantity} pcs at ৳${w.wholesaleUnitPrice}/pc, Total: ৳${w.totalAmount}). Shokh Outfits factory is ready to process your production.`
            );

            return (
              <div
                key={w.id}
                className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-6 space-y-5 hover:shadow-md transition-shadow"
              >
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-neutral-900">
                        {w.customerName} {w.companyName ? `(${w.companyName})` : ''}
                      </h4>
                      <p className="text-xs text-neutral-400">
                        Phone: <span className="font-semibold text-neutral-700">{w.phone}</span> | Email: {w.email || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-neutral-900">
                      ৳{w.totalAmount?.toLocaleString()}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        w.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : w.status === 'dispatched'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                </div>

                {/* Body: Product & Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase">Product &amp; Pricing</p>
                    <p className="text-sm font-extrabold text-neutral-900">{w.productName}</p>
                    <p className="text-neutral-600">Total Quantity: <strong className="text-neutral-900">{w.totalQuantity} pieces</strong></p>
                    <p className="text-neutral-600">Wholesale Unit Price: <strong className="text-neutral-900">৳{w.wholesaleUnitPrice} / pc</strong></p>
                    {w.customerNotes && (
                      <p className="text-[11px] text-amber-800 pt-1 border-t border-neutral-200">
                        <strong>Note:</strong> {w.customerNotes}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                    <p className="text-[11px] font-bold text-purple-900 uppercase">
                      Size &amp; Color Matrix Breakdown
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {w.matrix?.map((m: any, idx: number) => (
                        <div key={idx} className="p-2 bg-white rounded-xl border border-purple-200/80 flex items-center justify-between">
                          <span className="font-semibold text-neutral-800">{m.color} / {m.size}</span>
                          <span className="font-black text-purple-900">{m.quantity} pcs</span>
                        </div>
                      )) || (
                        <div className="text-neutral-500">Distribution: {JSON.stringify(w.sizeBreakdown)}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 font-semibold text-[11px]">Update Status:</span>
                    <select
                      value={w.status}
                      onChange={(e) => handleUpdateStatus(w.id, e.target.value)}
                      className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
                    >
                      <option value="new">New Inquiry</option>
                      <option value="negotiation">Discussing / Negotiating</option>
                      <option value="confirmed">Confirmed &amp; In Production</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <a
                    href={`https://wa.me/8801346068854?text=${whatsappText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Discuss Order on WhatsApp (+880 1346-068854)</span>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

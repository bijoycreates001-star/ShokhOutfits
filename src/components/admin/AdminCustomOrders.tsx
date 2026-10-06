import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Clock,
  Palette,
  FileText,
  User,
  Phone,
  Search,
  Eye,
  ShoppingBag,
  Tag,
  ImageIcon,
  X
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminCustomOrders: React.FC = () => {
  const [customOrders, setCustomOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.adminGetCustomOrders();
      if (res.success) {
        setCustomOrders(res.customOrders || []);
      }
    } catch (err) {
      console.error('Failed to load custom orders:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(false);

    const interval = setInterval(() => {
      fetchOrders(true);
    }, 6000);

    const handleFocus = () => {
      fetchOrders(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchOrders]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await api.adminUpdateCustomOrderStatus(id, { orderStatus: newStatus });
      if (res.success) {
        setCustomOrders((prev) =>
          prev.map((c) => (c && c.id === id ? { ...c, orderStatus: newStatus } : c))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update custom order status');
    }
  };

  const handleMarkWhatsAppContacted = async (id: string) => {
    try {
      const res = await api.adminUpdateCustomOrderStatus(id, { whatsappStatus: 'contacted' });
      if (res.success) {
        setCustomOrders((prev) =>
          prev.map((c) => (c && c.id === id ? { ...c, whatsappStatus: 'contacted' } : c))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update WhatsApp status');
    }
  };

  const filtered = customOrders
    .filter((c) => c && c.id)
    .filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.customerName?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.productType?.toLowerCase().includes(q) ||
      c.customerNotes?.toLowerCase().includes(q) ||
      c.orderMethod?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Custom T-Shirt Orders</h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Customer uploaded artwork, design specifications, production status &amp; direct WhatsApp chat
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search custom orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-black w-60 sm:w-72"
          />
        </div>
      </div>

      {/* Grid of Custom Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-neutral-400 text-xs">
            Loading custom design orders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-neutral-400 text-xs bg-white rounded-3xl border border-neutral-200">
            No custom t-shirt orders found.
          </div>
        ) : (
          filtered.map((item) => {
            const cleanPhone = item.phone ? item.phone.replace(/[^0-9]/g, '') : '';
            const whatsappText = encodeURIComponent(
              `Hello ${item.customerName}! We received your custom design request for "${item.productType}" (${item.quantity} pcs, Color: ${item.tshirtColor}, Size: ${item.size}) at Shokh Outfits. Here is your artwork link: ${item.designUrl || 'N/A'}`
            );

            const isWhatsAppOrder = item.orderMethod === 'WhatsApp Order' || item.whatsappStatus === 'pending' || !item.orderId;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-5 space-y-4 hover:shadow-md transition-shadow"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-neutral-800">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-neutral-900">{item.customerName}</h4>
                        {/* Order Method Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isWhatsAppOrder
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-neutral-900 text-white'
                          }`}
                        >
                          {isWhatsAppOrder ? 'WhatsApp Order' : 'Website Order'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.orderStatus === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.orderStatus === 'in_production'
                        ? 'bg-indigo-50 text-indigo-700'
                        : item.orderStatus === 'proof_sent'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {item.orderStatus?.replace('_', ' ')}
                  </span>
                </div>

                {/* Garment Details & Specs */}
                <div className="p-3.5 bg-neutral-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Garment Style:</span>
                    <span className="font-bold text-neutral-900">{item.productType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Color &amp; Size:</span>
                    <span className="font-bold text-neutral-900">
                      {item.tshirtColor} / {item.size}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Quantity:</span>
                    <span className="font-black text-neutral-900">{item.quantity} pieces</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Phone:</span>
                    <span className="font-bold text-neutral-900">{item.phone || 'N/A'}</span>
                  </div>
                  {item.email && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Email:</span>
                      <span className="font-medium text-neutral-700">{item.email}</span>
                    </div>
                  )}
                  {item.customerNotes && (
                    <div className="pt-1.5 mt-1.5 border-t border-neutral-200/80 text-[11px] text-neutral-600">
                      <strong>Customization Notes:</strong> {item.customerNotes}
                    </div>
                  )}
                </div>

                {/* Uploaded Design Box with Preview & View Design Button */}
                <div className="p-3 rounded-xl border border-neutral-200 bg-white flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.designUrl ? (
                      <div 
                        onClick={() => setSelectedPreviewImage(item.designUrl)}
                        className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 cursor-pointer p-0.5 flex items-center justify-center hover:opacity-80 transition-opacity"
                        title="Click to zoom design"
                      >
                        <img
                          src={item.designUrl}
                          alt="Customer artwork preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback if not an image
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-400">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {item.designUrl ? 'Customer Uploaded Design' : 'Text Instructions Only'}
                      </p>
                      {item.designUrl && (
                        <p className="text-[10px] text-neutral-400 truncate max-w-44">
                          {item.designUrl}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.designUrl ? (
                    <a
                      href={item.designUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Design</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-neutral-400 font-medium px-2 py-1 bg-neutral-100 rounded-lg">
                      No File
                    </span>
                  )}
                </div>

                {/* Production Stage Select & WhatsApp Button */}
                <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-500 font-semibold text-[11px]">Stage:</span>
                    <select
                      value={item.orderStatus}
                      onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                      className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
                    >
                      <option value="new">New Request</option>
                      <option value="proof_sent">Proof Sent</option>
                      <option value="in_production">In Production</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {cleanPhone && (
                    <a
                      href={`https://wa.me/880${cleanPhone.slice(-10)}?text=${whatsappText}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleMarkWhatsAppContacted(item.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Customer</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Image Zoom Modal */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-3xl p-4 shadow-2xl flex flex-col items-center"
          >
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-neutral-900 mb-3 self-start pl-2">
              High-Resolution Uploaded Artwork
            </h3>
            <div className="max-h-[75vh] overflow-auto rounded-2xl bg-neutral-100 p-2 flex items-center justify-center">
              <img
                src={selectedPreviewImage}
                alt="High-Res Design"
                className="max-w-full max-h-[70vh] object-contain rounded-xl"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <a
                href={selectedPreviewImage}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setSelectedPreviewImage(null)}
                className="px-4 py-2 bg-neutral-100 text-neutral-800 text-xs font-bold rounded-xl hover:bg-neutral-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

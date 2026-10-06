import React, { useState, useEffect } from 'react';
import {
  Percent,
  Plus,
  Trash2,
  Calendar,
  Ticket,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminDiscounts: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 800,
    maxDiscountAmount: 300,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2027-12-31',
    usageLimit: 500,
    perCustomerLimit: 1,
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetCoupons();
      if (res.success) {
        setCoupons(res.coupons || []);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discountValue) {
      alert('Coupon code and discount value are required.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.adminCreateCoupon(formData);
      if (res.success) {
        setIsCreateOpen(false);
        setFormData({
          code: '',
          discountType: 'percentage',
          discountValue: 10,
          minOrderAmount: 800,
          maxDiscountAmount: 300,
          startDate: new Date().toISOString().split('T')[0],
          endDate: '2027-12-31',
          usageLimit: 500,
          perCustomerLimit: 1,
        });
        fetchCoupons();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.adminDeleteCoupon(id);
      fetchCoupons();
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Discounts &amp; Coupon Codes</h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Create percentage or fixed promo codes with minimum cart thresholds and usage limits
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Coupon</span>
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Coupon Code</th>
              <th className="py-3 px-4">Discount</th>
              <th className="py-3 px-4">Min Spend</th>
              <th className="py-3 px-4">Validity</th>
              <th className="py-3 px-4">Usage Count</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-400">
                  Loading coupons...
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-400">
                  No coupons found.
                </td>
              </tr>
            ) : (
              coupons
                .filter((c) => c && c.id)
                .map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-neutral-500" />
                      <span className="font-mono font-black text-sm text-neutral-900 tracking-wider">
                        {c.code}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-neutral-900">
                    {c.discountValue}{c.discountType === 'percentage' ? '%' : '৳'} OFF
                    {c.maxDiscountAmount ? ` (Max ৳${c.maxDiscountAmount})` : ''}
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    ৳{c.minOrderAmount || 0}
                  </td>
                  <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                    Until {c.endDate}
                  </td>
                  <td className="py-3 px-4 font-semibold text-neutral-900">
                    {c.usageCount} / {c.usageLimit || '∞'} uses
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Coupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE COUPON MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900">Create New Coupon</h3>
                  <p className="text-[11px] text-neutral-400">Configure promo code and validation limits</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-800 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold uppercase focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold cursor-pointer"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Min Order Amount (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Max Discount Cap (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.maxDiscountAmount || ''}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 font-bold hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold cursor-pointer"
                >
                  {saving ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

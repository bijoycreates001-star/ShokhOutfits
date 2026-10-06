import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Download,
  DollarSign,
  TrendingUp,
  Percent,
  Truck,
  RotateCcw,
  CheckCircle2,
  PieChart,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetReports();
      if (res.success) {
        setReports(res);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExport = async (type: 'orders' | 'products' | 'customers') => {
    try {
      setExporting(type);
      await api.adminExportCsv(type);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const financials = reports?.financials || {
    grossSales: 0,
    totalDiscounts: 0,
    totalDeliveryFees: 0,
    totalRefunds: 0,
    netSales: 0,
  };

  const ordersBreakdown = reports?.ordersBreakdown || {
    total: 0,
    delivered: 0,
    processing: 0,
    pending: 0,
    cancelled: 0,
    returned: 0,
  };

  const categorySales = reports?.categorySales || {};

  return (
    <div className="space-y-6">
      {/* Header with Export Options */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Sales Analytics &amp; Reports</h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Transparent breakdown of gross revenue, discounts, delivery fees, and data export
          </p>
        </div>

        {/* CSV Export Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            disabled={exporting !== null}
            onClick={() => handleExport('orders')}
            className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting === 'orders' ? 'Exporting...' : 'Export Orders CSV'}</span>
          </button>
          <button
            disabled={exporting !== null}
            onClick={() => handleExport('products')}
            className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting === 'products' ? 'Exporting...' : 'Export Products CSV'}</span>
          </button>
        </div>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Gross Sales */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Gross Sales</p>
          <p className="text-xl font-black text-neutral-900">
            ৳{financials.grossSales?.toLocaleString()}
          </p>
          <p className="text-[10px] text-neutral-400">Total product list pricing</p>
        </div>

        {/* Discounts Given */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Discounts Given</p>
          <p className="text-xl font-black text-emerald-600">
            -৳{financials.totalDiscounts?.toLocaleString()}
          </p>
          <p className="text-[10px] text-neutral-400">Promotions &amp; coupon deductions</p>
        </div>

        {/* Delivery Charges */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Delivery Collected</p>
          <p className="text-xl font-black text-neutral-900">
            +৳{financials.totalDeliveryFees?.toLocaleString()}
          </p>
          <p className="text-[10px] text-neutral-400">Dhaka &amp; Nationwide shipping</p>
        </div>

        {/* Refunds / Returned */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-1">
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Refunds / Returned</p>
          <p className="text-xl font-black text-rose-600">
            -৳{financials.totalRefunds?.toLocaleString()}
          </p>
          <p className="text-[10px] text-neutral-400">Returned or refunded orders</p>
        </div>

        {/* Net Sales */}
        <div className="bg-neutral-900 text-white rounded-2xl p-4 shadow-md space-y-1">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Net Realized Sales</p>
          <p className="text-2xl font-black text-white">
            ৳{financials.netSales?.toLocaleString()}
          </p>
          <p className="text-[10px] text-neutral-400">Completed &amp; confirmed volume</p>
        </div>
      </div>

      {/* Grid: Category Breakdown + Orders Lifecycle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown Card */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-neutral-900">Sales by Category</h3>
              <p className="text-xs text-neutral-400 font-medium">Distribution across apparel types</p>
            </div>
            <PieChart className="w-5 h-5 text-neutral-400" />
          </div>

          <div className="space-y-3 pt-2">
            {Object.keys(categorySales).length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">No category sales recorded yet.</p>
            ) : (
              Object.entries(categorySales).map(([cat, data]: [string, any]) => {
                const totalRev = financials.grossSales || 1;
                const pct = Math.min(100, Math.round((data.revenue / totalRev) * 100));
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-neutral-800">{cat}</span>
                      <span className="font-black text-neutral-900">
                        ৳{data.revenue?.toLocaleString()} ({data.count} pcs)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-black transition-all duration-500"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Orders Status Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-neutral-900">Orders Status Distribution</h3>
            <p className="text-xs text-neutral-400 font-medium">Current state of {ordersBreakdown.total} total orders</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
              <p className="text-emerald-700 font-bold uppercase text-[10px]">Delivered</p>
              <p className="text-xl font-black text-emerald-900 mt-1">{ordersBreakdown.delivered}</p>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
              <p className="text-blue-700 font-bold uppercase text-[10px]">Processing / Shipped</p>
              <p className="text-xl font-black text-blue-900 mt-1">{ordersBreakdown.processing}</p>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl">
              <p className="text-amber-700 font-bold uppercase text-[10px]">Pending New Orders</p>
              <p className="text-xl font-black text-amber-900 mt-1">{ordersBreakdown.pending}</p>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-2xl">
              <p className="text-rose-700 font-bold uppercase text-[10px]">Cancelled / Returned</p>
              <p className="text-xl font-black text-rose-900 mt-1">{ordersBreakdown.cancelled + ordersBreakdown.returned}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

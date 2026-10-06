import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  Save,
  SlidersHorizontal
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminInventory: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null);
  const [editingStockMap, setEditingStockMap] = useState<Record<string, number>>({});

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetInventory();
      if (res.success) {
        setItems(res.items || []);
        setLowStockThreshold(res.lowStockThreshold || 10);
        const stockMap: Record<string, number> = {};
        res.items?.forEach((it: any) => {
          stockMap[it.variantId] = it.currentStock;
        });
        setEditingStockMap(stockMap);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleStockChange = (variantId: string, val: number) => {
    setEditingStockMap((prev) => ({
      ...prev,
      [variantId]: Math.max(0, val),
    }));
  };

  const handleSaveStock = async (item: any) => {
    const newStock = editingStockMap[item.variantId];
    if (newStock === undefined) return;
    try {
      setUpdatingVariantId(item.variantId);
      const res = await api.adminAdjustStock(item.productId, item.variantId, newStock);
      if (res.success) {
        setItems((prev) =>
          prev.map((it) =>
            it.variantId === item.variantId
              ? {
                  ...it,
                  currentStock: newStock,
                  availableStock: Math.max(0, newStock - it.reservedStock),
                  isLowStock: newStock > 0 && newStock <= lowStockThreshold,
                  isOutOfStock: newStock <= 0,
                }
              : it
          )
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update stock');
    } finally {
      setUpdatingVariantId(null);
    }
  };

  const filteredItems = items.filter((it) => {
    if (filterTab === 'low' && !it.isLowStock) return false;
    if (filterTab === 'out' && !it.isOutOfStock) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        it.productName?.toLowerCase().includes(q) ||
        it.sku?.toLowerCase().includes(q) ||
        it.color?.toLowerCase().includes(q) ||
        it.size?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const lowStockCount = items.filter((it) => it.isLowStock).length;
  const outOfStockCount = items.filter((it) => it.isOutOfStock).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Variant Inventory Matrix</h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Real-time stock tracking by color &amp; size with automated low-stock warnings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
            <span className="font-semibold">Low-stock Alert Level: &lt; {lowStockThreshold} pcs</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-50'
            }`}
          >
            All Variants ({items.length})
          </button>

          <button
            onClick={() => setFilterTab('low')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'low'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-amber-700 border border-neutral-200/80 hover:bg-amber-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({lowStockCount})</span>
          </button>

          <button
            onClick={() => setFilterTab('out')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'out'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-700 border border-neutral-200/80 hover:bg-rose-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Out of Stock ({outOfStockCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search variant or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:outline-none focus:border-black w-full sm:w-64"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Variant (Color / Size)</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Reserved</th>
                <th className="py-3 px-4">Available</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    Loading inventory levels...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    No variants found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isDirty = editingStockMap[item.variantId] !== item.currentStock;
                  return (
                    <tr key={item.variantId} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-neutral-900">
                        {item.productName}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-neutral-800">
                          {item.color} / {item.size}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-neutral-900">
                        {item.currentStock} pcs
                      </td>
                      <td className="py-3 px-4 text-neutral-400 font-medium">
                        {item.reservedStock} pcs
                      </td>
                      <td className="py-3 px-4 font-black text-neutral-900">
                        {item.availableStock} pcs
                      </td>
                      <td className="py-3 px-4">
                        {item.isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                            Out of Stock
                          </span>
                        ) : item.isLowStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                            Low Stock Alert
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              handleStockChange(
                                item.variantId,
                                (editingStockMap[item.variantId] ?? item.currentStock) - 5
                              )
                            }
                            className="w-6 h-6 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center cursor-pointer font-bold text-xs"
                          >
                            -5
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={editingStockMap[item.variantId] ?? item.currentStock}
                            onChange={(e) => handleStockChange(item.variantId, Number(e.target.value))}
                            className="w-16 px-2 py-1 text-center bg-white border border-neutral-200 rounded-lg text-xs font-bold focus:outline-none focus:border-black"
                          />
                          <button
                            onClick={() =>
                              handleStockChange(
                                item.variantId,
                                (editingStockMap[item.variantId] ?? item.currentStock) + 10
                              )
                            }
                            className="w-6 h-6 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center cursor-pointer font-bold text-xs"
                          >
                            +10
                          </button>
                          {isDirty && (
                            <button
                              disabled={updatingVariantId === item.variantId}
                              onClick={() => handleSaveStock(item)}
                              className="px-2.5 py-1 bg-black text-white hover:bg-neutral-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ml-1 shadow-2xs"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

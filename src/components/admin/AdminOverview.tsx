import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  BarChart2,
  RotateCw,
  ShoppingBag,
  Activity,
  Bookmark,
  Package,
  Layers,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Database,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabaseClient';

interface AdminOverviewProps {
  onViewOrder: (orderId: string) => void;
  onViewProducts: () => void;
  onNavigateTab?: (tab: string, filter?: string) => void;
  currency?: '$' | '৳';
  onToggleCurrency?: () => void;
}

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sold: number;
  active: boolean;
  image: string;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ 
  onViewOrder, 
  onViewProducts,
  onNavigateTab,
  currency = '$',
  onToggleCurrency,
}) => {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [dashboardCategory, setDashboardCategory] = useState<string>('All Categories');
  const [dashboardMetric, setDashboardMetric] = useState<'Dashboard' | 'Net Sales' | 'Order Volume'>('Dashboard');
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Record<string, boolean>>({});
  
  // Real Supabase products list with fallback
  const [productList, setProductList] = useState<ProductItem[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Chart hover state
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(7);

  // Fetch data directly from Supabase and API
  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setIsRefreshing(true);

      // 1. Fetch live stats
      const statsRes = await api.adminGetStats('30d');
      if (statsRes.success) {
        setStats(statsRes);
      }

      // 2. Fetch products from Supabase products table
      const { data: supaProducts, error: prodErr } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          status,
          regular_price,
          sale_price,
          created_at,
          category:product_categories(name),
          variants:product_variants(id, stock, status),
          images:product_images(image_url, is_primary)
        `)
        .order('created_at', { ascending: false });

      if (!prodErr && supaProducts && supaProducts.length > 0) {
        const formatted: ProductItem[] = supaProducts.map((p: any, idx: number) => {
          const totalStock = (p.variants || []).reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
          const primaryImg = (p.images || []).find((img: any) => img.is_primary)?.image_url || p.images?.[0]?.image_url || '';
          const categoryName = p.category?.name || 'Apparel';
          const price = Number(p.sale_price || p.regular_price || 119.92);
          
          return {
            id: p.id,
            name: p.name,
            category: categoryName,
            price: price,
            stock: totalStock,
            sold: p.soldCount || 0,
            active: p.status === 'active',
            image: primaryImg || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80',
          };
        });
        setProductList(formatted);
      } else {
        // Fallback to API products
        const apiProdRes = await api.adminGetProducts();
        if (apiProdRes.success && apiProdRes.products) {
          const formatted: ProductItem[] = apiProdRes.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category || 'Apparel',
            price: Number(p.price || 0),
            stock: (p.colors || []).reduce((sum: number, c: any) => sum + (c.sizes?.reduce((sSum: number, s: any) => sSum + (s.stock || 0), 0) || 0), 0),
            sold: p.soldCount || 0,
            active: p.status !== 'archived' && p.status !== 'draft',
            image: p.images?.[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80',
          }));
          setProductList(formatted);
        }
      }
    } catch (err) {
      console.error('Error fetching Supabase dashboard data:', err);
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(false);

    // Supabase Realtime channel on orders & products
    const channel = supabase
      .channel('vizora-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDashboardData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchDashboardData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  // Handle toggling product active status directly in Supabase
  const handleToggleProductActive = async (productId: string, currentActive: boolean) => {
    const nextStatus = !currentActive;
    
    // Optimistic UI update
    setProductList((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, active: nextStatus } : item))
    );

    try {
      // 1. Direct Supabase update
      await supabase
        .from('products')
        .update({ status: nextStatus ? 'active' : 'draft', updated_at: new Date().toISOString() })
        .eq('id', productId);

      // 2. Also notify backend API
      await api.adminUpdateProduct(productId, { status: nextStatus ? 'active' : 'draft' });
    } catch (err) {
      console.error('Failed to update product active state in Supabase:', err);
    }
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    if (Object.keys(selectedProductIds).length === productList.length) {
      setSelectedProductIds({});
    } else {
      const all: Record<string, boolean> = {};
      productList.forEach((p) => {
        all[p.id] = true;
      });
      setSelectedProductIds(all);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedProductIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Formatter for Currency
  const formatMoney = (val: number) => {
    if (currency === '$') {
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    return `৳${Math.round(val).toLocaleString()}`;
  };

  // Filtered products list
  const filteredProducts = productList.filter((p) => {
    if (!searchProductQuery) return true;
    const q = searchProductQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  // Dynamic Dual Series Chart Points from real database stats
  const rawChartPoints = stats?.chart?.points || [];
  const chartPoints = rawChartPoints.length > 0
    ? rawChartPoints.map((pt: any) => ({
        label: pt.dateLabel,
        thisPeriod: currency === '$' ? (pt.revenue / 100) : pt.revenue,
        lastPeriod: 0,
        rawRevenue: pt.revenue || 0,
        transactions: pt.transactions || 0,
      }))
    : [
        { label: 'Day 1', thisPeriod: 0, lastPeriod: 0, rawRevenue: 0, transactions: 0 },
        { label: 'Day 2', thisPeriod: 0, lastPeriod: 0, rawRevenue: 0, transactions: 0 },
        { label: 'Day 3', thisPeriod: 0, lastPeriod: 0, rawRevenue: 0, transactions: 0 },
        { label: 'Day 4', thisPeriod: 0, lastPeriod: 0, rawRevenue: 0, transactions: 0 },
        { label: 'Day 5', thisPeriod: 0, lastPeriod: 0, rawRevenue: 0, transactions: 0 },
        { label: 'Day 6', thisPeriod: 0, lastPeriod: 0, rawRevenue: 0, transactions: 0 },
        { label: 'Day 7', thisPeriod: 0, lastPeriod: 0, rawRevenue: 0, transactions: 0 },
      ];

  // SVG Chart Geometry
  const svgW = 720;
  const svgH = 260;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 30;
  const padBottom = 40;

  const minVal = 0;
  const calculatedMax = Math.max(...chartPoints.map((pt: any) => pt.thisPeriod));
  const maxVal = calculatedMax > 0 ? calculatedMax * 1.2 : 100;

  // Compute coordinates for This Period
  const thisCoords = chartPoints.map((pt: any, idx: number) => {
    const x = padLeft + (idx / (chartPoints.length - 1)) * (svgW - padLeft - padRight);
    const y = svgH - padBottom - ((pt.thisPeriod - minVal) / (maxVal - minVal)) * (svgH - padTop - padBottom);
    return { x, y, pt };
  });

  // Compute coordinates for Last Period
  const lastCoords = chartPoints.map((pt: any, idx: number) => {
    const x = padLeft + (idx / (chartPoints.length - 1)) * (svgW - padLeft - padRight);
    const y = svgH - padBottom - ((pt.lastPeriod - minVal) / (maxVal - minVal)) * (svgH - padTop - padBottom);
    return { x, y, pt };
  });

  // Create smooth Bezier curve for This Period
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const pathThisPeriod = createSmoothPath(thisCoords);
  const pathLastPeriod = createSmoothPath(lastCoords);

  // Area fill under This Period curve
  const areaThisPeriod = thisCoords.length > 0
    ? `${pathThisPeriod} L ${thisCoords[thisCoords.length - 1].x} ${svgH - padBottom} L ${thisCoords[0].x} ${svgH - padBottom} Z`
    : '';

  const activeHoverPoint = hoveredPointIndex !== null && chartPoints[hoveredPointIndex]
    ? {
        thisCoord: thisCoords[hoveredPointIndex],
        lastCoord: lastCoords[hoveredPointIndex],
        data: chartPoints[hoveredPointIndex],
      }
    : null;

  return (
    <div className="space-y-6">
      {/* 1. TOP 4 METRIC CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* CARD 1: NEW NET INCOME */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400">
                NEW NET INCOME
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <RotateCw className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl sm:text-[28px] font-black tracking-tight text-neutral-900 tabular-nums">
                {formatMoney(stats?.summary?.todaySales || 0)}
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                Live
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100/80 flex items-center justify-between text-xs text-neutral-400">
            <span>
              <strong className="text-neutral-700 font-medium">Real-time DB</strong> calculations
            </span>
            <button 
              onClick={() => onNavigateTab?.('reports')}
              className="p-1 hover:text-neutral-900 transition-colors cursor-pointer"
              title="View report"
            >
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* CARD 2: AVERAGE SALES */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400">
                AVERAGE SALES
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl sm:text-[28px] font-black tracking-tight text-neutral-900 tabular-nums">
                {formatMoney(stats?.summary?.completedOrdersCount ? Math.round((stats?.summary?.totalSales || 0) / stats.summary.completedOrdersCount) : 0)}
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                Avg/Order
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100/80 flex items-center justify-between text-xs text-neutral-400">
            <span>
              Based on <strong className="text-neutral-700 font-medium">{stats?.summary?.completedOrdersCount || 0} completed orders</strong>
            </span>
            <button 
              onClick={() => onNavigateTab?.('reports')}
              className="p-1 hover:text-neutral-900 transition-colors cursor-pointer"
              title="View report"
            >
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* CARD 3: TOTAL ORDER */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400">
                TOTAL ORDERS
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl sm:text-[28px] font-black tracking-tight text-neutral-900 tabular-nums">
                {(stats?.summary?.totalOrdersCount ?? stats?.summary?.completedOrdersCount ?? 0).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                Orders
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100/80 flex items-center justify-between text-xs text-neutral-400">
            <span>
              <strong className="text-neutral-700 font-medium">{stats?.summary?.newOrdersCount || 0} pending</strong> orders
            </span>
            <button 
              onClick={() => onNavigateTab?.('orders')}
              className="p-1 hover:text-neutral-900 transition-colors cursor-pointer"
              title="View orders"
            >
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* CARD 4: REGISTERED CUSTOMERS */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400">
                CUSTOMERS
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl sm:text-[28px] font-black tracking-tight text-neutral-900 tabular-nums">
                {(stats?.summary?.customersCount || 0).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                Active Users
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100/80 flex items-center justify-between text-xs text-neutral-400">
            <span>
              Real customer accounts
            </span>
            <button 
              onClick={() => onNavigateTab?.('customers')}
              className="p-1 hover:text-neutral-900 transition-colors cursor-pointer"
              title="View customers"
            >
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
            </button>
          </div>
        </div>

      </div>

      {/* 2. MIDDLE ROW (OVERALL SALES + CONVERSION RATE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT CARD: OVERALL SALES (Dual curve interactive chart) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            {/* Overall Sales Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400">
                  OVERALL SALES
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight tabular-nums">
                    {formatMoney(stats?.summary?.totalSales || 0)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    Total Gross
                  </span>
                </div>
              </div>

              <div className="w-9 h-9 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <Bookmark className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            {/* Filter controls row & Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-2 pb-2">
              <div className="flex items-center gap-2">
                {/* Metric dropdown */}
                <select
                  value={dashboardMetric}
                  onChange={(e) => setDashboardMetric(e.target.value as any)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer shadow-2xs"
                >
                  <option value="Dashboard">Dashboard</option>
                  <option value="Net Sales">Net Sales</option>
                  <option value="Order Volume">Order Volume</option>
                </select>

                {/* Category dropdown */}
                <select
                  value={dashboardCategory}
                  onChange={(e) => setDashboardCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer shadow-2xs"
                >
                  <option value="All Categories">All Categories</option>
                  <option value="T-Shirts">T-Shirts</option>
                  <option value="Printed T-Shirts">Printed T-Shirts</option>
                  <option value="Hoodies">Hoodies</option>
                  <option value="Custom T-Shirts">Custom T-Shirts</option>
                  <option value="Wholesale">Wholesale</option>
                </select>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981]" />
                  <span>This Period</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#2dd4bf]" />
                  <span>Last Period</span>
                </div>
              </div>
            </div>

            {/* Interactive SVG Line Chart */}
            <div className="relative mt-4 h-64 sm:h-72 w-full select-none">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Subtle mint/emerald gradient under This Period */}
                  <linearGradient id="vizoraMintGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Gridlines & Labels */}
                {[
                  { val: 25, label: '$25k' },
                  { val: 20, label: '$20k' },
                  { val: 15, label: '$15k' },
                  { val: 10, label: '$10k' },
                ].map((item, i) => {
                  const y = svgH - padBottom - ((item.val - minVal) / (maxVal - minVal)) * (svgH - padTop - padBottom);
                  return (
                    <g key={i}>
                      <text
                        x={padLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="text-[11px] font-semibold fill-neutral-400"
                      >
                        {currency === '$' ? item.label : `৳${item.val * 1.2}L`}
                      </text>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgW - padRight}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}

                {/* Area Fill for This Period */}
                {areaThisPeriod && <path d={areaThisPeriod} fill="url(#vizoraMintGrad)" />}

                {/* Curve 2: Last Period (Teal line) */}
                {pathLastPeriod && (
                  <path
                    d={pathLastPeriod}
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Curve 1: This Period (Mint Green bold line) */}
                {pathThisPeriod && (
                  <path
                    d={pathThisPeriod}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Vertical Cursor Guideline if hovered */}
                {activeHoverPoint && (
                  <line
                    x1={activeHoverPoint.thisCoord.x}
                    y1={padTop}
                    x2={activeHoverPoint.thisCoord.x}
                    y2={svgH - padBottom}
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />
                )}

                {/* Data point indicators */}
                {chartPoints.map((_: any, idx: number) => {
                  const isHovered = hoveredPointIndex === idx;
                  const thisPt = thisCoords[idx];
                  const lastPt = lastCoords[idx];

                  return (
                    <g key={idx}>
                      {isHovered && (
                        <>
                          {/* Outer pulse circles */}
                          <circle
                            cx={thisPt.x}
                            cy={thisPt.y}
                            r={7}
                            fill="#10b981"
                            opacity={0.3}
                          />
                          <circle
                            cx={thisPt.x}
                            cy={thisPt.y}
                            r={4}
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                          <circle
                            cx={lastPt.x}
                            cy={lastPt.y}
                            r={4}
                            fill="#2dd4bf"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        </>
                      )}

                      {/* Invisible hover hitbox */}
                      <rect
                        x={thisPt.x - 16}
                        y={0}
                        width={32}
                        height={svgH}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Floating Tooltip Card matching the screenshot */}
              {activeHoverPoint && (
                <div
                  className="absolute pointer-events-none transform -translate-x-1/2 bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-xl shadow-lg border border-neutral-100 z-20 text-left min-w-36 transition-all duration-150"
                  style={{
                    top: '12%',
                    left: `${Math.min(88, Math.max(16, (activeHoverPoint.thisCoord.x / svgW) * 100))}%`,
                  }}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                    NET SALES
                  </p>
                  <div className="space-y-1 text-xs font-semibold">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                        <span className="text-neutral-900 font-bold tabular-nums">
                          {currency === '$' ? `$${activeHoverPoint.data.thisPeriod}k` : `৳${Math.round(activeHoverPoint.data.thisPeriod * 120)}k`}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400">{activeHoverPoint.data.label}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#2dd4bf]" />
                        <span className="text-neutral-500 font-medium tabular-nums">
                          {currency === '$' ? `$${activeHoverPoint.data.lastPeriod}k` : `৳${Math.round(activeHoverPoint.data.lastPeriod * 120)}k`}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400">{activeHoverPoint.data.label}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* X-Axis dates */}
              <div className="flex items-center justify-between px-3 text-[11px] font-semibold text-neutral-400">
                <span>Aug 01, 2024</span>
                <span className="hidden sm:inline">Aug 12, 2024</span>
                <span className="hidden md:inline">Aug 21, 2024</span>
                <span>Aug 32, 2024</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: CONVERSION RATE & FUNNEL */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400">
                  CONVERSION RATE
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight tabular-nums">
                    {stats?.summary?.completedOrdersCount && (stats?.summary?.totalOrdersCount || stats?.summary?.completedOrdersCount)
                      ? `${(((stats.summary.completedOrdersCount) / (stats.summary.totalOrdersCount || stats.summary.completedOrdersCount)) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    Live Ratio
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            {/* Funnel breakdown items */}
            <div className="mt-8 space-y-5">
              
              {/* Item 1: Catalog Products */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-neutral-700">Catalog Products</span>
                  <span className="text-neutral-900 font-bold tabular-nums">{stats?.summary?.totalProducts || 0}</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Active Products</div>
                <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-[#10b981] h-full rounded-full" style={{ width: (stats?.summary?.totalProducts ? '100%' : '0%') }} />
                </div>
              </div>

              {/* Item 2: Pending Orders */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-neutral-700">Pending Checkout Orders</span>
                  <span className="text-neutral-900 font-bold tabular-nums">{stats?.summary?.newOrdersCount || 0}</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Orders in Queue</div>
                <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-[#10b981] h-full rounded-full" style={{ width: (stats?.summary?.newOrdersCount ? '60%' : '0%') }} />
                </div>
              </div>

              {/* Item 3: Completed Purchases */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-neutral-700">Completed Purchases</span>
                  <span className="text-neutral-900 font-bold tabular-nums">{stats?.summary?.completedOrdersCount || 0}</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Delivered Orders</div>
                <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-[#10b981] h-full rounded-full" style={{ width: (stats?.summary?.completedOrdersCount ? '100%' : '0%') }} />
                </div>
              </div>

            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 mt-6 flex items-center justify-between text-xs text-neutral-400">
            <span>High conversion rate this period</span>
            <span className="text-emerald-600 font-bold">● Healthy</span>
          </div>
        </div>

      </div>

      {/* 3. BOTTOM ROW (UPGRADE / PREMIUM PLAN + PRODUCT LIST) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* BOTTOM LEFT: UPGRADE / PREMIUM PLAN (Supabase Live Cloud) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-neutral-400">
                  UPGRADE
                </span>
                <h3 className="text-lg font-black text-neutral-900 mt-0.5">
                  Premium Plan
                </h3>
              </div>

              <button
                onClick={() => {
                  fetchDashboardData(false);
                }}
                className="px-4 py-1.5 bg-[#0d2822] hover:bg-[#123830] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
              >
                Upgrade
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-neutral-500 font-medium leading-relaxed mt-4">
              Supercharge your sales management and unlock your full potential for extraordinary success.
            </p>

            {/* Supabase Connection Banner */}
            <div className="mt-5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-bold text-neutral-900 truncate">Supabase DB Connected</p>
                </div>
                <p className="text-[10px] text-neutral-500 truncate">dxgsuxbvhebymyuesdbm.supabase.co</p>
              </div>
            </div>
          </div>

          {/* Footer mini stats */}
          <div className="mt-6 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Performance</span>
              <div className="flex items-center gap-1 text-sm font-black text-neutral-900 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>79%</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Tools</span>
              <div className="flex items-center gap-1 text-sm font-black text-neutral-900 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>30+</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM RIGHT: PRODUCT LIST TABLE */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-neutral-400">
                  PRODUCT LIST
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-lg font-black text-neutral-900 tabular-nums">
                    {filteredProducts.length}
                  </h3>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                    Catalog
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <Package className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            {/* Search and Refresh bar */}
            <div className="flex items-center justify-between gap-3 mt-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-neutral-50/80 border border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <button
                onClick={() => {
                  fetchDashboardData(false);
                }}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition-colors cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Product Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 text-[11px] font-semibold">
                    <th className="py-2.5 px-2 w-7">
                      <button
                        onClick={handleToggleSelectAll}
                        className="cursor-pointer text-neutral-300 hover:text-neutral-600"
                      >
                        {Object.keys(selectedProductIds).length === productList.length && productList.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-2 font-medium">Product Info</th>
                    <th className="py-2.5 px-3 font-medium">Price</th>
                    <th className="py-2.5 px-3 font-medium">Stock</th>
                    <th className="py-2.5 px-3 font-medium">Sold</th>
                    <th className="py-2.5 px-2 font-medium text-right">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 font-medium">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                        No products match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.slice(0, 5).map((prod) => {
                      const isSelected = !!selectedProductIds[prod.id];

                      return (
                        <tr key={prod.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3 px-2">
                            <button
                              onClick={() => handleToggleSelectOne(prod.id)}
                              className="cursor-pointer text-neutral-300 hover:text-neutral-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Thumbnail + Name */}
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200/60 flex items-center justify-center">
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as any).src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=80';
                                  }}
                                />
                              </div>
                              <div className="min-w-0 max-w-44">
                                <p className="font-bold text-neutral-900 truncate">{prod.name}</p>
                                <p className="text-[10px] text-neutral-400 truncate">{prod.category}</p>
                              </div>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-3 px-3 font-semibold text-neutral-700 whitespace-nowrap tabular-nums">
                            {formatMoney(prod.price)}
                          </td>

                          {/* Stock */}
                          <td className="py-3 px-3 text-neutral-700 tabular-nums">
                            {prod.stock}
                          </td>

                          {/* Sold */}
                          <td className="py-3 px-3 text-neutral-700 tabular-nums">
                            {prod.sold}
                          </td>

                          {/* Active Toggle Switch */}
                          <td className="py-3 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleProductActive(prod.id, prod.active)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                prod.active ? 'bg-[#10b981]' : 'bg-neutral-300'
                              }`}
                              role="switch"
                              aria-checked={prod.active}
                              title={prod.active ? 'Click to deactivate' : 'Click to activate'}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  prod.active ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer link to manage all products */}
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
            <span>Showing top {Math.min(5, filteredProducts.length)} products</span>
            <button
              onClick={onViewProducts}
              className="font-bold text-neutral-900 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

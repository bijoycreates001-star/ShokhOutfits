// Direct Supabase-Connected API Service for Shokh Outfits
import { supabase, logSupabaseError, isSupabaseConfigured } from '../lib/supabaseClient';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLoginAt?: number;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  addresses: Array<{
    id: string;
    label: string;
    address: string;
    deliveryArea: 'dhaka' | 'outside';
    phone: string;
    isDefault: boolean;
  }>;
}

class ApiService {
  private adminToken: string | null = null;
  private customerToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.adminToken = window.localStorage.getItem('shokh_admin_token');
      this.customerToken = window.localStorage.getItem('shokh_customer_token');
    }
  }

  public setAdminToken(token: string | null) {
    this.adminToken = token;
    if (token) {
      localStorage.setItem('shokh_admin_token', token);
    } else {
      localStorage.removeItem('shokh_admin_token');
    }
  }

  public getAdminToken(): string | null {
    return this.adminToken;
  }

  public setCustomerToken(token: string | null) {
    this.customerToken = token;
    if (token) {
      localStorage.setItem('shokh_customer_token', token);
    } else {
      localStorage.removeItem('shokh_customer_token');
    }
  }

  public getCustomerToken(): string | null {
    return this.customerToken;
  }

  // --- ADMIN AUTH APIS ---
  public async adminLogin(email: string, password: string, rememberMe = true) {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const isDesignatedAdmin =
        (cleanEmail === 'sokhtshirt@gmail.com' && password === 'imtaslitimaz') ||
        ((cleanEmail === 'bijoycreates001@gmai.com' || cleanEmail === 'bijoycreates001@gmail.com') &&
        password === 'admin2027');

      // 1. Attempt standard Supabase Auth sign in
      let { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      // 2. If designated admin credentials and not yet in Supabase Auth, attempt auto-provision
      if (error && isDesignatedAdmin) {
        const signupRes = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: 'Administrator',
              role: 'admin',
            },
          },
        });

        if (signupRes.data?.user) {
          data = signupRes.data as any;
          error = null;
        }
      }

      // If still error but valid designated admin credentials, construct authenticated admin session
      if (error && isDesignatedAdmin) {
        // Also authenticate with backend Express server
        try {
          const srvRes = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password, rememberMe }),
          });
          const srvData = await srvRes.json();
          if (srvData?.token) {
            this.setAdminToken(srvData.token);
          }
        } catch {
          // ignore
        }

        const adminUser: AdminProfile = {
          id: cleanEmail === 'sokhtshirt@gmail.com' ? 'admin-sokh' : 'admin_bijoycreates001',
          email: cleanEmail,
          name: cleanEmail === 'sokhtshirt@gmail.com' ? 'Shokh Admin' : 'Administrator',
          role: 'admin',
          lastLoginAt: Date.now(),
        };

        const token = this.getAdminToken() || ('admin_session_' + Date.now());
        this.setAdminToken(token);

        // Attempt profile record creation in Supabase profiles
        try {
          await supabase
            .from('profiles')
            .upsert({
              id: adminUser.id,
              email: cleanEmail,
              full_name: adminUser.name,
              role: 'admin',
              updated_at: new Date().toISOString()
            }, { onConflict: 'email' });
        } catch {
          // ignore
        }

        return {
          success: true,
          admin: adminUser,
          token,
        };
      }

      if (error) {
        logSupabaseError('adminLogin', error);
        return { success: false, error: error.message };
      }

      if (!data?.user) {
        return { success: false, error: 'User not found in Supabase Auth.' };
      }

      // Check role in profiles table
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profErr) {
        logSupabaseError('adminLogin:fetchProfile', profErr);
      }

      const adminEmails = ['sokhtshirt@gmail.com', 'bijoycreates001@gmai.com', 'bijoycreates001@gmail.com'];
      const role = profile?.role || (adminEmails.includes(cleanEmail) ? 'admin' : 'customer');

      if (role !== 'admin' && !isDesignatedAdmin) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Access denied: This account does not have administrator privileges.',
        };
      }

      const adminUser: AdminProfile = {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        name: profile?.full_name || 'Administrator',
        role: 'admin',
        lastLoginAt: Date.now(),
      };

      const token = data.session?.access_token || 'supabase_session_active';
      this.setAdminToken(token);

      return {
        success: true,
        admin: adminUser,
        token,
      };
    } catch (err: any) {
      logSupabaseError('adminLogin:exception', err);
      return { success: false, error: err.message || 'Login failed.' };
    }
  }

  public async adminLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logSupabaseError('adminLogout', err);
    } finally {
      this.setAdminToken(null);
    }
  }

  public async adminGetMe() {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        return { success: false, error: 'No active Supabase user session.' };
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profErr) {
        logSupabaseError('adminGetMe:fetchProfile', profErr);
      }

      const adminEmails = ['sokhtshirt@gmail.com', 'bijoycreates001@gmai.com', 'bijoycreates001@gmail.com'];
      const role = profile?.role || (user.email && adminEmails.includes(user.email.toLowerCase()) ? 'admin' : 'customer');
      if (role !== 'admin') {
        return { success: false, error: 'Not an administrator.' };
      }

      return {
        success: true,
        admin: {
          id: user.id,
          email: user.email || '',
          name: profile?.full_name || 'Admin',
          role: 'admin',
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminChangePassword(currentPassword: string, newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        logSupabaseError('adminChangePassword', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- ADMIN NOTIFICATIONS & LOGS ---
  public async adminGetNotifications() {
    return { success: true, notifications: [], unreadCount: 0 };
  }

  public async adminMarkAllNotificationsRead() {
    return { success: true };
  }

  public async adminGetActivityLogs() {
    try {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logSupabaseError('adminGetActivityLogs', error);
        return { success: false, error: error.message, logs: [] };
      }

      const logs = (data || []).map((l: any) => ({
        id: l.id,
        adminEmail: l.admin_email,
        adminName: l.admin_name,
        action: l.action,
        details: l.details,
        timestamp: new Date(l.created_at).getTime(),
      }));

      return { success: true, logs };
    } catch (err: any) {
      return { success: false, error: err.message, logs: [] };
    }
  }

  // --- ADMIN DASHBOARD & STATS (REAL SUPABASE DATA) ---
  public async adminGetStats(timeframe = '7d') {
    try {
      const [ordersRes, profilesRes, customRes, wholesaleRes, productsRes] = await Promise.all([
        supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, role, full_name, email, phone, created_at'),
        supabase.from('custom_orders').select('id, status, created_at, quantity'),
        supabase.from('wholesale_orders').select('id, status, created_at, total_amount'),
        supabase.from('products').select('id, name, sku, regular_price, sale_price, wholesale_price, status, category, product_images(image_url, is_primary), product_variants(id, sku, size, color, stock)'),
      ]);

      const allOrders = ordersRes.data || [];
      const allProducts = productsRes.data || [];
      const allProfiles = profilesRes.data || [];
      const registeredCustomers = allProfiles.filter((p: any) => p.role === 'customer' || !p.role || p.role === 'user');

      // Calculate distinct guest customers from orders who do not have a registered profile ID
      const registeredIds = new Set(registeredCustomers.map((p: any) => p.id));
      const guestPhoneEmailSet = new Set<string>();
      allOrders.forEach((o: any) => {
        if (!o.customer_id || !registeredIds.has(o.customer_id)) {
          const key = (o.phone || o.email || o.customer_name || '').trim().toLowerCase();
          if (key) guestPhoneEmailSet.add(key);
        }
      });
      const guestCustomersCount = guestPhoneEmailSet.size;
      const totalCustomersCount = registeredCustomers.length + guestCustomersCount;

      let daysCount = 7;
      if (timeframe === '1d') daysCount = 1;
      else if (timeframe === '7d') daysCount = 7;
      else if (timeframe === '30d') daysCount = 30;
      else if (timeframe === '3m' || timeframe === '16m') daysCount = 90;
      else if (timeframe === '1y' || timeframe === 'max') daysCount = 365;

      const now = Date.now();
      const cutoffTime = now - daysCount * 24 * 60 * 60 * 1000;
      const prevCutoffTime = cutoffTime - daysCount * 24 * 60 * 60 * 1000;

      // Filter orders within selected timeframe
      const currentPeriodOrders = daysCount >= 365 
        ? allOrders 
        : allOrders.filter((o) => new Date(o.created_at).getTime() >= cutoffTime);

      const prevPeriodOrders = allOrders.filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= prevCutoffTime && t < cutoffTime;
      });

      // Valid Active Sales Statuses:
      // Includes pending, confirmed, processing, shipped, delivered, completed.
      // Only cancelled and returned/refunded are excluded from total sales.
      const isCancelled = (status: string) => {
        const s = (status || '').toLowerCase();
        return s === 'cancelled' || s === 'canceled' || s === 'returned' || s === 'refunded';
      };

      const currentActiveOrders = currentPeriodOrders.filter((o) => !isCancelled(o.order_status));
      const prevActiveOrders = prevPeriodOrders.filter((o) => !isCancelled(o.order_status));

      // Total Gross Sales (all non-cancelled orders in period)
      const totalSales = currentActiveOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const previousSales = prevActiveOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      // Net Sales (confirmed, processing, shipped, delivered, completed)
      const netStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'completed'];
      const netOrders = currentPeriodOrders.filter((o) => netStatuses.includes((o.order_status || '').toLowerCase()));
      const netSales = netOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      const salesDiff = totalSales - previousSales;
      const salesGrowthPct = previousSales > 0 
        ? ((totalSales - previousSales) / previousSales) * 100 
        : (totalSales > 0 ? 100 : 0);

      // Order counts by status in current period
      const pendingOrders = currentPeriodOrders.filter((o) => (o.order_status || '').toLowerCase() === 'pending').length;
      const confirmedOrders = currentPeriodOrders.filter((o) => (o.order_status || '').toLowerCase() === 'confirmed').length;
      const processingOrders = currentPeriodOrders.filter((o) => (o.order_status || '').toLowerCase() === 'processing').length;
      const shippedOrders = currentPeriodOrders.filter((o) => (o.order_status || '').toLowerCase() === 'shipped').length;
      const deliveredOrders = currentPeriodOrders.filter((o) => (o.order_status || '').toLowerCase() === 'delivered').length;
      const cancelledOrders = currentPeriodOrders.filter((o) => isCancelled(o.order_status)).length;

      const completedOrdersCount = deliveredOrders + shippedOrders;

      // Start of Today Sales
      const nowDate = new Date();
      const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
      const todayActiveOrders = allOrders.filter((o) => {
        const isToday = new Date(o.created_at).getTime() >= startOfToday;
        return isToday && !isCancelled(o.order_status);
      });
      const todaySales = todayActiveOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const todayOrdersCount = todayActiveOrders.length;

      // Dynamic chart points based on timeframe interval count
      const numPoints = daysCount === 1 ? 12 : daysCount <= 7 ? 7 : daysCount <= 30 ? 15 : 12;
      const intervalMs = (daysCount * 24 * 60 * 60 * 1000) / numPoints;

      const chartPoints: any[] = [];
      for (let i = numPoints - 1; i >= 0; i--) {
        const pointEnd = now - i * intervalMs;
        const pointStart = pointEnd - intervalMs;
        const bucketOrders = allOrders.filter((o) => {
          const t = new Date(o.created_at).getTime();
          return t >= pointStart && t < pointEnd;
        });

        const bucketActiveOrders = bucketOrders.filter((o) => !isCancelled(o.order_status));
        const bucketRev = bucketActiveOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

        const dateLabel = daysCount === 1
          ? new Date(pointEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date(pointEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        const productsSoldInBucket = bucketActiveOrders.reduce((sum: number, o: any) => {
          return sum + (o.order_items?.reduce((iSum: number, item: any) => iSum + (item.quantity || 1), 0) || 1);
        }, 0);

        chartPoints.push({
          timestamp: pointEnd,
          date: dateLabel,
          dateLabel: new Date(pointEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          revenue: bucketRev,
          netRevenue: bucketActiveOrders.filter(o => netStatuses.includes((o.order_status || '').toLowerCase())).reduce((s, o) => s + (Number(o.total) || 0), 0),
          orders: bucketActiveOrders.length,
          transactions: bucketOrders.length,
          productsSold: productsSoldInBucket,
        });
      }

      // Products & Inventory metrics
      const activeProducts = allProducts.filter((p: any) => p.status !== 'archived');
      const totalProductsCount = activeProducts.length;

      let lowStockCount = 0;
      let outOfStockCount = 0;
      allProducts.forEach((p: any) => {
        const totalStock = (p.product_variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        if (totalStock === 0) {
          outOfStockCount++;
        } else if (totalStock <= 5) {
          lowStockCount++;
        }
      });

      // Calculate Real Top Products from order_items
      const productSalesMap = new Map<string, { id: string; name: string; soldCount: number; revenue: number; price: number; image: string; stock: number }>();

      allOrders.forEach((o: any) => {
        if (isCancelled(o.order_status)) return;
        (o.order_items || []).forEach((item: any) => {
          const pId = item.product_id || item.product_name_snapshot || 'item';
          const pName = item.product_name_snapshot || 'Product';
          const qty = Number(item.quantity) || 1;
          const price = Number(item.unit_price || item.final_price) || 0;
          const img = item.image_snapshot || '';

          if (!productSalesMap.has(pId)) {
            const matchProd = allProducts.find((p: any) => p.id === pId || p.name === pName);
            const stock = matchProd?.product_variants?.reduce((s: number, v: any) => s + (v.stock || 0), 0) || 0;

            productSalesMap.set(pId, {
              id: pId,
              name: pName,
              soldCount: qty,
              revenue: qty * price,
              price: price,
              image: img || (matchProd?.product_images?.[0]?.image_url || ''),
              stock,
            });
          } else {
            const existing = productSalesMap.get(pId)!;
            existing.soldCount += qty;
            existing.revenue += qty * price;
            if (!existing.image && img) existing.image = img;
          }
        });
      });

      let topProductsList = Array.from(productSalesMap.values()).sort((a, b) => b.soldCount - a.soldCount);

      // Fallback to active catalog products if no sales yet
      if (topProductsList.length === 0) {
        topProductsList = activeProducts.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.name,
          soldCount: 0,
          revenue: 0,
          price: Number(p.sale_price || p.regular_price) || 0,
          stock: (p.product_variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0),
          image: (p.product_images || []).find((i: any) => i.is_primary)?.image_url || p.product_images?.[0]?.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
        }));
      }

      const totalUnitsSold = topProductsList.reduce((sum, p) => sum + p.soldCount, 0);

      const summary = {
        totalProducts: totalProductsCount,
        completedOrdersCount: completedOrdersCount,
        canceledOrdersCount: cancelledOrders,
        topProductsSold: totalUnitsSold || currentPeriodOrders.length,
        totalOrders: currentPeriodOrders.length,
        totalSales,
        netSales,
        todaySales,
        todayOrdersCount,
        salesDiff,
        salesGrowthPct,
        newOrdersCount: pendingOrders,
        totalRevenue: totalSales,
        todayRevenue: todaySales,
        totalCustomers: totalCustomersCount,
        registeredCustomersCount: registeredCustomers.length,
        guestCustomersCount,
        pendingCount: pendingOrders,
        confirmedCount: confirmedOrders,
        processingCount: processingOrders,
        shippedCount: shippedOrders,
        deliveredCount: deliveredOrders,
        cancelledCount: cancelledOrders,
        wholesaleCount: wholesaleRes.data?.length || 0,
        customCount: customRes.data?.length || 0,
        lowStockCount,
        outOfStockCount,
      };

      const stats = {
        totalOrders: currentPeriodOrders.length,
        newOrders: pendingOrders,
        totalSales,
        netSales,
        todaySales,
        todayOrdersCount,
        monthlySales: totalSales,
        totalCustomers: totalCustomersCount,
        registeredCustomers: registeredCustomers.length,
        guestCustomers: guestCustomersCount,
        wholesaleOrdersCount: wholesaleRes.data?.length || 0,
        customOrdersCount: customRes.data?.length || 0,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        lowStockProducts: lowStockCount,
        outOfStockProducts: outOfStockCount,
      };

      // Formatted Recent Orders for Last Transaction Table
      const recentOrders = currentPeriodOrders.slice(0, 15).map((o: any) => {
        const firstItem = o.order_items?.[0];
        const extraCount = (o.order_items?.length || 1) - 1;
        const itemDesc = firstItem
          ? `${firstItem.product_name_snapshot || 'Item'}${extraCount > 0 ? ` +${extraCount} more` : ''}`
          : 'Apparel Order';

        const orderDate = new Date(o.created_at);
        const formattedDate = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}`;
        const formattedTime = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let platform = 'Online store';
        if (o.order_type === 'wholesale') platform = 'Wholesale B2B';
        else if (o.order_type === 'custom') platform = 'Custom Studio';
        else if (o.channel) platform = o.channel === 'online_store' ? 'Online store' : o.channel;

        return {
          id: o.id,
          orderNumber: o.order_number || `#ORD-${o.id.slice(0, 6)}`,
          customerName: o.customer_name || 'Customer',
          customerPhone: o.phone || '',
          itemDescription: itemDesc,
          itemsCount: (o.order_items || []).reduce((s: number, it: any) => s + (it.quantity || 1), 0),
          date: formattedDate,
          time: formattedTime,
          rawDate: o.created_at,
          total: Number(o.total) || 0,
          price: Number(o.total) || 0,
          platform: platform,
          status: o.order_status || 'pending',
          paymentStatus: o.payment_status || 'pending',
          paymentMethod: o.payment_method || 'cod',
          createdAt: new Date(o.created_at).getTime(),
        };
      });

      return {
        success: true,
        stats,
        summary,
        topProducts: topProductsList,
        chart: { points: chartPoints },
        recentOrders,
      };
    } catch (err: any) {
      logSupabaseError('adminGetStats', err);
      return { success: false, error: err.message };
    }
  }

  public async adminGetReports(timeframe = '30d') {
    try {
      const ordersRes = await supabase.from('orders').select('*');
      const orders = ordersRes.data || [];
      const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const totalCOGS = Math.round(totalRevenue * 0.45);
      const grossProfit = totalRevenue - totalCOGS;

      return {
        success: true,
        financials: {
          totalRevenue,
          grossProfit,
          netProfit: Math.round(grossProfit * 0.75),
          averageOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
        },
        topProducts: [],
        channelBreakdown: [
          { channel: 'Online Store', count: orders.length, revenue: totalRevenue },
        ],
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminExportCsv(type: 'orders' | 'products' | 'customers', statusFilter?: string) {
    let csvContent = '';
    if (type === 'orders') {
      const { data } = await supabase.from('orders').select('*');
      const rows = (data || []).map((o) => [
        o.order_number,
        `"${o.customer_name}"`,
        o.phone,
        `"${o.email || ''}"`,
        o.subtotal,
        o.delivery_charge,
        o.total,
        o.order_status,
        o.payment_status,
        o.created_at,
      ]);
      csvContent = 'Order Number,Customer Name,Phone,Email,Subtotal,Delivery,Total,Order Status,Payment Status,Date\n' +
        rows.map((r) => r.join(',')).join('\n');
    } else if (type === 'products') {
      const { data } = await supabase.from('products').select('*');
      const rows = (data || []).map((p) => [
        p.sku,
        `"${p.name}"`,
        p.product_type,
        p.regular_price,
        p.sale_price,
        p.status,
      ]);
      csvContent = 'SKU,Name,Type,Regular Price,Sale Price,Status\n' +
        rows.map((r) => r.join(',')).join('\n');
    } else {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'customer');
      const rows = (data || []).map((c) => [
        c.id,
        `"${c.full_name}"`,
        c.email || '',
        c.phone || '',
        c.created_at,
      ]);
      csvContent = 'ID,Full Name,Email,Phone,Joined Date\n' +
        rows.map((r) => r.join(',')).join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shokh_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // --- ADMIN ORDERS ---
  public async adminGetOrders(params: { status?: string; type?: string; search?: string; page?: number; limit?: number } = {}) {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (params.status && params.status !== 'all') {
        query = query.eq('order_status', params.status);
      }
      if (params.type && params.type !== 'all') {
        query = query.eq('order_type', params.type);
      }
      if (params.search) {
        query = query.or(`order_number.ilike.%${params.search}%,customer_name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
      }

      const { data, error } = await query;
      if (error) {
        logSupabaseError('adminGetOrders', error);
        return { success: false, error: error.message, orders: [] };
      }

      const mappedOrders = (data || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerId: o.customer_id,
        customer: {
          fullName: o.customer_name,
          phone: o.phone,
          email: o.email,
          address: o.address_information,
          deliveryArea: o.delivery_area,
        },
        orderType: o.order_type,
        items: (o.order_items || []).map((it: any) => ({
          productId: it.product_id,
          productName: it.product_name_snapshot,
          sku: it.sku_snapshot,
          variant: { color: it.color, size: it.size },
          quantity: it.quantity,
          unitPrice: Number(it.unit_price),
          discount: Number(it.discount),
          finalPrice: Number(it.final_price),
          image: it.image_snapshot,
          customDesignUrl: it.custom_design_url,
        })),
        itemsCount: (o.order_items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
        subtotal: Number(o.subtotal),
        discountAmount: Number(o.discount_amount),
        couponCode: o.coupon_code,
        deliveryFee: Number(o.delivery_charge),
        total: Number(o.total),
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        customerNotes: o.customer_note,
        adminNotes: o.admin_note,
        trackingNumber: o.tracking_number,
        createdAt: new Date(o.created_at).getTime(),
        updatedAt: new Date(o.updated_at).getTime(),
      }));

      return {
        success: true,
        orders: mappedOrders,
        total: mappedOrders.length,
      };
    } catch (err: any) {
      logSupabaseError('adminGetOrders', err);
      return { success: false, error: err.message, orders: [] };
    }
  }

  public async adminGetOrder(id: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .or(`id.eq.${id},order_number.eq.${id}`)
        .single();

      if (error) {
        logSupabaseError('adminGetOrder', error);
        return { success: false, error: error.message };
      }
      return { success: true, order: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminUpdateOrderStatus(id: string, status: string, note?: string) {
    try {
      const updates: any = {
        order_status: status,
        updated_at: new Date().toISOString(),
      };
      if (note) {
        updates.admin_note = note;
      }
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .or(`id.eq.${id},order_number.eq.${id}`);

      if (error) {
        logSupabaseError('adminUpdateOrderStatus', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminUpdateOrderTracking(id: string, trackingNumber: string, courierNote?: string) {
    try {
      const updates: any = {
        tracking_number: trackingNumber,
        updated_at: new Date().toISOString(),
      };
      if (courierNote) {
        updates.admin_note = courierNote;
      }
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .or(`id.eq.${id},order_number.eq.${id}`);

      if (error) {
        logSupabaseError('adminUpdateOrderTracking', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- ADMIN PRODUCTS ---
  public async adminGetProducts(params: { type?: string; status?: string; search?: string } = {}) {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          product_categories (id, name, slug),
          product_images (*),
          product_variants (*)
        `)
        .order('created_at', { ascending: false });

      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }
      if (params.type && params.type !== 'all') {
        query = query.eq('product_type', params.type);
      }
      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`);
      }

      const { data, error } = await query;
      if (error) {
        logSupabaseError('adminGetProducts', error);
        return { success: false, error: error.message, products: [] };
      }

      const mapped = (data || [])
        .filter((p: any) => p && p.id)
        .map((p: any) => {
          const sortedImages = (p.product_images || []).sort((a: any, b: any) => ((a?.sort_order || 0) - (b?.sort_order || 0)));
          const rawPrimary = sortedImages.find((i: any) => i?.is_primary)?.image_url || sortedImages[0]?.image_url || '';
          const primaryImg = this.cleanDisplayImageUrl(rawPrimary);

          const galleryMap = new Map<string, { url: string; label: string }>();
          if (primaryImg) {
            galleryMap.set(primaryImg, { url: primaryImg, label: 'Front View' });
          }
          sortedImages.forEach((i: any) => {
            const url = this.cleanDisplayImageUrl(i?.image_url || i?.url || '');
            if (url && !galleryMap.has(url)) {
              galleryMap.set(url, { url, label: i?.alt_text || 'View' });
            }
          });
          const gallery = Array.from(galleryMap.values());
          if (gallery.length === 0) {
            gallery.push({ url: primaryImg, label: 'Front View' });
          }

          const validVariants = (p.product_variants || []).filter((v: any) => v && v.id);

          return {
            id: p.id,
            name: p.name || 'Untitled Product',
            category: p.product_categories?.name || 'T-Shirts',
            price: Number(p.sale_price || p.regular_price || 0),
            originalPrice: p.sale_price ? Number(p.regular_price) : undefined,
            wholesalePrice: p.wholesale_price ? Number(p.wholesale_price) : undefined,
            minWholesaleQty: p.min_wholesale_qty || 25,
            image: primaryImg,
            images: gallery,
            colors: Array.from(new Set(validVariants.map((v: any) => v.color).filter(Boolean))).map((cName) => {
              const match = validVariants.find((v: any) => v.color === cName);
              return { name: cName as string, hex: match?.color_hex || '#374151' };
            }),
            sizes: Array.from(new Set(validVariants.map((v: any) => v.size).filter(Boolean))),
            description: p.description || '',
            shortDescription: p.short_description || '',
            fabric: p.fabric || '100% Combed Cotton',
            gsm: p.gsm || '220 GSM',
            fit: p.fit || 'Regular Fit',
            badge: p.badge || undefined,
            sku: p.sku || '',
            brand: p.brand || 'Shokh Outfits',
            tags: p.tags || [],
            productType: p.product_type || 'normal',
            productTypes: p.product_types || [p.product_type || 'normal'],
            variants: validVariants.map((v: any) => ({
              id: v.id,
              sku: v.sku || '',
              color: v.color || '',
              size: v.size || '',
              stock: v.stock || 0,
              reserved: 0,
              priceOverride: v.price_override ? Number(v.price_override) : undefined,
            })),
            status: p.status || 'active',
            createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
            updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : Date.now(),
          };
        });

      return {
        success: true,
        products: mapped,
        total: mapped.length,
      };
    } catch (err: any) {
      logSupabaseError('adminGetProducts', err);
      return { success: false, error: err.message, products: [] };
    }
  }

  private async ensurePermanentProductImageUrl(inputUrl: string, fileName = 'product-image.png'): Promise<string> {
    const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
    if (!inputUrl) return DEFAULT_FALLBACK;

    // Clean existing URL if it has invalid host or viewer path
    let cleaned = inputUrl.trim();
    if (cleaned.includes('shokhoutfis.ai.studio')) {
      cleaned = cleaned.replace(/https?:\/\/shokhoutfis\.ai\.studio/, '');
    }
    if (cleaned.includes('/view-design/')) {
      cleaned = cleaned.replace('/view-design/', '/api/raw-design/');
    }

    if (!cleaned.startsWith('data:') && !cleaned.startsWith('blob:')) {
      return cleaned || DEFAULT_FALLBACK;
    }

    // 1. Try server persistent upload endpoint first (handles base64 cleanly and mirrors to Supabase storage)
    try {
      const uploadUrl = typeof window !== 'undefined' ? '/api/upload-custom-design' : 'http://127.0.0.1:3000/api/upload-custom-design';
      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `${Date.now()}_${fileName}`,
          fileType: 'image/png',
          fileData: cleaned,
          clientOrigin,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          const finalUrl = data.rawUrl || (data.viewUrl ? data.viewUrl.replace('/view-design/', '/api/raw-design/') : data.fileUrl);
          if (finalUrl) return finalUrl;
        }
      }
    } catch (e) {
      console.warn('Server upload endpoint warning, trying direct Supabase storage:', e);
    }

    // 2. Direct Supabase Storage 'product-images' upload fallback
    try {
      let blob: Blob | null = null;
      if (cleaned.startsWith('data:')) {
        const parts = cleaned.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else if (cleaned.startsWith('blob:')) {
        const response = await fetch(cleaned);
        blob = await response.blob();
      }

      if (blob) {
        const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const storagePath = `catalog/${Date.now()}_${cleanName}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(storagePath, blob, {
            contentType: blob.type || 'image/png',
            upsert: true,
            cacheControl: '31536000',
          });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(storagePath);

          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        }
      }
    } catch (storageErr) {
      console.warn('Direct Supabase storage upload notice:', storageErr);
    }

    return DEFAULT_FALLBACK;
  }

  public normalizeStringArray(val: any): string[] {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.map((v) => String(v).trim()).filter(Boolean);
    }
    if (typeof val === 'string') {
      let clean = val.trim();
      if (clean.startsWith('{') && clean.endsWith('}')) {
        clean = clean.slice(1, -1);
      }
      return clean
        .split(',')
        .map((s) => s.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean);
    }
    return [];
  }

  public async adminCreateProduct(productData: any) {
    try {
      // 1. Ensure category ID is valid or provision default in Supabase
      let { data: categories } = await supabase.from('product_categories').select('id, name');
      if (!categories || categories.length === 0) {
        const { data: newCat } = await supabase
          .from('product_categories')
          .insert({ name: 'T-Shirts', slug: 't-shirts', description: 'T-Shirts category' })
          .select();
        if (newCat && newCat.length > 0) {
          categories = newCat;
        }
      }

      const catMatch = (categories || []).find(
        (c) => c.name.toLowerCase() === (productData.category || '').toLowerCase()
      );
      let categoryId = catMatch?.id;

      if (!categoryId && productData.category) {
        try {
          const catSlug = (productData.category || 'category')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
          const { data: createdCat } = await supabase
            .from('product_categories')
            .insert({ name: productData.category, slug: catSlug, description: productData.category })
            .select('id')
            .single();
          if (createdCat?.id) {
            categoryId = createdCat.id;
          }
        } catch {}
      }

      if (!categoryId) {
        categoryId = (categories && categories[0]?.id) || null;
      }

      const slug = (productData.name || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

      const autoSku = productData.sku || `SHK-${(productData.category || 'TEE').slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      // 2. Convert base64 / blob URLs to permanent image URLs
      let primaryImage = productData.image || '';
      if (primaryImage.startsWith('data:') || primaryImage.startsWith('blob:')) {
        primaryImage = await this.ensurePermanentProductImageUrl(primaryImage, `${slug}-main.png`);
      }

      if (!primaryImage) {
        primaryImage = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
      }

      // Safely parse array fields to prevent PostgreSQL malformed array literal errors
      const tagsArray = this.normalizeStringArray(productData.tags);
      const rawProductTypes = this.normalizeStringArray(productData.productTypes);
      const finalProductTypes = rawProductTypes.length > 0 ? rawProductTypes : [productData.productType || 'normal'];

      let mainProductType = productData.productType || finalProductTypes[0] || 'normal';
      if (!['normal', 'printed', 'wholesale'].includes(mainProductType)) {
        mainProductType = 'normal';
      }

      // Insert product row into Supabase products table
      const { data: newProd, error: prodErr } = await supabase
        .from('products')
        .insert({
          name: productData.name,
          slug,
          description: productData.description || '',
          short_description: productData.shortDescription || null,
          sku: autoSku,
          category_id: categoryId,
          product_type: mainProductType,
          product_types: finalProductTypes,
          regular_price: Number(productData.originalPrice || productData.price) || 0,
          sale_price: Number(productData.price) || 0,
          wholesale_price: productData.wholesalePrice ? Number(productData.wholesalePrice) : null,
          min_wholesale_qty: productData.minWholesaleQty ? Number(productData.minWholesaleQty) : 25,
          status: productData.status || 'active',
          brand: productData.brand || 'Shokh Outfits',
          tags: tagsArray,
          badge: productData.badge || null,
          fabric: productData.fabric || '100% Combed Cotton',
          gsm: productData.gsm || '220 GSM',
          fit: productData.fit || 'Regular Fit',
        })
        .select()
        .single();

      if (prodErr || !newProd || !newProd?.id) {
        logSupabaseError('adminCreateProduct:products', prodErr);
        return { success: false, error: `Database Save Failed: ${prodErr?.message || 'Failed to create product record in database.'}` };
      }

      const productId = newProd.id;

      // 3. Insert primary and gallery images into product_images table
      const imagesToInsert: any[] = [];
      imagesToInsert.push({
        product_id: productId,
        image_url: primaryImage,
        sort_order: 0,
        is_primary: true,
        alt_text: newProd.name || productData.name || 'Product',
      });

      if (Array.isArray(productData.images)) {
        for (let idx = 0; idx < productData.images.length; idx++) {
          const rawImg = productData.images[idx];
          let url = typeof rawImg === 'string' ? rawImg : rawImg?.url;
          if (url && (url.startsWith('data:') || url.startsWith('blob:'))) {
            url = await this.ensurePermanentProductImageUrl(url, `${slug}-gallery-${idx}.png`);
          }
          if (url && url !== primaryImage) {
            imagesToInsert.push({
              product_id: productId,
              image_url: url,
              sort_order: idx + 1,
              is_primary: false,
              alt_text: newProd.name || productData.name || 'Product',
            });
          }
        }
      }

      if (imagesToInsert.length > 0) {
        const { error: imgErr } = await supabase.from('product_images').insert(imagesToInsert);
        if (imgErr) {
          logSupabaseError('adminCreateProduct:product_images', imgErr);
        }
      }

      // 4. Insert variants into product_variants table
      const colors = productData.colors?.length ? productData.colors : [{ name: 'Charcoal Gray', hex: '#374151' }];
      const sizes = productData.sizes?.length ? productData.sizes : ['S', 'M', 'L', 'XL'];
      const variantsToInsert: any[] = [];

      colors.forEach((col: any) => {
        const colName = typeof col === 'string' ? col : (col?.name || 'Standard');
        const colHex = typeof col === 'string' ? '#374151' : (col?.hex || '#374151');
        sizes.forEach((sz: any) => {
          const szName = typeof sz === 'string' ? sz : (sz?.name || 'M');
          const cleanCol = colName.replace(/[^a-zA-Z0-9]/g, '');
          const vSku = `${autoSku}-${cleanCol.slice(0, 2).toUpperCase()}-${szName}`;
          variantsToInsert.push({
            product_id: productId,
            sku: vSku,
            color: colName,
            color_hex: colHex,
            size: szName,
            stock: Number(productData.stock) || 25,
            status: 'active',
          });
        });
      });

      if (variantsToInsert.length > 0) {
        const { error: varErr } = await supabase.from('product_variants').insert(variantsToInsert);
        if (varErr) {
          logSupabaseError('adminCreateProduct:product_variants', varErr);
        }
      }

      // 5. Also sync to backend server Express routes for multi-layer redundancy
      try {
        const token = this.getAdminToken();
        if (token) {
          await fetch('/api/admin/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              ...productData,
              id: productId,
              sku: autoSku,
              image: primaryImage,
              images: imagesToInsert.map(i => ({ url: i.image_url })),
              productType: mainProductType,
              productTypes: finalProductTypes,
              tags: tagsArray,
            }),
          });
        }
      } catch {}

      return { success: true, product: newProd };
    } catch (err: any) {
      logSupabaseError('adminCreateProduct:catch', err);
      return { success: false, error: err.message || 'Product creation failed.' };
    }
  }

  public async adminUpdateProduct(id: string, updates: any) {
    try {
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name) payload.name = updates.name;
      if (updates.price !== undefined) payload.sale_price = Number(updates.price);
      if (updates.originalPrice !== undefined) payload.regular_price = Number(updates.originalPrice);
      if (updates.wholesalePrice !== undefined) payload.wholesale_price = updates.wholesalePrice ? Number(updates.wholesalePrice) : null;
      if (updates.minWholesaleQty !== undefined) payload.min_wholesale_qty = updates.minWholesaleQty ? Number(updates.minWholesaleQty) : 25;
      if (updates.status) payload.status = updates.status;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.shortDescription !== undefined) payload.short_description = updates.shortDescription;
      if (updates.badge !== undefined) payload.badge = updates.badge || null;
      if (updates.fabric !== undefined) payload.fabric = updates.fabric;
      if (updates.gsm !== undefined) payload.gsm = updates.gsm;
      if (updates.fit !== undefined) payload.fit = updates.fit;
      if (updates.brand !== undefined) payload.brand = updates.brand;

      if (updates.productType) {
        let pType = updates.productType;
        if (!['normal', 'printed', 'wholesale'].includes(pType)) {
          pType = 'normal';
        }
        payload.product_type = pType;
      }
      if (updates.productTypes !== undefined) {
        payload.product_types = this.normalizeStringArray(updates.productTypes);
      }
      if (updates.tags !== undefined) {
        payload.tags = this.normalizeStringArray(updates.tags);
      }

      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) {
        logSupabaseError('adminUpdateProduct', error);
        return { success: false, error: error.message };
      }

      // Update images if provided
      if (updates.image || Array.isArray(updates.images)) {
        let primaryImg = updates.image || '';
        if (primaryImg.startsWith('data:') || primaryImg.startsWith('blob:')) {
          primaryImg = await this.ensurePermanentProductImageUrl(primaryImg, `product-${id}-main.png`);
        }

        const imagesToInsert: any[] = [];
        if (primaryImg) {
          imagesToInsert.push({
            product_id: id,
            image_url: primaryImg,
            sort_order: 0,
            is_primary: true,
            alt_text: updates.name || 'Product Image',
          });
        }

        if (Array.isArray(updates.images)) {
          for (let idx = 0; idx < updates.images.length; idx++) {
            const rawImg = updates.images[idx];
            let url = typeof rawImg === 'string' ? rawImg : rawImg?.url;
            if (url && (url.startsWith('data:') || url.startsWith('blob:'))) {
              url = await this.ensurePermanentProductImageUrl(url, `product-${id}-gallery-${idx}.png`);
            }
            if (url && url !== primaryImg) {
              imagesToInsert.push({
                product_id: id,
                image_url: url,
                sort_order: idx + 1,
                is_primary: false,
                alt_text: updates.name || 'Product Image',
              });
            }
          }
        }

        if (imagesToInsert.length > 0) {
          await supabase.from('product_images').delete().eq('product_id', id);
          const { error: imgErr } = await supabase.from('product_images').insert(imagesToInsert);
          if (imgErr) {
            logSupabaseError('adminUpdateProduct:product_images', imgErr);
          }
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminArchiveProduct(id: string) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        logSupabaseError('adminArchiveProduct', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- ADMIN INVENTORY ---
  public async adminGetInventory() {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id,
          sku,
          color,
          size,
          stock,
          status,
          products (id, name, sku, status, category_id, product_categories(name))
        `)
        .order('sku', { ascending: true });

      if (error) {
        logSupabaseError('adminGetInventory', error);
        return { success: false, error: error.message, items: [], totalItems: 0, lowStockThreshold: 10 };
      }

      const items = (data || [])
        .filter((v: any) => v && v.id)
        .map((v: any) => ({
          variantId: v.id,
          productId: v.products?.id,
        productName: v.products?.name || 'Unnamed Product',
        category: v.products?.product_categories?.name || 'T-Shirts',
        sku: v.sku,
        color: v.color,
        size: v.size,
        stock: v.stock || 0,
        currentStock: v.stock || 0,
        reserved: 0,
        available: v.stock || 0,
        status: v.stock <= 0 ? 'out_of_stock' : v.stock <= 10 ? 'low_stock' : 'in_stock',
      }));

      return {
        success: true,
        items,
        totalItems: items.length,
        lowStockThreshold: 10,
      };
    } catch (err: any) {
      logSupabaseError('adminGetInventory', err);
      return { success: false, error: err.message, items: [], totalItems: 0, lowStockThreshold: 10 };
    }
  }

  public async adminAdjustStock(productId: string, variantId: string, newStock: number) {
    return this.adminUpdateStock(variantId, newStock);
  }

  public async adminUpdateStock(variantId: string, stock: number) {
    try {
      const safeStock = Math.max(0, Number(stock) || 0);
      const { error } = await supabase
        .from('product_variants')
        .update({ stock: safeStock, updated_at: new Date().toISOString() })
        .eq('id', variantId);

      if (error) {
        logSupabaseError('adminUpdateStock', error);
        return { success: false, error: error.message };
      }

      await supabase
        .from('inventory')
        .upsert({ variant_id: variantId, current_stock: safeStock, updated_at: new Date().toISOString() }, { onConflict: 'variant_id' });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- ADMIN CUSTOMERS ---
  public async adminGetCustomers() {
    try {
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('id, customer_id, total, created_at'),
      ]);

      if (profilesRes.error) {
        logSupabaseError('adminGetCustomers:profiles', profilesRes.error);
        return { success: false, error: profilesRes.error.message, customers: [], registered: [], guests: [], all: [] };
      }

      const allOrders = ordersRes.data || [];
      const customers = (profilesRes.data || [])
        .filter((p) => p.role === 'customer')
        .map((p) => {
          const custOrders = allOrders.filter((o) => o.customer_id === p.id);
          const totalSpent = custOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          return {
            id: p.id,
            fullName: p.full_name,
            email: p.email || '',
            phone: p.phone || '',
            addresses: [],
            totalOrders: custOrders.length,
            totalSpent,
            createdAt: new Date(p.created_at).getTime(),
            status: 'active',
          };
        });

      return {
        success: true,
        customers,
        registered: customers,
        guests: [],
        all: customers,
      };
    } catch (err: any) {
      return { success: false, error: err.message, customers: [], registered: [], guests: [], all: [] };
    }
  }

  public async adminGetCustomer(id: string) {
    try {
      const [profRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('orders').select('*, order_items(*)').eq('customer_id', id).order('created_at', { ascending: false }),
      ]);

      if (profRes.error) {
        return { success: false, error: profRes.error.message };
      }

      const p = profRes.data;
      const orders = ordersRes.data || [];
      const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      return {
        success: true,
        customer: {
          id: p.id,
          fullName: p.full_name,
          email: p.email || '',
          phone: p.phone || '',
          addresses: [],
          totalOrders: orders.length,
          totalSpent,
          createdAt: new Date(p.created_at).getTime(),
          orders: orders.map((o) => ({
            id: o.id,
            orderNumber: o.order_number,
            total: Number(o.total),
            status: o.order_status,
            createdAt: new Date(o.created_at).getTime(),
          })),
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- ADMIN DISCOUNTS & COUPONS ---
  public async adminGetDiscounts() {
    try {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) {
        logSupabaseError('adminGetDiscounts', error);
        return { success: false, error: error.message, coupons: [] };
      }
      const coupons = (data || []).map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discount_type,
        discountValue: Number(c.discount_value),
        minOrderAmount: Number(c.minimum_order_amount),
        maxDiscountAmount: c.maximum_discount_amount ? Number(c.maximum_discount_amount) : undefined,
        usageLimit: c.total_usage_limit,
        usageCount: c.total_usage_count || 0,
        status: c.is_active ? 'active' : 'inactive',
        startDate: c.start_date,
        endDate: c.expiry_date || '',
      }));
      return { success: true, coupons };
    } catch (err: any) {
      return { success: false, error: err.message, coupons: [] };
    }
  }

  public async adminGetCoupons() {
    return this.adminGetDiscounts();
  }

  public async adminCreateCoupon(data: any) {
    return this.adminCreateDiscount(data);
  }

  public async adminDeleteCoupon(id: string) {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) {
        logSupabaseError('adminDeleteCoupon', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminCreateDiscount(data: any) {
    try {
      const { data: created, error } = await supabase
        .from('coupons')
        .insert({
          code: data.code.toUpperCase().trim(),
          discount_type: data.discountType,
          discount_value: Number(data.discountValue),
          minimum_order_amount: Number(data.minOrderAmount || 0),
          maximum_discount_amount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null,
          total_usage_limit: Number(data.usageLimit || 500),
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        logSupabaseError('adminCreateDiscount', error);
        return { success: false, error: error.message };
      }
      return { success: true, coupon: created };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminToggleDiscount(id: string, status: 'active' | 'inactive') {
    try {
      const { error } = await supabase.from('coupons').update({ is_active: status === 'active' }).eq('id', id);
      if (error) {
        logSupabaseError('adminToggleDiscount', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- ADMIN CUSTOM ORDERS ---
  public async adminGetCustomOrders() {
    try {
      const { data, error } = await supabase.from('custom_orders').select('*').order('created_at', { ascending: false });
      if (error) {
        logSupabaseError('adminGetCustomOrders', error);
        return { success: false, error: error.message, customOrders: [] };
      }
      const customOrders = (data || []).map((c) => ({
        id: c.id,
        orderId: c.order_id,
        customerName: c.customer_name,
        phone: c.phone,
        email: c.email,
        productType: c.product_name,
        tshirtColor: c.tshirt_color,
        size: c.size,
        quantity: c.quantity,
        designUrl: c.uploaded_design_url,
        fileName: 'Customer Artwork',
        customerNotes: c.customer_note,
        whatsappStatus: c.whatsapp_status,
        orderStatus: c.status,
        orderMethod: c.order_method || (c.order_id ? 'Website Order' : 'WhatsApp Order'),
        orderDate: c.created_at,
        createdAt: new Date(c.created_at).getTime(),
      }));
      return { success: true, customOrders };
    } catch (err: any) {
      return { success: false, error: err.message, customOrders: [] };
    }
  }

  public async adminUpdateCustomOrderStatus(id: string, updates: any, maybeWhatsapp?: string) {
    try {
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (typeof updates === 'string') {
        payload.status = updates;
        if (maybeWhatsapp) payload.whatsapp_status = maybeWhatsapp;
      } else if (updates && typeof updates === 'object') {
        if (updates.orderStatus) payload.status = updates.orderStatus;
        if (updates.whatsappStatus) payload.whatsapp_status = updates.whatsappStatus;
        if (updates.status) payload.status = updates.status;
      }
      const { error } = await supabase.from('custom_orders').update(payload).eq('id', id);
      if (error) {
        logSupabaseError('adminUpdateCustomOrderStatus', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- ADMIN WHOLESALE ORDERS ---
  public async adminGetWholesaleOrders() {
    try {
      const { data, error } = await supabase.from('wholesale_orders').select('*').order('created_at', { ascending: false });
      if (error) {
        logSupabaseError('adminGetWholesaleOrders', error);
        return { success: false, error: error.message, wholesaleOrders: [] };
      }
      const wholesaleOrders = (data || []).map((w) => ({
        id: w.id,
        customerName: w.customer_name,
        phone: w.phone,
        email: w.email,
        companyName: w.company_name,
        productName: w.product_name,
        totalQuantity: w.total_quantity,
        matrix: w.matrix_json || [],
        sizeBreakdown: w.size_breakdown_json || {},
        colorBreakdown: w.color_breakdown_json || {},
        wholesaleUnitPrice: Number(w.wholesale_unit_price),
        totalAmount: Number(w.total_amount),
        customerNotes: w.customer_notes,
        status: w.status,
        createdAt: new Date(w.created_at).getTime(),
      }));
      return { success: true, wholesaleOrders };
    } catch (err: any) {
      return { success: false, error: err.message, wholesaleOrders: [] };
    }
  }

  public async adminUpdateWholesaleOrderStatus(id: string, status: string) {
    try {
      const { error } = await supabase
        .from('wholesale_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        logSupabaseError('adminUpdateWholesaleOrderStatus', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- ADMIN STORE SETTINGS ---
  public async adminGetSettings() {
    try {
      let data: any = null;
      let error: any = null;

      try {
        const supRes = await supabase.from('store_settings').select('*').limit(1).maybeSingle();
        data = supRes.data;
        error = supRes.error;
      } catch (err: any) {
        error = err;
      }

      if (error || !data) {
        // Fallback to Express backend
        const token = this.getAdminToken();
        const srvRes = await fetch('/api/admin/settings', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const srvData = await srvRes.json();
        if (srvData?.success && srvData.settings) {
          return { success: true, settings: srvData.settings };
        }
        if (error) logSupabaseError('adminGetSettings', error);
        return { success: false, error: error?.message || 'Failed to fetch settings' };
      }

      const settings = {
        businessName: data.business_name || 'Shokh Outfits',
        tagline: data.tagline || 'Minimalist Streetwear & Custom Garments',
        phone: data.phone || '+880 1346-068854',
        whatsapp: data.whatsapp || '+880 1346-068854',
        email: data.email || 'contact@shokhoutfits.com',
        address: data.address || 'Directly opposite Techno Showroom, Agamasi Lane, Kazi Alauddin Road, Nazira Bazar, Old Dhaka, Bangladesh',
        deliveryChargeInsideDhaka: Number(data.delivery_charge_inside_dhaka) || 70,
        deliveryChargeOutsideDhaka: Number(data.delivery_charge_outside_dhaka) || 130,
        freeDeliveryThreshold: Number(data.free_delivery_threshold) || 2500,
        lowStockThreshold: data.low_stock_threshold || 10,
        defaultMinWholesaleQty: data.default_min_wholesale_qty || 25,
        codEnabled: data.cod_enabled !== false,
        bkashEnabled: data.bkash_enabled !== false,
        bkashMerchantNumber: data.bkash_merchant_number || '01346068854',
        announcementText: data.announcement_text || 'Welcome to our store!',
        announcementActive: data.announcement_active !== false,
        metaPixelEnabled: data.meta_pixel_enabled !== false,
        metaPixelId: data.meta_pixel_id || '4455123488042747',
        metaAccessToken: data.meta_access_token || data.metaAccessToken || 'EAAMVeXfzl2YBSoLiAA7eeVpxBdtISYLgCez7LzTOtZBhf5dzar54xQSLQeoHROun6Bvz8bS53gRZC5ZB1KoIV6TAKBChwtBdMueEicCndm8faUolnbJpE9wSs2pzAhC3R1vmWDii88dlZCV3HMTEhAXXVCijsi2SzoVC3XDIrpU4fztGiA1rO9xaqxyafQZDZD',
        metaTestEventCode: data.meta_test_event_code || data.metaTestEventCode || 'TEST89137',
        metaCapiEnabled: data.meta_capi_enabled !== false,
      };
      return { success: true, settings };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminUpdateSettings(settings: any) {
    try {
      const payload: any = {
        business_name: settings.businessName,
        tagline: settings.tagline,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        email: settings.email,
        address: settings.address,
        delivery_charge_inside_dhaka: Number(settings.deliveryChargeInsideDhaka),
        delivery_charge_outside_dhaka: Number(settings.deliveryChargeOutsideDhaka),
        free_delivery_threshold: Number(settings.freeDeliveryThreshold),
        low_stock_threshold: Number(settings.lowStockThreshold),
        default_min_wholesale_qty: Number(settings.defaultMinWholesaleQty),
        cod_enabled: settings.codEnabled,
        bkash_enabled: settings.bkashEnabled,
        bkash_merchant_number: settings.bkashMerchantNumber,
        announcement_text: settings.announcementText,
        announcement_active: settings.announcementActive,
        meta_pixel_enabled: settings.metaPixelEnabled !== false,
        meta_pixel_id: settings.metaPixelId ? String(settings.metaPixelId).trim() : '4455123488042747',
        meta_access_token: settings.metaAccessToken || '',
        meta_test_event_code: settings.metaTestEventCode || '',
        meta_capi_enabled: settings.metaCapiEnabled !== false,
        updated_at: new Date().toISOString(),
      };

      // 1. Update Supabase if available
      try {
        await supabase.from('store_settings').upsert(payload);
      } catch (e) {
        // fallback
      }

      // 2. Also sync to backend Express server
      const token = this.getAdminToken();
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data?.success) {
        return { success: true, settings: data.settings };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async getPublicStoreSettings() {
    try {
      const res = await fetch('/api/store/settings');
      const data = await res.json();
      if (data?.success && data.settings) {
        return { success: true, settings: data.settings };
      }
    } catch {
      // fallback to direct supabase
      try {
        const { data } = await supabase.from('store_settings').select('*').limit(1).maybeSingle();
        if (data) {
          return {
            success: true,
            settings: {
              businessName: data.business_name,
              phone: data.phone,
              whatsapp: data.whatsapp,
              deliveryChargeInsideDhaka: Number(data.delivery_charge_inside_dhaka),
              deliveryChargeOutsideDhaka: Number(data.delivery_charge_outside_dhaka),
              freeDeliveryThreshold: Number(data.free_delivery_threshold),
              announcementText: data.announcement_text,
              announcementActive: data.announcement_active,
              codEnabled: data.cod_enabled,
              bkashEnabled: data.bkash_enabled,
              bkashMerchantNumber: data.bkash_merchant_number,
              metaPixelEnabled: data.meta_pixel_enabled !== false,
              metaPixelId: data.meta_pixel_id || '4455123488042747',
              metaAccessToken: data.meta_access_token || '',
              metaTestEventCode: data.meta_test_event_code || 'TEST89137',
              metaCapiEnabled: data.meta_capi_enabled !== false,
            }
          };
        }
      } catch {
        // ignore
      }
    }
    return {
      success: true,
      settings: {
        businessName: 'Shokh Outfits',
        phone: '+880 1346-068854',
        whatsapp: '+880 1346-068854',
        deliveryChargeInsideDhaka: 70,
        deliveryChargeOutsideDhaka: 130,
        freeDeliveryThreshold: 2500,
        announcementText: 'Welcome to our store!',
        announcementActive: true,
        codEnabled: true,
        bkashEnabled: true,
        bkashMerchantNumber: '01346068854',
        metaPixelEnabled: true,
        metaPixelId: '4455123488042747',
        metaAccessToken: 'EAAMVeXfzl2YBSoLiAA7eeVpxBdtISYLgCez7LzTOtZBhf5dzar54xQSLQeoHROun6Bvz8bS53gRZC5ZB1KoIV6TAKBChwtBdMueEicCndm8faUolnbJpE9wSs2pzAhC3R1vmWDii88dlZCV3HMTEhAXXVCijsi2SzoVC3XDIrpU4fztGiA1rO9xaqxyafQZDZD',
        metaTestEventCode: 'TEST89137',
        metaCapiEnabled: true,
      }
    };
  }

  // --- SEO MANAGEMENT ---
  public async adminGetSeoSettings() {
    try {
      const token = this.getAdminToken();
      const res = await fetch('/api/admin/seo-settings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminUpdateLandingSeo(seoPages: any) {
    try {
      const token = this.getAdminToken();
      const res = await fetch('/api/admin/seo-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ seoPages }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminUpdateProductSeo(productId: string, seoTitle: string, seoDescription: string, ogImage: string) {
    try {
      const token = this.getAdminToken();
      const res = await fetch(`/api/admin/products/${productId}/seo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ seoTitle, seoDescription, ogImage }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async adminResetAllStoreData() {
    try {
      // 1. Clear database tables in safe order
      try {
        await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('custom_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('wholesale_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('addresses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('product_images').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('admin_activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('profiles').delete().neq('role', 'admin').not('email', 'in', '("sokhtshirt@gmail.com","bijoycreates001@gmail.com")');
      } catch (dbErr) {
        console.warn('Database reset notice:', dbErr);
      }

      // 2. Clear local storage caches
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('shokh_cart');
          window.localStorage.removeItem('kala_shada_cart');
          window.localStorage.removeItem('shokh_supabase_products_v1');
          window.localStorage.removeItem('shokh_wishlist_ids');
          window.localStorage.removeItem('shokh_recent_searches_v1');
          window.localStorage.removeItem('shokh_customer_token');
          // Clear any product review caches
          Object.keys(window.localStorage).forEach((key) => {
            if (key.startsWith('shokh_reviews_')) {
              window.localStorage.removeItem(key);
            }
          });
        }
      } catch {
        // ignore
      }

      // 3. Clear server memory
      try {
        await fetch('/api/reset-data', { method: 'POST' });
      } catch {
        // ignore
      }

      return { success: true, message: 'All customer data, orders, products, and history removed. Store is reset like new.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Reset failed.' };
    }
  }

  // --- CUSTOMER AUTH APIS ---
  public async customerRegister(data: { fullName: string; email: string; phone: string; password: string; address?: string; deliveryArea?: string }) {
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const cleanName = data.fullName.trim();
      const cleanPhone = data.phone.trim();

      // 1. Create Supabase Auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            role: 'customer',
          },
        },
      });

      if (authErr) {
        logSupabaseError('customerRegister', authErr);
        return { success: false, error: authErr.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Registration failed to return user.' };
      }

      // 2. Ensure profile record in profiles table
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: 'customer',
        updated_at: new Date().toISOString(),
      });

      if (profErr) {
        logSupabaseError('customerRegister:profileUpsert', profErr);
      }

      // 3. Save initial address if provided
      let savedAddresses: any[] = [];
      if (data.address && data.address.trim()) {
        const { data: insertedAddr, error: addrErr } = await supabase.from('addresses').insert({
          customer_id: authData.user.id,
          full_name: cleanName,
          phone: cleanPhone,
          area: data.deliveryArea || 'dhaka',
          full_address: data.address.trim(),
          is_default: true,
        }).select().single();

        if (addrErr) {
          logSupabaseError('customerRegister:addressInsert', addrErr);
        } else if (insertedAddr) {
          savedAddresses.push({
            id: insertedAddr.id,
            label: 'Home Delivery',
            address: insertedAddr.full_address,
            deliveryArea: insertedAddr.area,
            phone: insertedAddr.phone,
            isDefault: true,
          });
        }
      }

      const isEmailConfirmationRequired = !authData.session;

      const customerProfile: CustomerProfile = {
        id: authData.user.id,
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        addresses: savedAddresses,
      };

      if (authData.session?.access_token) {
        this.setCustomerToken(authData.session.access_token);
      }

      return {
        success: true,
        customer: customerProfile,
        token: authData.session?.access_token || null,
        emailConfirmationRequired: isEmailConfirmationRequired,
      };
    } catch (err: any) {
      logSupabaseError('customerRegister:exception', err);
      return { success: false, error: err.message || 'Registration failed.' };
    }
  }

  public async customerLogin(identifier: string, password: string) {
    try {
      const cleanIdentifier = identifier.trim().toLowerCase();
      let emailToUse = cleanIdentifier;

      const isDesignatedAdmin =
        (cleanIdentifier === 'sokhtshirt@gmail.com' && password === 'imtaslitimaz') ||
        ((cleanIdentifier === 'bijoycreates001@gmai.com' || cleanIdentifier === 'bijoycreates001@gmail.com') &&
        password === 'admin2027');

      // If user typed a phone number, look up their associated email from profiles table
      if (!cleanIdentifier.includes('@')) {
        const { data: matchedProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('phone', cleanIdentifier)
          .maybeSingle();

        if (matchedProfile && matchedProfile.email) {
          emailToUse = matchedProfile.email.toLowerCase();
        } else {
          return {
            success: false,
            error: 'No account found matching this phone number. Please sign in with your email or click Register.',
          };
        }
      }

      // If logging in with designated admin credentials
      if (isDesignatedAdmin) {
        let { data, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });

        if (error) {
          // Attempt signup/provision if not in Auth
          const signupRes = await supabase.auth.signUp({
            email: emailToUse,
            password: password,
            options: {
              data: {
                full_name: 'Administrator',
                role: 'admin',
              },
            },
          });
          if (signupRes.data?.user) {
            data = signupRes.data as any;
            error = null;
          }
        }

        const adminUser: AdminProfile = {
          id: data?.user?.id || 'admin_bijoycreates001',
          email: emailToUse,
          name: 'Administrator',
          role: 'admin',
          lastLoginAt: Date.now(),
        };

        const customerProfile: CustomerProfile = {
          id: data?.user?.id || 'admin_bijoycreates001',
          fullName: 'Administrator',
          email: emailToUse,
          phone: '+8801346068854',
          addresses: [],
        };

        const token = data?.session?.access_token || 'admin_session_' + Date.now();
        this.setCustomerToken(token);
        this.setAdminToken(token);

        return {
          success: true,
          customer: customerProfile,
          admin: adminUser,
          token,
          adminToken: token,
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        let errMsg = error.message;
        if (error.code === 'invalid_credentials' || errMsg.toLowerCase().includes('invalid login credentials')) {
          errMsg = 'Invalid email or password. If you do not have an account yet, please click Register.';
        } else if (error.code === 'email_not_confirmed' || errMsg.toLowerCase().includes('email not confirmed')) {
          errMsg = 'Email not confirmed. Please check your inbox for the confirmation link or click Resend Confirmation Email below.';
        }
        return { success: false, error: errMsg };
      }

      if (!data.user) {
        return { success: false, error: 'User record not returned from Supabase Auth.' };
      }

      // Retrieve user profile
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profErr) {
        logSupabaseError('customerLogin:fetchProfile', profErr);
      }

      // Retrieve user addresses
      const { data: addrs } = await supabase
        .from('addresses')
        .select('*')
        .eq('customer_id', data.user.id)
        .order('is_default', { ascending: false });

      const mappedAddrs = (addrs || []).map((a) => ({
        id: a.id,
        label: a.area === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
        address: a.full_address,
        deliveryArea: (a.area as any) || 'dhaka',
        phone: a.phone,
        isDefault: a.is_default,
      }));

      const customerProfile: CustomerProfile = {
        id: data.user.id,
        fullName: profile?.full_name || data.user.user_metadata?.full_name || 'Customer',
        email: data.user.email || cleanIdentifier,
        phone: profile?.phone || data.user.user_metadata?.phone || '',
        addresses: mappedAddrs,
      };

      const token = data.session?.access_token || 'supabase_token_active';
      this.setCustomerToken(token);

      const adminEmails = ['sokhtshirt@gmail.com', 'bijoycreates001@gmai.com', 'bijoycreates001@gmail.com'];
      const role = profile?.role || (adminEmails.includes(cleanIdentifier) ? 'admin' : 'customer');
      let adminData: AdminProfile | null = null;
      if (role === 'admin') {
        adminData = {
          id: data.user.id,
          email: data.user.email || cleanIdentifier,
          name: profile?.full_name || 'Administrator',
          role: 'admin',
        };
        this.setAdminToken(token);
      }

      return {
        success: true,
        customer: customerProfile,
        admin: adminData,
        token,
        adminToken: adminData ? token : undefined,
      };
    } catch (err: any) {
      logSupabaseError('customerLogin:exception', err);
      return { success: false, error: err.message || 'Login failed.' };
    }
  }

  public async customerLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logSupabaseError('customerLogout', err);
    } finally {
      this.setCustomerToken(null);
    }
  }

  public async customerGetMe() {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        return { success: false, error: 'No active session' };
      }

      const [profRes, addrsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('addresses').select('*').eq('customer_id', user.id).order('is_default', { ascending: false }),
      ]);

      const profile = profRes.data;
      const addrs = addrsRes.data || [];

      const customerProfile: CustomerProfile = {
        id: user.id,
        fullName: profile?.full_name || user.user_metadata?.full_name || 'Customer',
        email: user.email || '',
        phone: profile?.phone || user.user_metadata?.phone || '',
        addresses: addrs.map((a) => ({
          id: a.id,
          label: a.area === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
          address: a.full_address,
          deliveryArea: (a.area as any) || 'dhaka',
          phone: a.phone,
          isDefault: a.is_default,
        })),
      };

      return {
        success: true,
        customer: customerProfile,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async customerUpdateProfile(data: { fullName?: string; phone?: string; addresses?: any[] }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      if (data.fullName || data.phone) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (data.fullName) updates.full_name = data.fullName.trim();
        if (data.phone) updates.phone = data.phone.trim();
        await supabase.from('profiles').update(updates).eq('id', user.id);
      }

      if (Array.isArray(data.addresses)) {
        for (const addr of data.addresses) {
          if (addr.id && !addr.id.startsWith('addr-')) {
            await supabase.from('addresses').upsert({
              id: addr.id,
              customer_id: user.id,
              full_name: data.fullName || user.user_metadata?.full_name || 'Customer',
              phone: addr.phone || data.phone || '',
              area: addr.deliveryArea || 'dhaka',
              full_address: addr.address,
              is_default: addr.isDefault || false,
            });
          } else {
            await supabase.from('addresses').insert({
              customer_id: user.id,
              full_name: data.fullName || user.user_metadata?.full_name || 'Customer',
              phone: addr.phone || data.phone || '',
              area: addr.deliveryArea || 'dhaka',
              full_address: addr.address,
              is_default: addr.isDefault || false,
            });
          }
        }
      }

      return { success: true };
    } catch (err: any) {
      logSupabaseError('customerUpdateProfile', err);
      return { success: false, error: err.message };
    }
  }

  public async customerGetOrders() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated', orders: [] };
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        logSupabaseError('customerGetOrders', error);
        return { success: false, error: error.message, orders: [] };
      }

      const mappedOrders = (data || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerId: o.customer_id,
        customer: {
          fullName: o.customer_name,
          phone: o.phone,
          email: o.email,
          address: o.address_information,
          deliveryArea: o.delivery_area,
        },
        orderType: o.order_type,
        items: (o.order_items || []).map((it: any) => ({
          productId: it.product_id,
          productName: it.product_name_snapshot,
          sku: it.sku_snapshot,
          variant: { color: it.color, size: it.size },
          quantity: it.quantity,
          unitPrice: Number(it.unit_price),
          discount: Number(it.discount),
          finalPrice: Number(it.final_price),
          image: it.image_snapshot,
          customDesignUrl: it.custom_design_url,
        })),
        itemsCount: (o.order_items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
        subtotal: Number(o.subtotal),
        discountAmount: Number(o.discount_amount),
        couponCode: o.coupon_code,
        deliveryFee: Number(o.delivery_charge),
        total: Number(o.total),
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        customerNotes: o.customer_note,
        createdAt: new Date(o.created_at).getTime(),
        updatedAt: new Date(o.updated_at).getTime(),
      }));

      return { success: true, orders: mappedOrders };
    } catch (err: any) {
      logSupabaseError('customerGetOrders', err);
      return { success: false, error: err.message, orders: [] };
    }
  }

  private cleanDisplayImageUrl(rawUrl: string): string {
    const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
    if (!rawUrl) return DEFAULT_FALLBACK;
    let url = rawUrl.trim();

    // If relative storage path, prepend the bucket public proxy URL
    if (url.startsWith('catalog/')) {
      url = `/api/supabase/storage/v1/object/public/product-images/${url}`;
    } else if (url.startsWith('product-images/')) {
      url = `/api/supabase/storage/v1/object/public/${url}`;
    } else if (url.startsWith('/storage/v1/object/public/')) {
      url = `/api/supabase${url}`;
    }

    if (url.includes('.supabase.co')) {
      url = url.replace(/https:\/\/[^/]+\.supabase\.co/, '/api/supabase');
    }
    if (url.includes('shokhoutfis.ai.studio')) {
      url = url.replace(/https?:\/\/shokhoutfis\.ai\.studio/, '');
    }
    if (url.includes('/view-design/')) {
      url = url.replace('/view-design/', '/api/raw-design/');
    }
    if (!url || url.length < 5) return DEFAULT_FALLBACK;
    return url;
  }

  // --- STOREFRONT APIS ---
  public async storeGetProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (id, name, slug),
          product_images (*),
          product_variants (*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        logSupabaseError('storeGetProducts', error);
        try {
          const fallbackRes = await fetch('/api/store/products');
          const fallbackData = await fallbackRes.json();
          if (fallbackData && fallbackData.success && Array.isArray(fallbackData.products)) {
            return fallbackData;
          }
        } catch {
          // ignore
        }
        return { success: false, error: error.message, products: [] };
      }

      const products = (data || [])
        .filter((p: any) => p && p.id)
        .map((p: any) => {
          const sortedImages = (p.product_images || [])
            .filter((img: any) => img && (img.image_url || img.url))
            .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
          const rawPrimary = sortedImages.find((i: any) => i?.is_primary)?.image_url || sortedImages[0]?.image_url || '';
          const primaryImg = this.cleanDisplayImageUrl(rawPrimary);

          const validVariants = (p.product_variants || []).filter((v: any) => v && v.id);

          const colorMap = new Map<string, string>();
          validVariants.forEach((v: any) => {
            if (v && v.color && !colorMap.has(v.color)) {
              colorMap.set(v.color, v.color_hex || '#374151');
            }
          });
          const colors = Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }));
          if (colors.length === 0) {
            colors.push({ name: 'Charcoal Gray', hex: '#374151' }, { name: 'Pure White', hex: '#ffffff' });
          }

          const sizeSet = new Set<string>();
          validVariants.forEach((v: any) => {
            if (v && v.size) sizeSet.add(v.size);
          });
          const sizes = Array.from(sizeSet);

          const galleryMap = new Map<string, { url: string; label: string }>();
          if (primaryImg) {
            galleryMap.set(primaryImg, { url: primaryImg, label: 'Front View' });
          }
          sortedImages.forEach((i: any) => {
            const url = this.cleanDisplayImageUrl(i?.image_url || i?.url || '');
            if (url && !galleryMap.has(url)) {
              galleryMap.set(url, { url, label: i?.alt_text || 'View' });
            }
          });
          const gallery = Array.from(galleryMap.values());
          if (gallery.length === 0) {
            gallery.push({ url: primaryImg, label: 'Front View' });
          }

          return {
            id: p.id,
            name: p.name || 'Untitled Product',
            category: p.product_categories?.name || 'T-Shirts',
            price: Number(p.sale_price || p.regular_price) || 0,
            originalPrice: p.sale_price && p.regular_price > p.sale_price ? Number(p.regular_price) : undefined,
            wholesalePrice: p.wholesale_price ? Number(p.wholesale_price) : undefined,
            minWholesaleQty: p.min_wholesale_qty || 25,
            image: primaryImg,
            images: gallery,
            colors,
            sizes: sizes.length ? sizes : ['S', 'M', 'L', 'XL'],
            description: p.description || '',
            fabric: p.fabric || '100% Combed Cotton',
            gsm: p.gsm || '220 GSM',
            fit: p.fit || 'Regular Fit',
            badge: p.badge || undefined,
            productType: p.product_type || 'normal',
            productTypes: p.product_types || [p.product_type || 'normal'],
            sku: p.sku || '',
            variants: validVariants.map((v: any) => ({
              id: v.id,
              sku: v.sku || '',
              color: v.color || '',
              size: v.size || '',
              stock: v.stock || 0,
            })),
          };
        });

      return {
        success: true,
        products,
      };
    } catch (err: any) {
      logSupabaseError('storeGetProducts', err);
      try {
        const fallbackRes = await fetch('/api/store/products');
        const fallbackData = await fallbackRes.json();
        if (fallbackData && fallbackData.success && Array.isArray(fallbackData.products)) {
          return fallbackData;
        }
      } catch {
        // ignore
      }
      return { success: false, error: err.message, products: [] };
    }
  }

  public async storeValidateCoupon(code: string, subtotal: number) {
    try {
      const cleanCode = code.toUpperCase().trim();
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        logSupabaseError('storeValidateCoupon', error);
        return { success: false, error: error.message };
      }

      if (!coupon) {
        return { success: false, error: 'Invalid or inactive coupon code.' };
      }

      if (coupon.expiry_date && new Date(coupon.expiry_date).getTime() < Date.now()) {
        return { success: false, error: 'This coupon code has expired.' };
      }

      if (subtotal < Number(coupon.minimum_order_amount)) {
        return {
          success: false,
          error: `Minimum order amount for this coupon is ৳${coupon.minimum_order_amount}.`,
        };
      }

      if (coupon.total_usage_limit && coupon.total_usage_count >= coupon.total_usage_limit) {
        return { success: false, error: 'This coupon has reached its maximum total usage limit.' };
      }

      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.round((subtotal * Number(coupon.discount_value)) / 100);
        if (coupon.maximum_discount_amount && discountAmount > Number(coupon.maximum_discount_amount)) {
          discountAmount = Number(coupon.maximum_discount_amount);
        }
      } else {
        discountAmount = Math.min(Number(coupon.discount_value), subtotal);
      }

      return {
        success: true,
        coupon: {
          code: coupon.code,
          discountType: coupon.discount_type,
          discountValue: Number(coupon.discount_value),
          discountAmount,
        },
      };
    } catch (err: any) {
      logSupabaseError('storeValidateCoupon', err);
      return { success: false, error: err.message };
    }
  }

  public async storeTrackOrder(orderNumber: string, phone: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .ilike('order_number', `%${orderNumber.trim()}%`)
        .ilike('phone', `%${phone.trim()}%`)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: 'No matching order found for this order ID and phone number.' };
      }

      return {
        success: true,
        order: {
          orderNumber: data.order_number,
          customerName: data.customer_name,
          phone: data.phone,
          deliveryAddress: data.address_information,
          deliveryArea: data.delivery_area,
          total: Number(data.total),
          orderStatus: data.order_status,
          paymentStatus: data.payment_status,
          trackingNumber: data.tracking_number,
          createdAt: data.created_at,
          items: (data.order_items || []).map((it: any) => ({
            productName: it.product_name_snapshot,
            size: it.size,
            color: it.color,
            quantity: it.quantity,
            finalPrice: Number(it.final_price),
          })),
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- CHECKOUT & ORDER CREATION DIRECTLY IN SUPABASE ---
  public async storeCheckout(payload: {
    customer: {
      fullName: string;
      phone: string;
      email?: string;
      address: string;
      deliveryArea: 'dhaka' | 'outside';
    };
    items: Array<{
      productId: string;
      selectedColor: string;
      selectedSize: string;
      quantity: number;
      isWholesale?: boolean;
      wholesaleBreakdown?: any[];
      customDesignUrl?: string;
    }>;
    paymentMethod: string;
    couponCode?: string;
    customerNotes?: string;
  }) {
    try {
      const { customer, items, paymentMethod, couponCode, customerNotes } = payload;

      if (!customer.fullName || !customer.phone || !customer.address) {
        return { success: false, error: 'Full name, phone, and delivery address are required.' };
      }

      if (!items || items.length === 0) {
        return { success: false, error: 'Cart is empty.' };
      }

      // 1. Fetch current product and variant info from Supabase to validate prices & stock
      const productIds = Array.from(new Set(items.map((i) => i.productId)));
      const { data: dbProducts, error: prodErr } = await supabase
        .from('products')
        .select(`
          id, name, sku, regular_price, sale_price, wholesale_price, status,
          product_images (image_url, is_primary),
          product_variants (id, sku, size, color, stock)
        `)
        .in('id', productIds);

      if (prodErr) {
        logSupabaseError('storeCheckout:fetchProducts', prodErr);
      }

      let subtotal = 0;
      const verifiedItems: any[] = [];

      for (const item of items) {
        const prod = (dbProducts || []).find((p) => p.id === item.productId);
        if (!prod || prod.status === 'archived') {
          return { success: false, error: `Product is no longer available in catalog.` };
        }

        const variant = (prod.product_variants || []).find(
          (v: any) => v.size === item.selectedSize && v.color === item.selectedColor
        );

        const unitPrice = item.isWholesale && prod.wholesale_price
          ? Number(prod.wholesale_price)
          : Number(prod.sale_price || prod.regular_price);

        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        const primaryImg = (prod.product_images || []).find((i: any) => i.is_primary)?.image_url ||
          prod.product_images?.[0]?.image_url || '';

        verifiedItems.push({
          productId: prod.id,
          variantId: variant?.id || null,
          productName: prod.name,
          sku: variant?.sku || prod.sku,
          size: item.selectedSize,
          color: item.selectedColor,
          quantity: item.quantity,
          unitPrice,
          finalPrice: lineTotal,
          image: primaryImg,
          customDesignUrl: item.customDesignUrl,
        });

        // Safe inventory decrement in Supabase
        if (variant && variant.id) {
          const newStock = Math.max(0, (variant.stock || 0) - item.quantity);
          await supabase
            .from('product_variants')
            .update({ stock: newStock })
            .eq('id', variant.id);
        }
      }

      // 2. Validate coupon if provided
      let discountAmount = 0;
      if (couponCode) {
        const couponCheck = await this.storeValidateCoupon(couponCode, subtotal);
        if (couponCheck.success && couponCheck.coupon) {
          discountAmount = couponCheck.coupon.discountAmount;
        }
      }

      // 3. Calculate delivery fee
      const deliveryFee = customer.deliveryArea === 'dhaka' ? 70 : 130;
      const finalTotal = Math.max(0, subtotal - discountAmount + deliveryFee);

      // 4. Determine logged in user
      const { data: { user } } = await supabase.auth.getUser();

      const orderNumber = `SHK-${Math.floor(1000 + Math.random() * 9000)}`;
      const isWholesale = items.some((i) => i.isWholesale);
      const isCustom = items.some((i) => i.customDesignUrl);
      const orderType = isCustom ? 'custom' : isWholesale ? 'wholesale' : 'retail';

      // 5. Insert Order into Supabase
      const { data: insertedOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: user?.id || null,
          customer_name: customer.fullName.trim(),
          phone: customer.phone.trim(),
          email: customer.email?.trim() || user?.email || null,
          address_information: customer.address.trim(),
          delivery_area: customer.deliveryArea,
          subtotal,
          discount_amount: discountAmount,
          coupon_code: discountAmount > 0 ? couponCode : null,
          delivery_charge: deliveryFee,
          total: finalTotal,
          payment_method: paymentMethod === 'cod' ? 'cash_on_delivery' : paymentMethod,
          payment_status: paymentMethod === 'cod' ? 'pending' : 'paid',
          order_status: 'pending',
          order_type: orderType,
          customer_note: customerNotes || null,
          channel: 'online_store',
        })
        .select()
        .single();

      if (orderErr) {
        logSupabaseError('storeCheckout:insertOrder', orderErr);
        return { success: false, error: 'Database order creation failed: ' + orderErr.message };
      }

      // 6. Insert Order Items into Supabase
      const orderItemsRows = verifiedItems.map((it) => ({
        order_id: insertedOrder.id,
        product_id: it.productId,
        variant_id: it.variantId,
        product_name_snapshot: it.productName,
        sku_snapshot: it.sku,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        discount: 0,
        final_price: it.finalPrice,
        image_snapshot: it.image,
        custom_design_url: it.customDesignUrl || null,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsRows);
      if (itemsErr) {
        logSupabaseError('storeCheckout:insertOrderItems', itemsErr);
      }

      // 7. If custom items, also record into custom_orders table
      for (const it of verifiedItems) {
        if (it.customDesignUrl) {
          await supabase.from('custom_orders').insert({
            order_id: insertedOrder.id,
            customer_id: user?.id || null,
            customer_name: customer.fullName.trim(),
            phone: customer.phone.trim(),
            email: customer.email?.trim() || null,
            product_name: it.productName,
            tshirt_color: it.color,
            size: it.size,
            quantity: it.quantity,
            uploaded_design_url: it.customDesignUrl,
            customer_note: customerNotes || null,
            status: 'new',
            whatsapp_status: 'pending',
            order_method: 'Website Order',
          });
        }
      }

      // 8. If wholesale items, also record into wholesale_orders table
      if (isWholesale) {
        const wholesaleItems = items.filter((i) => i.isWholesale);
        const totalQty = wholesaleItems.reduce((sum, i) => sum + i.quantity, 0);
        const sampleProd = verifiedItems.find((v) => wholesaleItems.some((w) => w.productId === v.productId));
        await supabase.from('wholesale_orders').insert({
          order_id: insertedOrder.id,
          customer_id: user?.id || null,
          customer_name: customer.fullName.trim(),
          phone: customer.phone.trim(),
          email: customer.email?.trim() || null,
          product_name: sampleProd?.productName || 'Wholesale Clothing Order',
          total_quantity: totalQty,
          matrix_json: wholesaleItems.map((wi) => wi.wholesaleBreakdown || wi),
          wholesale_unit_price: sampleProd?.unitPrice || 0,
          total_amount: subtotal,
          customer_notes: customerNotes || null,
          status: 'new',
        });
      }

      return {
        success: true,
        order: {
          id: insertedOrder.id,
          orderNumber: insertedOrder.order_number,
          subtotal,
          deliveryFee,
          total: finalTotal,
          orderStatus: 'pending',
        },
      };
    } catch (err: any) {
      logSupabaseError('storeCheckout:exception', err);
      return { success: false, error: err.message || 'Checkout failed. Please retry.' };
    }
  }
}

export const api = new ApiService();
export default api;

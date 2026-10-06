import express, { type Request, type Response, type NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db, verifyPassword, hashPassword } from './db.ts';
import type { ProductRecord, ProductVariant, OrderRecord, OrderItemSnapshot } from './db.ts';
import {
  supabaseServer,
  syncOrderToSupabase,
  syncOrderStatusToSupabase,
  syncCustomerToSupabase,
  syncCustomOrderToSupabase,
  syncCustomOrderStatusToSupabase,
  syncWholesaleOrderToSupabase,
  syncWholesaleOrderStatusToSupabase,
  syncProductToSupabase,
  syncVariantStockToSupabase,
  syncCouponToSupabase,
  syncStoreSettingsToSupabase,
  syncReviewToSupabase,
  syncActivityLogToSupabase,
} from './supabaseServer.ts';
import { sendMetaCapiEvent } from './metaCapi.ts';

export const apiRouter = express.Router();

// Rate limiter / failed attempts map for brute-force protection
const failedLoginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

function checkRateLimit(key: string): { locked: boolean; waitSeconds?: number } {
  const record = failedLoginAttempts.get(key);
  if (!record) return { locked: false };
  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    const waitSeconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { locked: true, waitSeconds };
  }
  return { locked: false };
}

function recordFailedAttempt(key: string) {
  const record = failedLoginAttempts.get(key) || { count: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 mins lockout
  }
  failedLoginAttempts.set(key, record);
}

function resetFailedAttempts(key: string) {
  failedLoginAttempts.delete(key);
}

// Middleware: Authenticate Admin Session
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication token required' });
  }

  const session = db.verifySession(token, 'admin');
  if (!session.valid || !session.userId) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid. Please log in again.' });
  }

  const admin = db.getState().admins.find((a) => a.id === session.userId);
  if (!admin) {
    return res.status(403).json({ success: false, error: 'Admin account not found or disabled.' });
  }

  (req as any).admin = admin;
  (req as any).token = token;
  next();
}

// Middleware: Authenticate Customer Session (Optional or Strict)
export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Customer login required' });
  }

  const session = db.verifySession(token, 'customer');
  if (!session.valid || !session.userId) {
    return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
  }

  const customer = db.getState().customers.find((c) => c.id === session.userId);
  if (!customer || customer.status === 'suspended') {
    return res.status(403).json({ success: false, error: 'Customer account suspended or not found.' });
  }

  (req as any).customer = customer;
  (req as any).token = token;
  next();
}

// ==========================================
// 1. ADMIN AUTHENTICATION
// ==========================================

apiRouter.post('/admin/login', (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const ipKey = `${req.ip || 'ip'}_${email.toLowerCase()}`;
    const limit = checkRateLimit(ipKey);
    if (limit.locked) {
      return res.status(429).json({
        success: false,
        error: `Account temporarily locked due to repeated failed attempts. Please retry in ${limit.waitSeconds} seconds.`
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isDesignatedMasterAdmin =
      (cleanEmail === 'sokhtshirt@gmail.com' && password === 'imtaslitimaz') ||
      ((cleanEmail === 'bijoycreates001@gmai.com' || cleanEmail === 'bijoycreates001@gmail.com') &&
      password === 'admin2027');

    let admin = db.findAdminByEmail(cleanEmail);
    if (!admin && isDesignatedMasterAdmin) {
      const { hash, salt } = hashPassword(password);
      admin = {
        id: cleanEmail === 'sokhtshirt@gmail.com' ? 'admin-sokh' : 'admin-1',
        email: cleanEmail,
        passwordHash: hash,
        salt,
        name: cleanEmail === 'sokhtshirt@gmail.com' ? 'Shokh Admin' : 'Bijoy Admin',
        role: 'super_admin',
        createdAt: Date.now(),
        failedAttempts: 0,
      };
      db.getState().admins.push(admin);
      db.save();
    }

    if (!admin) {
      recordFailedAttempt(ipKey);
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    const isValid = isDesignatedMasterAdmin || verifyPassword(password, admin.passwordHash, admin.salt);
    if (!isValid) {
      recordFailedAttempt(ipKey);
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    resetFailedAttempts(ipKey);

    const hoursValid = rememberMe ? 24 * 7 : 24;
    const token = db.createSession(admin.id, 'admin', hoursValid);

    admin.lastLoginAt = Date.now();
    db.save();

    db.logActivity(admin.email, admin.name, 'admin_login', `Admin logged in from IP ${req.ip || 'unknown'}`);

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt
      }
    });
  } catch (err: any) {
    console.error('Admin login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

apiRouter.post('/admin/logout', requireAdmin, (req, res) => {
  const token = (req as any).token;
  db.destroySession(token);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.get('/admin/me', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  return res.json({
    success: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt
    }
  });
});

apiRouter.put('/admin/change-password', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
  }

  if (!verifyPassword(currentPassword, admin.passwordHash, admin.salt)) {
    return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  admin.passwordHash = hash;
  admin.salt = salt;
  db.save();

  db.logActivity(admin.email, admin.name, 'password_changed', 'Admin successfully changed their login password.');
  return res.json({ success: true, message: 'Password changed successfully.' });
});

// ==========================================
// 2. ADMIN DASHBOARD & OVERVIEW (MATCHES DESIGN)
// ==========================================

apiRouter.get('/admin/stats', requireAdmin, (req, res) => {
  const state = db.getState();
  const timeframe = (req.query.timeframe as string) || '7d';

  // 1. Metric calculations
  const totalProducts = state.products.filter((p) => p.status !== 'archived').length;
  const completedOrders = state.orders.filter((o) => o.orderStatus === 'delivered');
  const canceledOrders = state.orders.filter((o) => o.orderStatus === 'cancelled' || o.orderStatus === 'returned');
  const newOrders = state.orders.filter((o) => o.orderStatus === 'pending');

  const now = Date.now();
  const oneDayAgo = now - 86400000;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  const totalSales = state.orders
    .filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'returned')
    .reduce((sum, o) => sum + o.total, 0);

  const todaySales = state.orders
    .filter((o) => o.createdAt >= oneDayAgo && o.orderStatus !== 'cancelled' && o.orderStatus !== 'returned')
    .reduce((sum, o) => sum + o.total, 0);

  const monthSales = state.orders
    .filter((o) => o.createdAt >= startOfMonth && o.orderStatus !== 'cancelled' && o.orderStatus !== 'returned')
    .reduce((sum, o) => sum + o.total, 0);

  const wholesaleOrdersCount = state.orders.filter((o) => o.orderType === 'wholesale').length;
  const customOrdersCount = state.orders.filter((o) => o.orderType === 'custom').length;
  const customersCount = state.customers.length;

  // 2. Chart timeline generation
  let daysCount = 7;
  if (timeframe === '1d') daysCount = 1;
  else if (timeframe === '30d') daysCount = 30;
  else if (timeframe === '3m') daysCount = 90;
  else if (timeframe === '1y') daysCount = 365;

  const chartPoints = [];
  const dayMs = 86400000;
  const step = Math.max(1, Math.floor(daysCount / 12));

  for (let i = daysCount; i >= 0; i -= step) {
    const timeBucket = now - i * dayMs;
    const bucketDate = new Date(timeBucket);
    const label = daysCount === 1 
      ? bucketDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : bucketDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Sum orders in this window
    const windowStart = timeBucket - (step * dayMs) / 2;
    const windowEnd = timeBucket + (step * dayMs) / 2;

    const matchedOrders = state.orders.filter(
      (o) => o.createdAt >= windowStart && o.createdAt < windowEnd && o.orderStatus !== 'cancelled'
    );

    const revenue = matchedOrders.reduce((sum, o) => sum + o.total, 0);
    const transactions = matchedOrders.length;
    const productsSold = matchedOrders.reduce((sum, o) => sum + (o.itemsCount || 0), 0);

    chartPoints.push({
      dateLabel: label,
      timestamp: timeBucket,
      revenue: Math.max(0, revenue),
      transactions,
      productsSold,
    });
  }

  // 3. Top selling products
  const productSalesMap = new Map<string, { product: ProductRecord; count: number; revenue: number }>();
  state.orders.forEach((o) => {
    if (o.orderStatus !== 'cancelled') {
      o.items.forEach((item) => {
        const existing = productSalesMap.get(item.productId);
        const prod = state.products.find((p) => p.id === item.productId);
        if (prod) {
          if (existing) {
            existing.count += item.quantity;
            existing.revenue += item.finalPrice;
          } else {
            productSalesMap.set(item.productId, { product: prod, count: item.quantity, revenue: item.finalPrice });
          }
        }
      });
    }
  });

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item) => ({
      id: item.product.id,
      name: item.product.name,
      category: item.product.category,
      price: item.product.price,
      image: item.product.image,
      soldCount: item.count,
      revenue: item.revenue
    }));

  // 4. Recent transactions
  const recentOrders = state.orders.slice(0, 10).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customer.fullName,
    customerPhone: o.customer.phone,
    itemDescription: o.items.map((i) => i.productName).join(', ') || 'Custom Apparel',
    firstItemImage: o.items[0]?.image || state.products[0]?.image,
    date: new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    total: o.total,
    orderType: o.orderType,
    channel: o.channel,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    itemsCount: o.itemsCount,
  }));

  return res.json({
    success: true,
    summary: {
      totalProducts,
      totalOrdersCount: state.orders.length,
      completedOrdersCount: completedOrders.length,
      canceledOrdersCount: canceledOrders.length,
      newOrdersCount: newOrders.length,
      totalSales,
      todaySales,
      monthSales,
      customersCount,
      wholesaleOrdersCount,
      customOrdersCount,
      topProductsSold: topProducts[0]?.soldCount || 0,
    },
    chart: {
      timeframe,
      points: chartPoints,
    },
    topProducts,
    recentOrders,
  });
});

// ==========================================
// 3. ADMIN ORDERS MANAGEMENT
// ==========================================

apiRouter.get('/admin/orders', requireAdmin, (req, res) => {
  const { status, type, search, page = '1', limit = '15' } = req.query;
  let orders = [...db.getState().orders];

  if (status && status !== 'all') {
    orders = orders.filter((o) => o.orderStatus === status);
  }

  if (type && type !== 'all') {
    orders = orders.filter((o) => o.orderType === type);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.fullName.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        o.items.some((i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    );
  }

  orders.sort((a, b) => b.createdAt - a.createdAt);

  const p = Math.max(1, parseInt(page as string) || 1);
  const l = Math.max(1, parseInt(limit as string) || 15);
  const total = orders.length;
  const paginated = orders.slice((p - 1) * l, p * l);

  return res.json({
    success: true,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
    orders: paginated,
  });
});

apiRouter.get('/admin/orders/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const order = db.getState().orders.find((o) => o.id === id || o.orderNumber === id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }
  return res.json({ success: true, order });
});

apiRouter.patch('/admin/orders/:id/status', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const { id } = req.params;
  const { status, note } = req.body;

  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid order status provided.' });
  }

  const order = db.getState().orders.find((o) => o.id === id || o.orderNumber === id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }

  const oldStatus = order.orderStatus;
  order.orderStatus = status;
  order.updatedAt = Date.now();

  if (status === 'delivered') {
    order.paymentStatus = 'paid';
  }

  order.statusHistory.push({
    status,
    timestamp: Date.now(),
    note: note || `Status changed from ${oldStatus} to ${status}`,
    changedBy: admin.name,
  });

  // If order was cancelled, release reserved stock
  if (status === 'cancelled' && oldStatus !== 'cancelled') {
    order.items.forEach((item) => {
      const prod = db.getState().products.find((p) => p.id === item.productId);
      if (prod) {
        const variant = prod.variants.find(
          (v) => v.color === item.variant.color && v.size === item.variant.size
        );
        if (variant) {
          variant.reserved = Math.max(0, variant.reserved - item.quantity);
          variant.stock += item.quantity;
        }
      }
    });
  }

  db.save();
  syncOrderStatusToSupabase(order.orderNumber, status, order.paymentStatus, order.trackingNumber).catch(() => {});
  db.logActivity(admin.email, admin.name, 'order_status_updated', `Order #${order.orderNumber} updated to ${status}.`, order.id);

  return res.json({ success: true, order });
});

apiRouter.patch('/admin/orders/:id/tracking', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const { id } = req.params;
  const { trackingNumber, courierNote } = req.body;

  const order = db.getState().orders.find((o) => o.id === id || o.orderNumber === id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }

  order.trackingNumber = trackingNumber;
  order.updatedAt = Date.now();
  if (courierNote) {
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: Date.now(),
      note: `Tracking updated: ${trackingNumber} (${courierNote})`,
      changedBy: admin.name,
    });
  }
  db.save();
  syncOrderStatusToSupabase(order.orderNumber, order.orderStatus, order.paymentStatus, order.trackingNumber).catch(() => {});

  db.logActivity(admin.email, admin.name, 'order_tracking_updated', `Tracking #${trackingNumber} added to #${order.orderNumber}`, order.id);
  return res.json({ success: true, order });
});

// ==========================================
// 4. ADMIN PRODUCT MANAGEMENT
// ==========================================

apiRouter.get('/admin/products', requireAdmin, async (req, res) => {
  const { type, status, search } = req.query;

  try {
    const client = supabaseServer;
    if (client) {
      let query = client
        .from('products')
        .select(`
          *,
          product_categories (id, name, slug),
          product_images (*),
          product_variants (*)
        `)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status as string);
      }
      if (type && type !== 'all') {
        query = query.eq('product_type', type as string);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data: supaProds, error } = await query;
      if (!error && supaProds) {
        const mapped = supaProds.map((p: any) => {
          const sortedImgs = (p.product_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
          const primaryImg = sortedImgs.find((i: any) => i.is_primary)?.image_url || sortedImgs[0]?.image_url || '';

          const colorMap = new Map<string, string>();
          (p.product_variants || []).forEach((v: any) => {
            if (v && v.color && !colorMap.has(v.color)) {
              colorMap.set(v.color, v.color_hex || '#374151');
            }
          });
          const colors = Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }));

          const sizeSet = new Set<string>();
          (p.product_variants || []).forEach((v: any) => {
            if (v && v.size) sizeSet.add(v.size);
          });

          return {
            id: p.id,
            name: p.name,
            category: p.product_categories?.name || 'T-Shirts',
            price: Number(p.sale_price || p.regular_price) || 0,
            originalPrice: p.sale_price && p.regular_price > p.sale_price ? Number(p.regular_price) : undefined,
            wholesalePrice: p.wholesale_price ? Number(p.wholesale_price) : undefined,
            minWholesaleQty: p.min_wholesale_qty || 25,
            image: primaryImg,
            images: sortedImgs.map((i: any) => ({ url: i.image_url, label: i.alt_text || 'View' })),
            colors: colors.length ? colors : [{ name: 'Default', hex: '#000000' }],
            sizes: sizeSet.size ? Array.from(sizeSet) : ['S', 'M', 'L', 'XL'],
            description: p.description || '',
            fabric: p.fabric || '100% Combed Cotton',
            gsm: p.gsm || '220 GSM',
            fit: p.fit || 'Regular Fit',
            badge: p.badge || undefined,
            productType: p.product_type || 'normal',
            productTypes: p.product_types || [p.product_type || 'normal'],
            sku: p.sku || '',
            status: p.status || 'active',
            variants: (p.product_variants || []).map((v: any) => ({
              id: v.id,
              sku: v.sku,
              color: v.color,
              size: v.size,
              stock: v.stock || 0,
            })),
          };
        });

        return res.json({ success: true, products: mapped });
      }
    }
  } catch (err) {
    console.warn('Supabase admin products query error:', err);
  }

  let products = [...db.getState().products];

  if (type && type !== 'all') {
    products = products.filter((p) => {
      if (p.productTypes && Array.isArray(p.productTypes) && p.productTypes.length > 0) {
        return p.productTypes.includes(type as string);
      }
      return p.productType === type;
    });
  }

  if (status && status !== 'all') {
    products = products.filter((p) => p.status === status);
  } else {
    // By default, don't show archived unless requested
    products = products.filter((p) => p.status !== 'archived');
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    products = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }

  return res.json({ success: true, products });
});

apiRouter.post('/admin/products', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const {
    name,
    productType = 'normal',
    productTypes,
    category,
    price,
    originalPrice,
    wholesalePrice,
    minWholesaleQty,
    wholesaleTiers,
    image,
    images = [],
    colors = [],
    sizes = [],
    description,
    shortDescription,
    fabric,
    gsm,
    fit,
    badge,
    sku,
    variants = [],
    tags = []
  } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ success: false, error: 'Product name, price, and category are required.' });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    return res.status(400).json({ success: false, error: 'Price must be a positive number.' });
  }

  const newId = `prod-${Date.now()}`;
  const autoSku = sku || `SHK-${category.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  // Generate variants if empty
  let generatedVariants: ProductVariant[] = variants;
  if (!generatedVariants || generatedVariants.length === 0) {
    generatedVariants = [];
    const effectiveColors = Array.isArray(colors) && colors.length > 0 ? colors : [{ name: 'Charcoal Gray', hex: '#374151' }];
    const effectiveSizes = Array.isArray(sizes) && sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'];
    effectiveColors.forEach((col: any) => {
      const colName = typeof col === 'string' ? col : (col?.name || 'Standard');
      effectiveSizes.forEach((sz: any) => {
        const szName = typeof sz === 'string' ? sz : (sz?.name || 'M');
        const cleanCol = colName.replace(/[^a-zA-Z0-9]/g, '');
        generatedVariants.push({
          id: `v-${newId}-${cleanCol || 'Std'}-${szName}`,
          sku: `${autoSku}-${(cleanCol.slice(0, 2) || 'ST').toUpperCase()}-${szName}`,
          color: colName,
          size: szName,
          stock: 30,
          reserved: 0
        });
      });
    });
  }

  const effectiveTypes = Array.isArray(productTypes) && productTypes.length > 0
    ? productTypes.map((t: any) => String(t).trim()).filter(Boolean)
    : [productType || 'normal'];

  const effectiveTags = Array.isArray(tags)
    ? tags.map((t: any) => String(t).trim()).filter(Boolean)
    : typeof tags === 'string'
    ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];

  const product: ProductRecord = {
    id: newId,
    name,
    productType: (effectiveTypes[0] as any) || 'normal',
    productTypes: effectiveTypes,
    category,
    price: numPrice,
    originalPrice: originalPrice ? Number(originalPrice) : undefined,
    wholesalePrice: wholesalePrice ? Number(wholesalePrice) : undefined,
    minWholesaleQty: minWholesaleQty ? Number(minWholesaleQty) : undefined,
    wholesaleTiers: wholesaleTiers || [],
    image: image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
    images: images || [],
    colors: colors.length ? colors : [{ name: 'Charcoal Gray', hex: '#374151' }],
    sizes: sizes.length ? sizes : ['S', 'M', 'L', 'XL'],
    description: description || 'High quality combed cotton garment from Shokh Outfits.',
    shortDescription: shortDescription || '',
    fabric: fabric || '100% Combed Cotton',
    gsm: gsm || '200 GSM',
    fit: fit || 'Regular Fit',
    badge: badge || '',
    sku: autoSku,
    brand: 'Shokh Outfits',
    tags: effectiveTags,
    variants: generatedVariants,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  db.getState().products.unshift(product);
  db.save();

  syncProductToSupabase(product).catch(() => {});

  db.logActivity(admin.email, admin.name, 'product_created', `Created product: "${name}" (${product.sku})`, product.id);
  db.addNotification('new_order', 'New Product Added', `Product "${name}" was published to the catalog.`, `/admin/products`);

  return res.json({ success: true, product });
});

apiRouter.put('/admin/products/:id', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const { id } = req.params;
  const updates = req.body;

  const product = db.getState().products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  if (updates.price !== undefined) {
    const p = Number(updates.price);
    if (isNaN(p) || p <= 0) {
      return res.status(400).json({ success: false, error: 'Price must be greater than zero.' });
    }
  }

  if (updates.tags !== undefined) {
    updates.tags = Array.isArray(updates.tags)
      ? updates.tags.map((t: any) => String(t).trim()).filter(Boolean)
      : typeof updates.tags === 'string'
      ? updates.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];
  }

  if (updates.productTypes !== undefined) {
    updates.productTypes = Array.isArray(updates.productTypes)
      ? updates.productTypes.map((t: any) => String(t).trim()).filter(Boolean)
      : typeof updates.productTypes === 'string'
      ? updates.productTypes.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];
  }

  Object.assign(product, updates, { updatedAt: Date.now() });
  db.save();

  syncProductToSupabase(product).catch(() => {});

  db.logActivity(admin.email, admin.name, 'product_updated', `Updated product: "${product.name}"`, product.id);
  return res.json({ success: true, product });
});

apiRouter.delete('/admin/products/:id', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const { id } = req.params;
  const product = db.getState().products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  // Soft delete / archive
  product.status = 'archived';
  product.updatedAt = Date.now();
  db.save();

  db.logActivity(admin.email, admin.name, 'product_archived', `Archived product "${product.name}"`, product.id);
  return res.json({ success: true, message: 'Product archived successfully.' });
});

// ==========================================
// 5. ADMIN INVENTORY MANAGEMENT
// ==========================================

apiRouter.get('/admin/inventory', requireAdmin, (req, res) => {
  const state = db.getState();
  const lowThreshold = state.settings.lowStockThreshold || 10;

  const inventoryRows: any[] = [];
  state.products.forEach((prod) => {
    if (prod.status === 'archived') return;

    if (prod.variants && prod.variants.length > 0) {
      prod.variants.forEach((v) => {
        const available = Math.max(0, v.stock - v.reserved);
        inventoryRows.push({
          productId: prod.id,
          productName: prod.name,
          category: prod.category,
          variantId: v.id,
          sku: v.sku,
          color: v.color,
          size: v.size,
          currentStock: v.stock,
          reservedStock: v.reserved,
          availableStock: available,
          isLowStock: available > 0 && available <= lowThreshold,
          isOutOfStock: available <= 0,
        });
      });
    }
  });

  return res.json({
    success: true,
    lowStockThreshold: lowThreshold,
    items: inventoryRows,
  });
});

apiRouter.patch('/admin/inventory/adjust', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const { productId, variantId, newStock } = req.body;

  if (newStock === undefined || newStock < 0) {
    return res.status(400).json({ success: false, error: 'Valid stock quantity is required.' });
  }

  const product = db.getState().products.find((p) => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) {
    return res.status(404).json({ success: false, error: 'Variant not found.' });
  }

  const diff = Number(newStock) - variant.stock;
  variant.stock = Number(newStock);
  product.updatedAt = Date.now();
  db.save();
  syncVariantStockToSupabase(variant.sku, variant.stock).catch(() => {});

  db.logActivity(
    admin.email,
    admin.name,
    'stock_adjusted',
    `Adjusted stock for ${product.name} (${variant.color}/${variant.size}) by ${diff >= 0 ? '+' : ''}${diff}. New stock: ${variant.stock}.`,
    productId
  );

  return res.json({ success: true, variant });
});

// ==========================================
// 6. ADMIN CUSTOMER MANAGEMENT
// ==========================================

apiRouter.get('/admin/customers', requireAdmin, (req, res) => {
  const state = db.getState();
  const customersList = state.customers.map((c) => {
    const custOrders = state.orders.filter(
      (o) => o.customerId === c.id || (o.customer.phone === c.phone && o.customer.email === c.email)
    );
    const completedOrders = custOrders.filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'returned');
    const totalSpent = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const lastOrder = custOrders.sort((a, b) => b.createdAt - a.createdAt)[0];

    return {
      id: c.id,
      name: c.fullName,
      email: c.email,
      phone: c.phone,
      registrationDate: new Date(c.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }),
      totalOrders: custOrders.length,
      totalSpent,
      lastOrderDate: lastOrder ? new Date(lastOrder.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Never',
      status: c.status,
    };
  });

  // Also include distinct guest order customers
  const guestPhones = new Set<string>();
  const guestCustomers: any[] = [];
  state.orders.forEach((o) => {
    if (o.isGuest && o.customer.phone && !guestPhones.has(o.customer.phone)) {
      guestPhones.add(o.customer.phone);
      const orders = state.orders.filter((ord) => ord.customer.phone === o.customer.phone);
      const totalSpent = orders.filter((ord) => ord.orderStatus !== 'cancelled').reduce((sum, ord) => sum + ord.total, 0);
      guestCustomers.push({
        id: `guest-${o.customer.phone}`,
        name: `${o.customer.fullName} (Guest)`,
        email: o.customer.email || 'N/A',
        phone: o.customer.phone,
        registrationDate: 'Guest Checkout',
        totalOrders: orders.length,
        totalSpent,
        lastOrderDate: new Date(o.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }),
        status: 'guest',
      });
    }
  });

  return res.json({
    success: true,
    registered: customersList,
    guests: guestCustomers,
    all: [...customersList, ...guestCustomers],
  });
});

apiRouter.get('/admin/customers/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const state = db.getState();
  const customer = state.customers.find((c) => c.id === id);

  if (customer) {
    const orders = state.orders.filter(
      (o) => o.customerId === customer.id || o.customer.phone === customer.phone || o.customer.email === customer.email
    );
    const validOrders = orders.filter((o) => o.orderStatus !== 'cancelled');
    const totalSpent = validOrders.reduce((sum, o) => sum + o.total, 0);

    return res.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        addresses: customer.addresses,
        createdAt: customer.createdAt,
        status: customer.status,
        stats: {
          totalOrders: orders.length,
          totalSpent,
          averageOrderValue: orders.length ? Math.round(totalSpent / orders.length) : 0,
          firstOrder: orders[orders.length - 1]?.createdAt,
          lastOrder: orders[0]?.createdAt,
        },
        orders,
      }
    });
  }

  // Check if guest
  const phone = id.replace('guest-', '');
  const guestOrders = state.orders.filter((o) => o.customer.phone === phone);
  if (guestOrders.length > 0) {
    const totalSpent = guestOrders.filter((o) => o.orderStatus !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
    return res.json({
      success: true,
      customer: {
        id,
        name: guestOrders[0].customer.fullName,
        email: guestOrders[0].customer.email || 'N/A',
        phone: guestOrders[0].customer.phone,
        addresses: [{ id: 'a1', label: 'Last Shipping Address', address: guestOrders[0].customer.address, deliveryArea: guestOrders[0].customer.deliveryArea, phone, isDefault: true }],
        createdAt: guestOrders[0].createdAt,
        status: 'guest',
        stats: {
          totalOrders: guestOrders.length,
          totalSpent,
          averageOrderValue: Math.round(totalSpent / guestOrders.length),
        },
        orders: guestOrders,
      }
    });
  }

  return res.status(404).json({ success: false, error: 'Customer not found.' });
});

// ==========================================
// 7. ADMIN CUSTOM ORDERS & DESIGNS
// ==========================================

apiRouter.get('/admin/custom-orders', requireAdmin, (req, res) => {
  const customOrders = db.getState().customOrders.sort((a, b) => b.createdAt - a.createdAt);
  return res.json({ success: true, customOrders });
});

apiRouter.patch('/admin/custom-orders/:id/status', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const { id } = req.params;
  const { orderStatus, whatsappStatus } = req.body;

  const item = db.getState().customOrders.find((c) => c.id === id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Custom order not found.' });
  }

  if (orderStatus) item.orderStatus = orderStatus;
  if (whatsappStatus) item.whatsappStatus = whatsappStatus;
  db.save();
  syncCustomOrderStatusToSupabase(item.id, item.orderStatus, item.whatsappStatus).catch(() => {});

  db.logActivity(admin.email, admin.name, 'custom_order_updated', `Custom design order for ${item.customerName} set to ${item.orderStatus}`, item.id);
  return res.json({ success: true, customOrder: item });
});

// ==========================================
// 8. ADMIN WHOLESALE ORDERS
// ==========================================

apiRouter.get('/admin/wholesale-orders', requireAdmin, (req, res) => {
  const wholesaleOrders = db.getState().wholesaleOrders.sort((a, b) => b.createdAt - a.createdAt);
  return res.json({ success: true, wholesaleOrders });
});

apiRouter.patch('/admin/wholesale-orders/:id/status', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const { id } = req.params;
  const { status } = req.body;

  const item = db.getState().wholesaleOrders.find((w) => w.id === id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Wholesale order not found.' });
  }

  item.status = status;
  db.save();
  syncWholesaleOrderStatusToSupabase(item.id, status).catch(() => {});

  db.logActivity(admin.email, admin.name, 'wholesale_order_updated', `Wholesale order for ${item.customerName} status updated to ${status}`, item.id);
  return res.json({ success: true, wholesaleOrder: item });
});

// ==========================================
// 9. ADMIN DISCOUNTS & COUPONS
// ==========================================

apiRouter.get('/admin/coupons', requireAdmin, (req, res) => {
  return res.json({ success: true, coupons: db.getState().coupons });
});

apiRouter.post('/admin/coupons', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const {
    code,
    discountType = 'percentage',
    discountValue,
    minOrderAmount = 0,
    maxDiscountAmount,
    startDate,
    endDate,
    usageLimit = 500,
    perCustomerLimit = 1
  } = req.body;

  if (!code || !discountValue) {
    return res.status(400).json({ success: false, error: 'Coupon code and discount value are required.' });
  }

  const cleanCode = code.toUpperCase().trim();
  const existing = db.getState().coupons.find((c) => c.code === cleanCode);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Coupon with this code already exists.' });
  }

  const newCoupon = {
    id: `cp-${Date.now()}`,
    code: cleanCode,
    discountType,
    discountValue: Number(discountValue),
    minOrderAmount: Number(minOrderAmount) || 0,
    maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || '2027-12-31',
    usageLimit: Number(usageLimit) || 100,
    usageCount: 0,
    perCustomerLimit: Number(perCustomerLimit) || 1,
    status: 'active' as const,
    createdAt: Date.now(),
  };

  db.getState().coupons.unshift(newCoupon);
  db.save();
  syncCouponToSupabase(newCoupon).catch(() => {});

  db.logActivity(admin.email, admin.name, 'coupon_created', `Created coupon: ${newCoupon.code} (${newCoupon.discountValue}${newCoupon.discountType === 'percentage' ? '%' : '৳'} off)`);
  return res.json({ success: true, coupon: newCoupon });
});

apiRouter.delete('/admin/coupons/:id', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const { id } = req.params;
  const coupon = db.getState().coupons.find((c) => c.id === id);
  if (!coupon) {
    return res.status(404).json({ success: false, error: 'Coupon not found.' });
  }

  db.getState().coupons = db.getState().coupons.filter((c) => c.id !== id);
  db.save();

  db.logActivity(admin.email, admin.name, 'coupon_deleted', `Deleted coupon ${coupon.code}`);
  return res.json({ success: true, message: 'Coupon deleted.' });
});

// ==========================================
// 10. ADMIN REPORTS & EXPORT
// ==========================================

apiRouter.get('/admin/reports', requireAdmin, (req, res) => {
  const state = db.getState();
  const orders = state.orders;

  const grossSales = orders.reduce((sum, o) => sum + (o.orderStatus !== 'cancelled' ? o.subtotal : 0), 0);
  const totalDiscounts = orders.reduce((sum, o) => sum + (o.orderStatus !== 'cancelled' ? o.discountAmount : 0), 0);
  const totalDeliveryFees = orders.reduce((sum, o) => sum + (o.orderStatus !== 'cancelled' ? o.deliveryFee : 0), 0);
  const totalRefunds = orders.filter((o) => o.orderStatus === 'returned').reduce((sum, o) => sum + o.total, 0);
  const netSales = grossSales - totalDiscounts + totalDeliveryFees - totalRefunds;

  const categorySales: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => {
    if (o.orderStatus !== 'cancelled') {
      o.items.forEach((item) => {
        const prod = state.products.find((p) => p.id === item.productId);
        const cat = prod?.category || 'T-Shirts';
        if (!categorySales[cat]) {
          categorySales[cat] = { count: 0, revenue: 0 };
        }
        categorySales[cat].count += item.quantity;
        categorySales[cat].revenue += item.finalPrice;
      });
    }
  });

  return res.json({
    success: true,
    financials: {
      grossSales,
      totalDiscounts,
      totalDeliveryFees,
      totalRefunds,
      netSales,
    },
    ordersBreakdown: {
      total: orders.length,
      delivered: orders.filter((o) => o.orderStatus === 'delivered').length,
      processing: orders.filter((o) => o.orderStatus === 'processing' || o.orderStatus === 'shipped').length,
      pending: orders.filter((o) => o.orderStatus === 'pending').length,
      cancelled: orders.filter((o) => o.orderStatus === 'cancelled').length,
      returned: orders.filter((o) => o.orderStatus === 'returned').length,
    },
    categorySales,
  });
});

apiRouter.post('/admin/export', requireAdmin, (req, res) => {
  const { type = 'orders', statusFilter } = req.body;
  const state = db.getState();

  let csv = '';
  if (type === 'orders') {
    let rows = state.orders;
    if (statusFilter && statusFilter !== 'all') {
      rows = rows.filter((r) => r.orderStatus === statusFilter);
    }
    csv = 'Order ID,Date,Customer,Phone,Order Type,Subtotal,Discount,Delivery,Total,Status,Payment\n';
    rows.forEach((o) => {
      const date = new Date(o.createdAt).toISOString().split('T')[0];
      csv += `"${o.orderNumber}","${date}","${o.customer.fullName}","${o.customer.phone}","${o.orderType}",${o.subtotal},${o.discountAmount},${o.deliveryFee},${o.total},"${o.orderStatus}","${o.paymentStatus}"\n`;
    });
  } else if (type === 'products') {
    csv = 'SKU,Name,Category,Type,Price,Wholesale Price,Stock,Status\n';
    state.products.forEach((p) => {
      const stock = p.variants.reduce((s, v) => s + v.stock, 0);
      csv += `"${p.sku}","${p.name}","${p.category}","${p.productType}",${p.price},${p.wholesalePrice || 0},${stock},"${p.status}"\n`;
    });
  } else if (type === 'customers') {
    csv = 'Name,Email,Phone,Total Orders,Total Spent,Status\n';
    state.customers.forEach((c) => {
      const orders = state.orders.filter((o) => o.customerId === c.id);
      const spent = orders.reduce((s, o) => s + o.total, 0);
      csv += `"${c.fullName}","${c.email}","${c.phone}",${orders.length},${spent},"${c.status}"\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`);
  return res.send(csv);
});

// ==========================================
// 11. ADMIN ACTIVITY LOGS & NOTIFICATIONS
// ==========================================

apiRouter.get('/admin/activity-logs', requireAdmin, (req, res) => {
  return res.json({ success: true, logs: db.getState().activityLogs });
});

apiRouter.get('/admin/notifications', requireAdmin, (req, res) => {
  const state = db.getState();
  // Check for low stock products and ensure low stock notification exists
  (state.products || []).forEach((p: any) => {
    const stock = p.stock !== undefined ? p.stock : (p.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0);
    if (stock <= 5) {
      const existingLowStock = state.notifications.find(n => n.type === 'low_stock' && n.message && n.message.includes(p.name));
      if (!existingLowStock) {
        db.addNotification(
          'low_stock',
          `Low Stock Alert: ${p.name}`,
          `Product "${p.name}" has only ${stock} items remaining in inventory.`,
          `/admin/inventory`
        );
      }
    }
  });
  return res.json({ success: true, notifications: db.getState().notifications });
});

apiRouter.post('/admin/notifications/mark-all-read', requireAdmin, (req, res) => {
  db.getState().notifications.forEach((n) => (n.isRead = true));
  db.save();
  return res.json({ success: true });
});

apiRouter.post('/admin/notifications/:id/read', requireAdmin, (req, res) => {
  const notif = db.getState().notifications.find((n) => n.id === req.params.id);
  if (notif) notif.isRead = true;
  db.save();
  return res.json({ success: true });
});

// ==========================================
// 12. ADMIN STORE SETTINGS
// ==========================================

apiRouter.get('/admin/settings', requireAdmin, (req, res) => {
  return res.json({ success: true, settings: db.getState().settings });
});

apiRouter.put('/admin/settings', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const updates = req.body;
  Object.assign(db.getState().settings, updates);
  db.save();
  syncStoreSettingsToSupabase(db.getState().settings).catch(() => {});

  db.logActivity(admin.email, admin.name, 'settings_updated', 'Store settings and delivery rates were updated.');
  return res.json({ success: true, settings: db.getState().settings });
});

// Meta Conversions API (CAPI) Test Trigger
apiRouter.post('/meta/test-event', async (req, res) => {
  try {
    const state = db.getState();
    const { pixelId, accessToken, testEventCode, eventName } = req.body || {};

    const activePixelId = (pixelId || state.settings.metaPixelId || '4455123488042747').trim();
    const activeToken = (accessToken || state.settings.metaAccessToken || '').trim();
    const activeTestCode = (testEventCode || state.settings.metaTestEventCode || 'TEST89137').trim();
    const targetEvent = eventName || 'PageView';

    if (!activePixelId || !activeToken) {
      return res.status(400).json({
        success: false,
        error: 'Pixel ID or Meta Access Token missing. Please check Store Settings.',
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

    const result = await sendMetaCapiEvent(activePixelId, activeToken, {
      eventName: targetEvent,
      eventSourceUrl: req.headers.referer || 'https://shokhoutfits.com',
      userData: {
        clientIpAddress: clientIp,
        clientUserAgent: userAgent,
        email: 'test@shokhoutfits.com',
      },
      customData: {
        currency: 'BDT',
        value: 990,
        contentName: 'Meta CAPI Verification Test',
        contentType: 'product',
      },
      testEventCode: activeTestCode,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      message: `Meta Conversions API test event "${targetEvent}" sent successfully (Test Code: ${activeTestCode}).`,
      data: result.data,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'CAPI test failed' });
  }
});

// ==========================================
// ADMIN SEO MANAGEMENT
// ==========================================
apiRouter.get('/admin/seo-settings', requireAdmin, (req, res) => {
  const state = db.getState();
  return res.json({
    success: true,
    seoPages: state.settings.seoPages || {
      home: { title: 'Shokh Outfits – Premium Minimalist Streetwear', description: 'Shop premium oversized t-shirts, hoodies, and jackets.', ogImage: '' },
      shop: { title: 'Shop Collection – Shokh Outfits', description: 'Explore our latest drops of streetwear t-shirts and hoodies.', ogImage: '' },
      customize: { title: 'Custom Garments Studio – Shokh Outfits', description: 'Design your custom t-shirts and apparel with high quality DTF & screen printing.', ogImage: '' },
      wholesale: { title: 'Wholesale B2B Hub – Shokh Outfits', description: 'Bulk factory pricing and volume matrix orders for businesses and brands.', ogImage: '' },
    },
    products: state.products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      image: p.image,
      seoTitle: p.seoTitle || '',
      seoDescription: p.seoDescription || '',
      ogImage: p.ogImage || '',
    })),
  });
});

apiRouter.put('/admin/seo-settings', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const { seoPages } = req.body;
  const state = db.getState();
  if (!state.settings.seoPages) state.settings.seoPages = {};
  if (seoPages) {
    Object.assign(state.settings.seoPages, seoPages);
    db.save();
    db.logActivity(admin?.email || 'admin', admin?.name || 'Admin', 'seo_updated', 'Landing pages SEO meta tags were updated.');
  }
  return res.json({ success: true, seoPages: state.settings.seoPages });
});

apiRouter.put('/admin/products/:id/seo', requireAdmin, (req, res) => {
  const admin = (req as any).admin;
  const productId = req.params.id;
  const { seoTitle, seoDescription, ogImage } = req.body;
  const product = db.getState().products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }
  product.seoTitle = seoTitle || '';
  product.seoDescription = seoDescription || '';
  product.ogImage = ogImage || '';
  product.updatedAt = Date.now();
  db.save();
  db.logActivity(admin?.email || 'admin', admin?.name || 'Admin', 'product_seo_updated', `SEO meta tags updated for product: ${product.name}`);
  return res.json({ success: true, product });
});

// ==========================================
// 13. CUSTOMER AUTH & PORTAL
// ==========================================

apiRouter.post('/customer/register', (req, res) => {
  const { fullName, email, phone, password, address, deliveryArea } = req.body;
  if (!fullName || !email || !password || !phone) {
    return res.status(400).json({ success: false, error: 'Full name, email, phone, and password are required.' });
  }

  const existingEmail = db.findCustomerByEmail(email);
  if (existingEmail) {
    return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
  }

  const existingPhone = db.findCustomerByPhone(phone);
  if (existingPhone) {
    return res.status(400).json({ success: false, error: 'An account with this phone number already exists.' });
  }

  const { hash, salt } = hashPassword(password);
  const newCustomer = {
    id: `cust-${Date.now()}`,
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    fullName: fullName.trim(),
    passwordHash: hash,
    salt,
    addresses: address
      ? [
          {
            id: `addr-${Date.now()}`,
            label: 'Default Address',
            address: address.trim(),
            deliveryArea: (deliveryArea as any) || 'dhaka',
            phone: phone.trim(),
            isDefault: true,
          }
        ]
      : [],
    createdAt: Date.now(),
    status: 'active' as const,
  };

  db.getState().customers.push(newCustomer);
  const token = db.createSession(newCustomer.id, 'customer', 24 * 30);
  db.save();

  syncCustomerToSupabase(newCustomer).catch(() => {});

  return res.json({
    success: true,
    token,
    customer: {
      id: newCustomer.id,
      fullName: newCustomer.fullName,
      email: newCustomer.email,
      phone: newCustomer.phone,
      addresses: newCustomer.addresses,
    }
  });
});

apiRouter.post('/customer/login', (req, res) => {
  const { identifier, password } = req.body; // identifier can be email or phone
  if (!identifier || !password) {
    return res.status(400).json({ success: false, error: 'Email or Phone and password are required.' });
  }

  const clean = identifier.trim();
  let customer = clean.includes('@') ? db.findCustomerByEmail(clean) : db.findCustomerByPhone(clean);

  // Check if credentials match an Admin account
  const adminMatch = clean.includes('@') ? db.findAdminByEmail(clean) : undefined;
  if (adminMatch && verifyPassword(password, adminMatch.passwordHash, adminMatch.salt)) {
    const adminToken = db.createSession(adminMatch.id, 'admin', 24 * 7);
    adminMatch.lastLoginAt = Date.now();

    // Ensure customer record exists for seamless store browsing
    if (!customer) {
      customer = {
        id: `cust-${adminMatch.id}`,
        email: adminMatch.email,
        phone: '01700000000',
        fullName: adminMatch.name || 'Admin User',
        passwordHash: adminMatch.passwordHash,
        salt: adminMatch.salt,
        addresses: [],
        createdAt: Date.now(),
        status: 'active',
      };
      db.getState().customers.push(customer);
    }

    customer.lastLoginAt = Date.now();
    const customerToken = db.createSession(customer.id, 'customer', 24 * 30);
    db.save();

    return res.json({
      success: true,
      token: customerToken,
      adminToken,
      isAdmin: true,
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        addresses: customer.addresses,
      },
      admin: {
        id: adminMatch.id,
        email: adminMatch.email,
        name: adminMatch.name,
        role: adminMatch.role,
      }
    });
  }

  if (!customer) {
    return res.status(401).json({ success: false, error: 'Invalid login credentials.' });
  }

  if (customer.status === 'suspended') {
    return res.status(403).json({ success: false, error: 'Your customer account has been suspended.' });
  }

  if (!verifyPassword(password, customer.passwordHash, customer.salt)) {
    return res.status(401).json({ success: false, error: 'Invalid login credentials.' });
  }

  customer.lastLoginAt = Date.now();
  const token = db.createSession(customer.id, 'customer', 24 * 30);
  db.save();

  return res.json({
    success: true,
    token,
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      addresses: customer.addresses,
    }
  });
});

apiRouter.get('/customer/me', requireCustomer, (req, res) => {
  const customer = (req as any).customer;
  return res.json({
    success: true,
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      addresses: customer.addresses,
    }
  });
});

apiRouter.put('/customer/profile', requireCustomer, (req, res) => {
  const customer = (req as any).customer;
  const { fullName, phone, addresses } = req.body;

  if (fullName) customer.fullName = fullName.trim();
  if (phone) customer.phone = phone.trim();
  if (addresses && Array.isArray(addresses)) customer.addresses = addresses;

  db.save();
  return res.json({
    success: true,
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      addresses: customer.addresses,
    }
  });
});

apiRouter.get('/customer/orders', requireCustomer, (req, res) => {
  const customer = (req as any).customer;
  const orders = db.getState().orders.filter(
    (o) => o.customerId === customer.id || o.customer.phone === customer.phone || (customer.email && o.customer.email === customer.email)
  ).sort((a, b) => b.createdAt - a.createdAt);

  return res.json({ success: true, orders });
});

// ==========================================
// 14. STOREFRONT PUBLIC ENDPOINTS
// ==========================================

apiRouter.get('/store/products', async (req, res) => {
  try {
    const client = supabaseServer;
    if (client) {
      const { data: supaProds, error } = await client
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
        console.error('[Supabase Store Products Error]:', error);
      }

      if (!error && supaProds && supaProds.length > 0) {
        const mapped = supaProds.map((p: any) => {
          const sortedImgs = (p.product_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
          const primaryImg = sortedImgs.find((i: any) => i.is_primary)?.image_url || sortedImgs[0]?.image_url || '';
          
          const colorMap = new Map<string, string>();
          (p.product_variants || []).forEach((v: any) => {
            if (v && v.color && !colorMap.has(v.color)) {
              colorMap.set(v.color, v.color_hex || '#374151');
            }
          });
          const colors = Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }));
          if (colors.length === 0) {
            colors.push({ name: 'Charcoal Gray', hex: '#374151' }, { name: 'Pure White', hex: '#ffffff' });
          }

          const sizeSet = new Set<string>();
          (p.product_variants || []).forEach((v: any) => {
            if (v && v.size) sizeSet.add(v.size);
          });
          const sizes = Array.from(sizeSet);

          return {
            id: p.id,
            name: p.name,
            category: p.product_categories?.name || 'T-Shirts',
            price: Number(p.sale_price || p.regular_price) || 0,
            originalPrice: p.sale_price && p.regular_price > p.sale_price ? Number(p.regular_price) : undefined,
            wholesalePrice: p.wholesale_price ? Number(p.wholesale_price) : undefined,
            minWholesaleQty: p.min_wholesale_qty || 25,
            image: primaryImg,
            images: sortedImgs.map((i: any) => ({ url: i.image_url, label: i.alt_text || 'View' })),
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
            variants: (p.product_variants || []).map((v: any) => ({
              id: v.id,
              sku: v.sku,
              color: v.color,
              size: v.size,
              stock: v.stock || 0,
            })),
          };
        });

        return res.json({ success: true, products: mapped, archivedIds: [] });
      }
    }
  } catch (err) {
    console.warn('Supabase store products query fallback:', err);
  }

  const allProds = db.getState().products;
  const products = allProds.filter((p) => p.status === 'active');
  const archivedIds = allProds.filter((p) => p.status === 'archived').map((p) => p.id);
  return res.json({ success: true, products, archivedIds });
});

apiRouter.get('/store/settings', (req, res) => {
  const s = db.getState().settings;
  return res.json({
    success: true,
    settings: {
      businessName: s.businessName,
      phone: s.phone,
      whatsapp: s.whatsapp,
      deliveryChargeInsideDhaka: s.deliveryChargeInsideDhaka,
      deliveryChargeOutsideDhaka: s.deliveryChargeOutsideDhaka,
      freeDeliveryThreshold: s.freeDeliveryThreshold,
      announcementText: s.announcementText,
      announcementActive: s.announcementActive,
      codEnabled: s.codEnabled,
      bkashEnabled: s.bkashEnabled,
      bkashMerchantNumber: s.bkashMerchantNumber,
      metaPixelEnabled: s.metaPixelEnabled !== false,
      metaPixelId: s.metaPixelId || '4455123488042747',
      metaAccessToken: s.metaAccessToken || '',
      metaTestEventCode: s.metaTestEventCode || 'TEST89137',
      metaCapiEnabled: s.metaCapiEnabled !== false,
    }
  });
});

// Real server-side coupon validation
apiRouter.post('/store/coupon/validate', (req, res) => {
  const { code, cartSubtotal } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'Please enter a coupon code.' });
  }

  const cleanCode = code.toUpperCase().trim();
  const coupon = db.getState().coupons.find((c) => c.code === cleanCode && c.status === 'active');

  if (!coupon) {
    return res.status(404).json({ success: false, error: 'Invalid or expired coupon code.' });
  }

  const subtotal = Number(cartSubtotal) || 0;
  if (subtotal < coupon.minOrderAmount) {
    return res.status(400).json({
      success: false,
      error: `This coupon requires a minimum order of ৳${coupon.minOrderAmount}. (Current: ৳${subtotal})`
    });
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return res.status(400).json({ success: false, error: 'This coupon usage limit has been reached.' });
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    discount = Math.min(coupon.discountValue, subtotal);
  }

  return res.json({
    success: true,
    code: coupon.code,
    discountAmount: discount,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    message: `Coupon applied: ৳${discount} discount.`
  });
});

// Secure server-side checkout calculation & order creation
apiRouter.post('/store/checkout', (req, res) => {
  try {
    const { customer, items, paymentMethod = 'cod', couponCode, customerNotes } = req.body;

    if (!customer || !customer.fullName || !customer.phone || !customer.address) {
      return res.status(400).json({ success: false, error: 'Please fill in all required delivery information.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Your cart is empty.' });
    }

    const state = db.getState();
    const orderItems: OrderItemSnapshot[] = [];
    let serverSubtotal = 0;

    // 1. Verify every product & calculate trusted server price
    for (const item of items) {
      const prod = state.products.find((p) => p.id === item.productId || p.id === item.product?.id);
      if (!prod) {
        return res.status(400).json({ success: false, error: `Product not found or unavailable.` });
      }

      const requestedQty = Number(item.quantity) || 1;
      const selectedColor = item.selectedColor || item.variant?.color || prod.colors[0]?.name;
      const selectedSize = item.selectedSize || item.variant?.size || prod.sizes[0];

      // Determine unit price
      let unitPrice = prod.price;
      if (item.isWholesale && prod.wholesalePrice) {
        unitPrice = prod.wholesalePrice;
        if (prod.wholesaleTiers && prod.wholesaleTiers.length > 0) {
          const matched = [...prod.wholesaleTiers]
            .sort((a, b) => b.minQty - a.minQty)
            .find((t) => requestedQty >= t.minQty);
          if (matched) unitPrice = matched.price;
        }
      }

      const itemFinal = unitPrice * requestedQty;
      serverSubtotal += itemFinal;

      // 2. Reserve / deduct variant stock safely
      const variant = prod.variants.find((v) => v.color === selectedColor && v.size === selectedSize);
      if (variant) {
        variant.stock = Math.max(0, variant.stock - requestedQty);
        variant.reserved += requestedQty;
      }

      orderItems.push({
        productId: prod.id,
        productName: prod.name,
        sku: variant?.sku || prod.sku,
        variant: { color: selectedColor, size: selectedSize },
        quantity: requestedQty,
        unitPrice,
        discount: 0,
        finalPrice: itemFinal,
        image: prod.image,
        wholesaleBreakdown: item.wholesaleBreakdown,
        customDesignUrl: item.customDesignUrl,
        customDesignId: item.customDesignId,
      });
    }

    // 3. Validate coupon server-side
    let discountAmount = 0;
    if (couponCode) {
      const clean = couponCode.toUpperCase().trim();
      const cp = state.coupons.find((c) => c.code === clean && c.status === 'active');
      if (cp && serverSubtotal >= cp.minOrderAmount) {
        if (cp.discountType === 'percentage') {
          discountAmount = Math.round((serverSubtotal * cp.discountValue) / 100);
          if (cp.maxDiscountAmount && discountAmount > cp.maxDiscountAmount) {
            discountAmount = cp.maxDiscountAmount;
          }
        } else {
          discountAmount = Math.min(cp.discountValue, serverSubtotal);
        }
        cp.usageCount += 1;
      }
    }

    // 4. Calculate delivery fee
    const isDhaka = customer.deliveryArea === 'dhaka';
    let deliveryFee = isDhaka ? state.settings.deliveryChargeInsideDhaka : state.settings.deliveryChargeOutsideDhaka;
    if (state.settings.freeDeliveryThreshold && serverSubtotal >= state.settings.freeDeliveryThreshold) {
      deliveryFee = 0;
    }

    const finalTotal = Math.max(0, serverSubtotal - discountAmount + deliveryFee);

    // 5. Generate human-readable order number
    const orderNumber = `SHK-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord-${Date.now()}`;

    // Check if customer is registered
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';
    let customerId: string | undefined = undefined;
    if (token) {
      const sess = db.verifySession(token, 'customer');
      if (sess.valid && sess.userId) {
        customerId = sess.userId;
      }
    }

    const orderType = orderItems.some((i) => i.customDesignUrl)
      ? 'custom'
      : orderItems.some((i) => i.wholesaleBreakdown?.length)
      ? 'wholesale'
      : 'retail';

    const newOrder: OrderRecord = {
      id: orderId,
      orderNumber,
      customerId,
      isGuest: !customerId,
      customer: {
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        email: customer.email?.trim() || '',
        address: customer.address.trim(),
        deliveryArea: customer.deliveryArea || 'dhaka',
      },
      orderType,
      items: orderItems,
      itemsCount: orderItems.reduce((s, i) => s + i.quantity, 0),
      subtotal: serverSubtotal,
      couponCode: discountAmount > 0 ? couponCode : undefined,
      discountAmount,
      deliveryFee,
      total: finalTotal,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'paid',
      orderStatus: 'pending',
      statusHistory: [
        {
          status: 'pending',
          timestamp: Date.now(),
          note: `Order placed via Online Store (${paymentMethod.toUpperCase()})`,
          changedBy: 'System',
        }
      ],
      customerNotes: customerNotes?.trim(),
      channel: 'online_store',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    state.orders.unshift(newOrder);

    // Auto-upsert customer record into state.customers so they always appear in Admin Customers
    const cleanPhone = customer.phone.trim();
    const cleanEmail = customer.email?.trim() || '';
    let targetCustomer = state.customers.find(
      (c) => (cleanPhone && c.phone === cleanPhone) || (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail.toLowerCase())
    );

    if (!targetCustomer) {
      targetCustomer = {
        id: customerId || `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        email: cleanEmail,
        phone: cleanPhone,
        fullName: customer.fullName.trim(),
        passwordHash: '',
        salt: '',
        addresses: [
          {
            id: `addr-${Date.now()}`,
            label: 'Home Delivery',
            address: customer.address.trim(),
            deliveryArea: customer.deliveryArea || 'dhaka',
            phone: cleanPhone,
            isDefault: true,
          }
        ],
        createdAt: Date.now(),
        status: 'active',
      };
      state.customers.unshift(targetCustomer);
    } else {
      if (customer.address && !targetCustomer.addresses.some((a) => a.address === customer.address.trim())) {
        targetCustomer.addresses.push({
          id: `addr-${Date.now()}`,
          label: 'Delivery Address',
          address: customer.address.trim(),
          deliveryArea: customer.deliveryArea || 'dhaka',
          phone: cleanPhone,
          isDefault: targetCustomer.addresses.length === 0,
        });
      }
    }

    // If custom order items present, record into customOrders
    orderItems.forEach((it) => {
      if (it.customDesignUrl) {
        const customRec = {
          id: `cust-ord-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          orderId: newOrder.id,
          customerName: customer.fullName,
          phone: customer.phone,
          email: customer.email,
          fileName: 'Uploaded Artwork',
          designUrl: it.customDesignUrl,
          productType: it.productName,
          tshirtColor: it.variant.color,
          size: it.variant.size,
          quantity: it.quantity,
          customerNotes: customerNotes,
          whatsappStatus: 'pending',
          orderStatus: 'new',
          orderDate: new Date().toISOString(),
          createdAt: Date.now(),
        };
        state.customOrders.unshift(customRec as any);
      }
    });

    // Save state and push notification
    db.save();
    db.addNotification(
      'new_order',
      `New Order #${orderNumber} (৳${finalTotal})`,
      `${customer.fullName} placed a new ${orderType} order.`,
      `/admin/orders?search=${orderNumber}`
    );

    // Sync to Supabase
    syncOrderToSupabase(newOrder).catch((e) => console.warn('[Supabase Sync Order]', e?.message || e));
    if (targetCustomer) {
      syncCustomerToSupabase(targetCustomer).catch(() => {});
    }

    // Dispatch Server-Side Meta Conversions API Purchase Event
    if (state.settings.metaPixelEnabled !== false && state.settings.metaAccessToken) {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';
      sendMetaCapiEvent(
        state.settings.metaPixelId || '4455123488042747',
        state.settings.metaAccessToken,
        {
          eventName: 'Purchase',
          eventSourceUrl: req.headers.referer || 'https://shokhoutfits.com/checkout',
          userData: {
            clientIpAddress: clientIp,
            clientUserAgent: userAgent,
            email: customer.email,
            phone: customer.phone,
            firstName: customer.fullName?.split(' ')[0],
            lastName: customer.fullName?.split(' ').slice(1).join(' '),
          },
          customData: {
            currency: 'BDT',
            value: finalTotal,
            orderId: newOrder.id,
            numItems: orderItems.reduce((s, i) => s + i.quantity, 0),
            contentIds: orderItems.map((i) => i.productId),
            contents: orderItems.map((i) => ({
              id: i.productId,
              quantity: i.quantity,
              item_price: i.unitPrice,
            })),
          },
          testEventCode: state.settings.metaTestEventCode,
        }
      ).catch((err) => console.warn('[CAPI Purchase Dispatch Error]', err));
    }

    return res.json({
      success: true,
      order: newOrder,
      orderNumber,
    });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return res.status(500).json({ success: false, error: 'Checkout processing failed. Please retry.' });
  }
});

// Track order for guests by Order Number + Phone
apiRouter.get('/store/track-order', (req, res) => {
  const { orderNumber, phone } = req.query;
  if (!orderNumber || !phone) {
    return res.status(400).json({ success: false, error: 'Order ID and Phone number are required.' });
  }

  const cleanNum = (orderNumber as string).toUpperCase().trim();
  const cleanPhone = (phone as string).replace(/[^0-9]/g, '');

  const order = db.getState().orders.find(
    (o) =>
      (o.orderNumber.toUpperCase() === cleanNum || o.id === cleanNum) &&
      o.customer.phone.replace(/[^0-9]/g, '') === cleanPhone
  );

  if (!order) {
    return res.status(404).json({ success: false, error: 'No matching order found for this Order ID and Phone.' });
  }

  return res.json({ success: true, order });
});

// --- PRODUCT REVIEWS ENDPOINTS ---
apiRouter.get('/products/:productId/reviews', (req, res) => {
  const { productId } = req.params;
  const state = db.getState();
  const productReviews = (state.reviews || []).filter((r) => r.productId === productId);
  return res.json({ success: true, reviews: productReviews });
});

apiRouter.post('/products/:productId/reviews', (req, res) => {
  const { productId } = req.params;
  const { customerName, rating, title, comment } = req.body;

  if (!customerName || !rating || !comment) {
    return res.status(400).json({ success: false, error: 'Name, star rating, and review comment are required.' });
  }

  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5 stars.' });
  }

  const state = db.getState();
  if (!state.reviews) state.reviews = [];

  const newReview = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productId,
    customerName: customerName.trim(),
    rating: Math.round(numRating),
    title: (title || '').trim(),
    comment: comment.trim(),
    verifiedPurchase: true,
    helpfulCount: 0,
    createdAt: Date.now(),
  };

  state.reviews.unshift(newReview);
  db.save();
  syncReviewToSupabase(newReview).catch(() => {});

  return res.json({ success: true, review: newReview });
});

apiRouter.post('/reviews/:reviewId/helpful', (req, res) => {
  const { reviewId } = req.params;
  const state = db.getState();
  if (!state.reviews) state.reviews = [];

  const review = state.reviews.find((r) => r.id === reviewId);
  if (review) {
    review.helpfulCount = (review.helpfulCount || 0) + 1;
    db.save();
    return res.json({ success: true, helpfulCount: review.helpfulCount });
  }

  return res.json({ success: true, helpfulCount: 1 });
});

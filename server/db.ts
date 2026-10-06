import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Types for backend entities
export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager';
  createdAt: number;
  lastLoginAt?: number;
  failedAttempts: number;
  lockedUntil?: number;
}

export interface CustomerAddress {
  id: string;
  label: string;
  address: string;
  deliveryArea: 'dhaka' | 'outside';
  phone: string;
  isDefault: boolean;
}

export interface CustomerUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  passwordHash: string;
  salt: string;
  addresses: CustomerAddress[];
  createdAt: number;
  lastLoginAt?: number;
  status: 'active' | 'suspended';
}

export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  reserved: number;
  priceOverride?: number;
}

export interface ProductRecord {
  id: string;
  name: string;
  productType: 'normal' | 'printed' | 'wholesale';
  productTypes?: string[];
  category: 'T-Shirts' | 'Printed T-Shirts' | 'Hoodies';
  price: number;
  originalPrice?: number;
  wholesalePrice?: number;
  wholesaleTiers?: { minQty: number; maxQty?: number; price: number }[];
  minWholesaleQty?: number;
  image: string;
  images: { url: string; label: string }[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  description: string;
  shortDescription?: string;
  fabric: string;
  gsm: string;
  fit: string;
  badge?: string;
  sku: string;
  brand: string;
  tags: string[];
  variants: ProductVariant[];
  status: 'active' | 'draft' | 'archived';
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrderItemSnapshot {
  productId: string;
  productName: string;
  sku: string;
  variant: {
    color: string;
    size: string;
  };
  quantity: number;
  unitPrice: number;
  discount: number;
  finalPrice: number;
  image: string;
  wholesaleBreakdown?: { color: string; size: string; quantity: number }[];
  customDesignUrl?: string;
  customDesignId?: string;
}

export interface StatusHistoryEntry {
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  timestamp: number;
  note?: string;
  changedBy: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId?: string;
  isGuest: boolean;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    address: string;
    deliveryArea: 'dhaka' | 'outside';
  };
  orderType: 'retail' | 'printed' | 'wholesale' | 'custom';
  items: OrderItemSnapshot[];
  itemsCount: number;
  subtotal: number;
  couponCode?: string;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: 'cod' | 'bkash' | 'nagad' | 'card' | 'online';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  statusHistory: StatusHistoryEntry[];
  customerNotes?: string;
  trackingNumber?: string;
  channel: 'online_store' | 'wholesale' | 'pos' | 'whatsapp';
  createdAt: number;
  updatedAt: number;
}

export interface CustomOrderRecord {
  id: string;
  orderId?: string;
  customerName: string;
  phone: string;
  email?: string;
  designId?: string;
  designUrl?: string;
  fileName: string;
  productType: string;
  tshirtColor: string;
  size: string;
  quantity: number;
  customerNotes?: string;
  whatsappStatus: 'pending' | 'contacted' | 'approved';
  orderStatus: 'new' | 'proof_sent' | 'in_production' | 'completed' | 'cancelled';
  orderDate: string;
  createdAt: number;
}

export interface WholesaleOrderRecord {
  id: string;
  orderId?: string;
  customerName: string;
  phone: string;
  email?: string;
  companyName?: string;
  productId: string;
  productName: string;
  totalQuantity: number;
  sizeBreakdown: Record<string, number>;
  colorBreakdown: Record<string, number>;
  matrix: { color: string; size: string; quantity: number }[];
  customerNotes?: string;
  wholesaleUnitPrice: number;
  totalAmount: number;
  status: 'new' | 'negotiation' | 'confirmed' | 'dispatched' | 'completed' | 'cancelled';
  createdAt: number;
}

export interface CouponRecord {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usageCount: number;
  perCustomerLimit: number;
  applicableCategories?: string[];
  status: 'active' | 'inactive';
  createdAt: number;
}

export interface AdminActivityLog {
  id: string;
  adminEmail: string;
  adminName: string;
  action: string;
  details: string;
  targetId?: string;
  timestamp: number;
}

export interface AdminNotification {
  id: string;
  type: 'new_order' | 'low_stock' | 'out_of_stock' | 'wholesale_order' | 'custom_design' | 'coupon_expiring';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: number;
}

export interface StoreSettings {
  businessName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  deliveryChargeInsideDhaka: number;
  deliveryChargeOutsideDhaka: number;
  freeDeliveryThreshold: number;
  lowStockThreshold: number;
  defaultMinWholesaleQty: number;
  codEnabled: boolean;
  bkashEnabled: boolean;
  bkashMerchantNumber: string;
  announcementText: string;
  announcementActive: boolean;
  metaPixelEnabled?: boolean;
  metaPixelId?: string;
  metaAccessToken?: string;
  metaTestEventCode?: string;
  metaCapiEnabled?: boolean;
  seoPages?: Record<string, { title: string; description: string; ogImage: string }>;
}

export interface ProductReview {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: number;
}

export interface DatabaseState {
  admins: AdminUser[];
  customers: CustomerUser[];
  products: ProductRecord[];
  orders: OrderRecord[];
  customOrders: CustomOrderRecord[];
  wholesaleOrders: WholesaleOrderRecord[];
  coupons: CouponRecord[];
  reviews: ProductReview[];
  activityLogs: AdminActivityLog[];
  notifications: AdminNotification[];
  settings: StoreSettings;
  sessions: { token: string; userId: string; role: 'admin' | 'customer'; expiresAt: number }[];
}

// Password hashing utilities using crypto
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return checkHash === hash;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store_db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Admin seed password: admin2026
const initialAdminSalt = 'shokh_admin_salt_2026';
const initialAdminHash = crypto.pbkdf2Sync('admin2026', initialAdminSalt, 1000, 64, 'sha512').toString('hex');

// Sokh Admin seed password: imtaslitimaz
const sokhAdminSalt = 'shokh_admin_salt_2026';
const sokhAdminHash = crypto.pbkdf2Sync('imtaslitimaz', sokhAdminSalt, 1000, 64, 'sha512').toString('hex');

// Initial Customer seed password: customer123
const initialCustomerSalt = 'shokh_customer_salt_2026';
const initialCustomerHash = crypto.pbkdf2Sync('customer123', initialCustomerSalt, 1000, 64, 'sha512').toString('hex');

const INITIAL_STATE: DatabaseState = {
  admins: [
    {
      id: 'admin-sokh',
      email: 'sokhtshirt@gmail.com',
      passwordHash: sokhAdminHash,
      salt: sokhAdminSalt,
      name: 'Shokh Admin',
      role: 'super_admin',
      createdAt: Date.now(),
      failedAttempts: 0,
    },
    {
      id: 'admin-1',
      email: 'bijoycreates001@gmail.com',
      passwordHash: initialAdminHash,
      salt: initialAdminSalt,
      name: 'Bijoy Admin',
      role: 'super_admin',
      createdAt: Date.now(),
      failedAttempts: 0,
    }
  ],
  customers: [
    {
      id: 'cust-bijoy-admin',
      email: 'bijoycreates001@gmail.com',
      phone: '01700000000',
      fullName: 'Bijoy Admin',
      passwordHash: initialAdminHash,
      salt: initialAdminSalt,
      addresses: [],
      createdAt: Date.now(),
      status: 'active',
    }
  ],
  products: [],
  orders: [],
  customOrders: [],
  wholesaleOrders: [],
  coupons: [],
  reviews: [],
  activityLogs: [],
  notifications: [],
  settings: {
    businessName: 'Shokh Outfits',
    tagline: 'Minimalist Streetwear & Custom Garments',
    phone: '+880 1346-068854',
    whatsapp: '+880 1346-068854',
    email: 'contact@shokhoutfits.com',
    address: 'Directly opposite Techno Showroom, Agamasi Lane, Kazi Alauddin Road, Nazira Bazar, Old Dhaka, Bangladesh',
    deliveryChargeInsideDhaka: 70,
    deliveryChargeOutsideDhaka: 130,
    freeDeliveryThreshold: 2500,
    lowStockThreshold: 10,
    defaultMinWholesaleQty: 25,
    codEnabled: true,
    bkashEnabled: true,
    bkashMerchantNumber: '01346068854',
    announcementText: 'Welcome to our store!',
    announcementActive: true,
    metaPixelEnabled: true,
    metaPixelId: '4455123488042747',
    metaAccessToken: 'EAAMVeXfzl2YBSoLiAA7eeVpxBdtISYLgCez7LzTOtZBhf5dzar54xQSLQeoHROun6Bvz8bS53gRZC5ZB1KoIV6TAKBChwtBdMueEicCndm8faUolnbJpE9wSs2pzAhC3R1vmWDii88dlZCV3HMTEhAXXVCijsi2SzoVC3XDIrpU4fztGiA1rO9xaqxyafQZDZD',
    metaTestEventCode: 'TEST89137',
    metaCapiEnabled: true,
  },
  sessions: [],
};

// Database persistence class with atomic write
class StoreDatabase {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure sokhtshirt@gmail.com is present in parsed.admins
        const admins = parsed.admins || [];
        const sokhIdx = admins.findIndex((a: any) => a.email?.toLowerCase() === 'sokhtshirt@gmail.com');
        if (sokhIdx === -1) {
          admins.unshift({
            id: 'admin-sokh',
            email: 'sokhtshirt@gmail.com',
            passwordHash: sokhAdminHash,
            salt: sokhAdminSalt,
            name: 'Shokh Admin',
            role: 'super_admin',
            createdAt: Date.now(),
            failedAttempts: 0,
          });
        } else {
          // Keep password hash updated
          admins[sokhIdx].passwordHash = sokhAdminHash;
          admins[sokhIdx].salt = sokhAdminSalt;
          admins[sokhIdx].role = 'super_admin';
        }
        parsed.admins = admins;

        // Merge with defaults in case of new fields
        return {
          ...INITIAL_STATE,
          ...parsed,
          settings: { ...INITIAL_STATE.settings, ...(parsed.settings || {}) },
        };
      }
    } catch (e) {
      console.error('Failed to read db file, using initial state:', e);
    }
    this.save(INITIAL_STATE);
    return INITIAL_STATE;
  }

  public save(newState?: DatabaseState): void {
    if (newState) {
      this.state = newState;
    }
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (e) {
      console.error('Failed to atomically write DB:', e);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  // --- Auth & Session Helpers ---
  public findAdminByEmail(email: string): AdminUser | undefined {
    return this.state.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
  }

  public findCustomerByEmail(email: string): CustomerUser | undefined {
    return this.state.customers.find((c) => c.email.toLowerCase() === email.toLowerCase());
  }

  public findCustomerByPhone(phone: string): CustomerUser | undefined {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return this.state.customers.find((c) => c.phone.replace(/[^0-9]/g, '') === cleanPhone);
  }

  public createSession(userId: string, role: 'admin' | 'customer', hoursValid = 48): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + hoursValid * 3600 * 1000;
    this.state.sessions.push({ token, userId, role, expiresAt });
    this.cleanExpiredSessions();
    this.save();
    return token;
  }

  public verifySession(token: string, expectedRole?: 'admin' | 'customer'): { valid: boolean; userId?: string; role?: 'admin' | 'customer' } {
    if (!token) return { valid: false };
    this.cleanExpiredSessions();
    const session = this.state.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
    if (!session) return { valid: false };
    if (expectedRole && session.role !== expectedRole) return { valid: false };
    return { valid: true, userId: session.userId, role: session.role };
  }

  public destroySession(token: string): void {
    this.state.sessions = this.state.sessions.filter((s) => s.token !== token);
    this.save();
  }

  private cleanExpiredSessions(): void {
    const now = Date.now();
    this.state.sessions = this.state.sessions.filter((s) => s.expiresAt > now);
  }

  // --- Activity Log Helper ---
  public logActivity(adminEmail: string, adminName: string, action: string, details: string, targetId?: string): void {
    const log: AdminActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adminEmail,
      adminName,
      action,
      details,
      targetId,
      timestamp: Date.now(),
    };
    this.state.activityLogs.unshift(log);
    // Keep max 200 logs
    if (this.state.activityLogs.length > 200) {
      this.state.activityLogs = this.state.activityLogs.slice(0, 200);
    }
    this.save();
  }

  // --- Notification Helper ---
  public addNotification(type: AdminNotification['type'], title: string, message: string, link?: string): void {
    const notif: AdminNotification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      link,
      isRead: false,
      createdAt: Date.now(),
    };
    this.state.notifications.unshift(notif);
    if (this.state.notifications.length > 100) {
      this.state.notifications = this.state.notifications.slice(0, 100);
    }
    this.save();
  }
}

export const db = new StoreDatabase();

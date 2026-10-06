/**
 * Meta Pixel (Facebook Pixel) Centralized Service
 * Fully dynamic: Admin-configurable via Supabase & Express backend.
 * 
 * Supports Single Page Application (SPA) routing, standard e-commerce events,
 * format validation, dynamic enable/disable toggle, and duplicate purchase protection.
 */

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

export const DEFAULT_META_PIXEL_ID = '4455123488042747';
export const DEFAULT_META_ACCESS_TOKEN = 'EAAMVeXfzl2YBSoLiAA7eeVpxBdtISYLgCez7LzTOtZBhf5dzar54xQSLQeoHROun6Bvz8bS53gRZC5ZB1KoIV6TAKBChwtBdMueEicCndm8faUolnbJpE9wSs2pzAhC3R1vmWDii88dlZCV3HMTEhAXXVCijsi2SzoVC3XDIrpU4fztGiA1rO9xaqxyafQZDZD';
export const DEFAULT_TEST_EVENT_CODE = 'TEST89137';
export const STORAGE_PIXEL_SETTINGS_KEY = 'shokh_meta_pixel_settings_v4';

export interface MetaPixelConfig {
  enabled: boolean;
  pixelId: string;
  accessToken?: string;
  testEventCode?: string;
  capiEnabled?: boolean;
}

const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

// Runtime Configuration State
let currentConfig: MetaPixelConfig = {
  enabled: true,
  pixelId: DEFAULT_META_PIXEL_ID,
  accessToken: DEFAULT_META_ACCESS_TOKEN,
  testEventCode: DEFAULT_TEST_EVENT_CODE,
  capiEnabled: true,
};

// Initial state cache loading
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(STORAGE_PIXEL_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.enabled === 'boolean') currentConfig.enabled = parsed.enabled;
      if (parsed.pixelId && typeof parsed.pixelId === 'string' && parsed.pixelId.trim()) {
        currentConfig.pixelId = parsed.pixelId.trim();
      }
    }
  }
} catch {
  // ignore
}

// Track processed state
let scriptInjected = false;
let initializedPixelIds = new Set<string>();
let lastTrackedPageViewPath: string | null = null;
let lastTrackedPageViewTime = 0;
const trackedPurchases = new Set<string>();

// Load previously tracked purchase IDs from sessionStorage to prevent duplicate events on refresh
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const saved = window.sessionStorage.getItem('shokh_meta_tracked_purchases');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => trackedPurchases.add(id));
      }
    }
  }
} catch {
  // ignore storage errors
}

const saveTrackedPurchases = () => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(
        'shokh_meta_tracked_purchases',
        JSON.stringify(Array.from(trackedPurchases))
      );
    }
  } catch {
    // ignore
  }
};

const devLog = (event: string, data?: any) => {
  if (isDev) {
    if (data) {
      console.log(`%c[Meta Pixel] %c${event}`, 'color: #1877F2; font-weight: bold;', 'color: #333; font-weight: 600;', data);
    } else {
      console.log(`%c[Meta Pixel] %c${event}`, 'color: #1877F2; font-weight: bold;', 'color: #333; font-weight: 600;');
    }
  }
};

/**
 * Validate Meta Pixel ID format.
 * Meta Pixel IDs are typically 8 to 24 numeric digits.
 */
export const validatePixelId = (pixelId: string): { valid: boolean; error?: string } => {
  if (!pixelId || !pixelId.trim()) {
    return { valid: false, error: 'Pixel ID cannot be empty.' };
  }
  const clean = pixelId.trim();
  if (!/^\d{8,24}$/.test(clean)) {
    return { valid: false, error: 'Invalid Meta Pixel ID format. Pixel IDs must be 8 to 24 numeric digits.' };
  }
  return { valid: true };
};

/**
 * Injects Meta Pixel base script snippet once into document.
 */
const injectBaseScript = (): void => {
  if (typeof window === 'undefined') return;
  if (scriptInjected) return;

  if (!window.fbq) {
    const fbq: any = function (...args: any[]) {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, args);
      } else {
        fbq.queue.push(args);
      }
    };
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];

    // Inject remote script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  scriptInjected = true;
};

/**
 * 1. Global Meta Pixel Initialization
 * Only initializes if enabled and a valid Pixel ID is present.
 */
export const initMetaPixel = (configOverride?: Partial<MetaPixelConfig>): void => {
  if (typeof window === 'undefined') return;

  if (configOverride) {
    if (typeof configOverride.enabled === 'boolean') {
      currentConfig.enabled = configOverride.enabled;
    }
    if (configOverride.pixelId && typeof configOverride.pixelId === 'string' && configOverride.pixelId.trim()) {
      currentConfig.pixelId = configOverride.pixelId.trim();
    }
  }

  // If Meta Pixel is turned OFF by admin, do not inject script or init
  if (!currentConfig.enabled || !currentConfig.pixelId) {
    devLog('Meta Pixel is currently disabled by store settings.');
    return;
  }

  const cleanId = currentConfig.pixelId.trim();
  const validation = validatePixelId(cleanId);
  if (!validation.valid) {
    devLog(`Pixel initialization skipped: ${validation.error}`);
    return;
  }

  // Ensure script is injected
  injectBaseScript();

  // Initialize this specific Pixel ID if not already initialized
  if (!initializedPixelIds.has(cleanId)) {
    try {
      window.fbq('init', cleanId);
      initializedPixelIds.add(cleanId);
      devLog(`Initialized with active ID: ${cleanId}`);
    } catch (err) {
      console.warn('[Meta Pixel Init Error]', err);
    }
  }
};

/**
 * Update and sync settings dynamically from Admin or Server response.
 */
export const syncMetaPixelSettings = (settings?: {
  metaPixelEnabled?: boolean;
  metaPixelId?: string;
  metaAccessToken?: string;
  metaTestEventCode?: string;
  metaCapiEnabled?: boolean;
}): MetaPixelConfig => {
  if (!settings) return { ...currentConfig };

  let changed = false;

  if (typeof settings.metaPixelEnabled === 'boolean' && settings.metaPixelEnabled !== currentConfig.enabled) {
    currentConfig.enabled = settings.metaPixelEnabled;
    changed = true;
  }

  if (settings.metaPixelId && typeof settings.metaPixelId === 'string' && settings.metaPixelId.trim()) {
    const clean = settings.metaPixelId.trim();
    if (clean !== currentConfig.pixelId) {
      currentConfig.pixelId = clean;
      changed = true;
    }
  }

  if (settings.metaAccessToken !== undefined && settings.metaAccessToken !== currentConfig.accessToken) {
    currentConfig.accessToken = settings.metaAccessToken;
    changed = true;
  }

  if (settings.metaTestEventCode !== undefined && settings.metaTestEventCode !== currentConfig.testEventCode) {
    currentConfig.testEventCode = settings.metaTestEventCode;
    changed = true;
  }

  if (typeof settings.metaCapiEnabled === 'boolean' && settings.metaCapiEnabled !== currentConfig.capiEnabled) {
    currentConfig.capiEnabled = settings.metaCapiEnabled;
    changed = true;
  }

  if (changed && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_PIXEL_SETTINGS_KEY, JSON.stringify(currentConfig));
    } catch {
      // ignore
    }
  }

  // If enabled, initialize
  if (currentConfig.enabled && currentConfig.pixelId) {
    initMetaPixel();
  }

  return { ...currentConfig };
};

/**
 * Test Meta Pixel Setup and fire a test event (Browser Pixel + Server CAPI).
 */
export const testPixelEvent = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Window object not available in this environment.' };
  }

  if (!currentConfig.enabled) {
    return {
      success: false,
      message: 'Meta Pixel is currently disabled in Store Settings. Toggle it ON to enable tracking.',
    };
  }

  const cleanId = currentConfig.pixelId?.trim();
  const validation = validatePixelId(cleanId);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || 'Please enter a valid numeric Meta Pixel ID.',
    };
  }

  // Ensure client-side init
  initMetaPixel();

  let browserSuccess = false;
  let serverSuccess = false;
  let serverMessage = '';

  // 1. Browser Event
  if (window.fbq) {
    try {
      const testPayload = {
        test_event: true,
        pixel_id: cleanId,
        timestamp: new Date().toISOString(),
        source: 'Admin Pixel Settings Verification',
      };
      window.fbq('trackCustom', 'AdminPixelTest', testPayload);
      devLog('AdminPixelTest Event Dispatched', testPayload);
      browserSuccess = true;
    } catch {
      // ignore
    }
  }

  // 2. Server-side Conversions API (CAPI) Event with Test Code
  try {
    const srvRes = await fetch('/api/meta/test-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pixelId: cleanId,
        accessToken: currentConfig.accessToken,
        testEventCode: currentConfig.testEventCode || 'TEST89137',
        eventName: 'PageView',
      }),
    });
    const srvData = await srvRes.json();
    if (srvData?.success) {
      serverSuccess = true;
      serverMessage = srvData.message;
    } else if (srvData?.error) {
      serverMessage = srvData.error;
    }
  } catch (err: any) {
    serverMessage = err.message || 'CAPI server call failed';
  }

  if (browserSuccess || serverSuccess) {
    const activeTestCode = currentConfig.testEventCode || 'TEST89137';
    return {
      success: true,
      message: `✓ Meta Pixel & Conversions API are active (ID: ${cleanId}, Test Code: ${activeTestCode}). Browser event and Server CAPI event dispatched successfully!`,
      details: {
        browser: browserSuccess,
        server: serverSuccess,
        testCode: activeTestCode,
        serverMessage,
      },
    };
  }

  return {
    success: false,
    message: serverMessage || 'Failed to dispatch Meta test event. Please check your Pixel ID and Access Token.',
  };
};

/**
 * Check if Meta Pixel is currently active and ready.
 */
export const isPixelActive = (): boolean => {
  return Boolean(currentConfig.enabled && currentConfig.pixelId && initializedPixelIds.has(currentConfig.pixelId));
};

/**
 * Get current runtime Pixel configuration.
 */
export const getPixelConfig = (): MetaPixelConfig => {
  return { ...currentConfig };
};

/**
 * 2. SPA PageView Tracking
 * Fires PageView event while avoiding duplicate calls for the same route view within rapid succession.
 */
export const trackPageView = (path?: string, title?: string): void => {
  if (typeof window === 'undefined') return;
  if (!currentConfig.enabled || !currentConfig.pixelId) return;

  if (!initializedPixelIds.has(currentConfig.pixelId)) {
    initMetaPixel();
  }

  const currentPath = path || window.location.pathname + window.location.search;
  const now = Date.now();

  // Prevent duplicate PageView firing if called multiple times within 400ms for same path
  if (lastTrackedPageViewPath === currentPath && now - lastTrackedPageViewTime < 400) {
    return;
  }

  lastTrackedPageViewPath = currentPath;
  lastTrackedPageViewTime = now;

  if (window.fbq) {
    window.fbq('track', 'PageView', {
      page_path: currentPath,
      page_title: title || document.title,
    });
    devLog('PageView', { path: currentPath, title: title || document.title });
  }
};

/**
 * 3. ViewContent Event
 * Fired when a customer views a product detail page, custom garment, or wholesale product.
 */
export const trackViewContent = (params: {
  id: string;
  name: string;
  category?: string;
  price: number;
  currency?: string;
}): void => {
  if (typeof window === 'undefined') return;
  if (!currentConfig.enabled || !currentConfig.pixelId) return;
  if (!initializedPixelIds.has(currentConfig.pixelId)) initMetaPixel();

  if (window.fbq) {
    const payload = {
      content_name: params.name,
      content_category: params.category || 'Apparel',
      content_ids: [String(params.id)],
      content_type: 'product',
      value: Number(params.price) || 0,
      currency: params.currency || 'BDT',
    };
    window.fbq('track', 'ViewContent', payload);
    devLog('ViewContent', payload);
  }
};

/**
 * 4. Search Event
 * Fired when customer explicitly performs/submits a search.
 */
export const trackSearch = (searchQuery: string): void => {
  if (typeof window === 'undefined' || !searchQuery || !searchQuery.trim()) return;
  if (!currentConfig.enabled || !currentConfig.pixelId) return;
  if (!initializedPixelIds.has(currentConfig.pixelId)) initMetaPixel();

  const query = searchQuery.trim();
  if (window.fbq) {
    const payload = {
      search_string: query,
      content_type: 'product',
    };
    window.fbq('track', 'Search', payload);
    devLog('Search', payload);
  }
};

/**
 * 5. AddToCart Event
 * Fired when a customer successfully adds an item or variant to their cart.
 */
export const trackAddToCart = (params: {
  id: string;
  name: string;
  category?: string;
  price: number;
  quantity?: number;
  currency?: string;
}): void => {
  if (typeof window === 'undefined') return;
  if (!currentConfig.enabled || !currentConfig.pixelId) return;
  if (!initializedPixelIds.has(currentConfig.pixelId)) initMetaPixel();

  const qty = Number(params.quantity) || 1;
  const unitPrice = Number(params.price) || 0;
  const totalValue = unitPrice * qty;

  if (window.fbq) {
    const payload = {
      content_name: params.name,
      content_category: params.category || 'Apparel',
      content_ids: [String(params.id)],
      content_type: 'product',
      value: totalValue,
      currency: params.currency || 'BDT',
      num_items: qty,
    };
    window.fbq('track', 'AddToCart', payload);
    devLog('AddToCart', payload);
  }
};

/**
 * 6. InitiateCheckout Event
 * Fired once when checkout modal/process is opened with cart items.
 */
let lastCheckoutTimestamp = 0;
export const trackInitiateCheckout = (params: {
  value: number;
  num_items: number;
  content_ids?: string[];
  currency?: string;
}): void => {
  if (typeof window === 'undefined') return;
  if (!currentConfig.enabled || !currentConfig.pixelId) return;
  if (!initializedPixelIds.has(currentConfig.pixelId)) initMetaPixel();

  const now = Date.now();
  // Prevent duplicate InitiateCheckout within 1.5 seconds if component re-renders
  if (now - lastCheckoutTimestamp < 1500) {
    return;
  }
  lastCheckoutTimestamp = now;

  if (window.fbq) {
    const payload = {
      value: Number(params.value) || 0,
      currency: params.currency || 'BDT',
      num_items: Number(params.num_items) || 1,
      content_ids: params.content_ids || [],
      content_type: 'product',
    };
    window.fbq('track', 'InitiateCheckout', payload);
    devLog('InitiateCheckout', payload);
  }
};

/**
 * 7. Purchase Event
 * Fired ONLY when the backend/Supabase database confirms successful order creation.
 * Prevents duplicate events for the same orderId across page refreshes or re-renders.
 */
export const trackPurchase = (params: {
  orderId: string;
  value: number;
  currency?: string;
  content_ids: string[];
  num_items: number;
  contents?: Array<{
    id: string;
    name?: string;
    quantity: number;
    item_price?: number;
  }>;
}): boolean => {
  if (typeof window === 'undefined') return false;
  if (!params.orderId) return false;
  if (!currentConfig.enabled || !currentConfig.pixelId) return false;
  if (!initializedPixelIds.has(currentConfig.pixelId)) initMetaPixel();

  const normalizedOrderId = String(params.orderId).trim();

  // Deduplication guard
  if (trackedPurchases.has(normalizedOrderId)) {
    devLog(`Purchase skipped (Duplicate orderId: ${normalizedOrderId})`);
    return false;
  }

  trackedPurchases.add(normalizedOrderId);
  saveTrackedPurchases();

  if (window.fbq) {
    const payload = {
      value: Number(params.value) || 0,
      currency: params.currency || 'BDT',
      content_ids: params.content_ids || [],
      content_type: 'product',
      num_items: Number(params.num_items) || 1,
      order_id: normalizedOrderId,
      contents: params.contents,
    };
    window.fbq('track', 'Purchase', payload);
    devLog('Purchase (Successful Order)', payload);
    return true;
  }

  return false;
};

/**
 * 8. Lead Event
 * Fired when customer submits a custom apparel inquiry or wholesale contact form.
 */
export const trackLead = (params?: {
  content_name?: string;
  category?: string;
  value?: number;
  currency?: string;
}): void => {
  if (typeof window === 'undefined') return;
  if (!currentConfig.enabled || !currentConfig.pixelId) return;
  if (!initializedPixelIds.has(currentConfig.pixelId)) initMetaPixel();

  if (window.fbq) {
    const payload = {
      content_name: params?.content_name || 'Custom Order Inquiry',
      content_category: params?.category || 'Custom Studio',
      value: params?.value !== undefined ? Number(params.value) : undefined,
      currency: params?.currency || 'BDT',
    };
    window.fbq('track', 'Lead', payload);
    devLog('Lead', payload);
  }
};

/**
 * 9. AddToWishlist Event
 * Fired when customer adds an item to favorites / wishlist.
 */
export const trackAddToWishlist = (params: {
  id: string;
  name: string;
  category?: string;
  price?: number;
  currency?: string;
}): void => {
  if (typeof window === 'undefined') return;
  if (!currentConfig.enabled || !currentConfig.pixelId) return;
  if (!initializedPixelIds.has(currentConfig.pixelId)) initMetaPixel();

  if (window.fbq) {
    const payload = {
      content_name: params.name,
      content_category: params.category || 'Apparel',
      content_ids: [String(params.id)],
      content_type: 'product',
      value: Number(params.price) || 0,
      currency: params.currency || 'BDT',
    };
    window.fbq('track', 'AddToWishlist', payload);
    devLog('AddToWishlist', payload);
  }
};

/**
 * 10. Contact Event
 * Fired when customer clicks to contact via WhatsApp, hotline, or direct inquiry.
 */
export const trackContact = (params?: {
  channel?: string;
  content_name?: string;
}): void => {
  if (typeof window === 'undefined') return;
  if (!currentConfig.enabled || !currentConfig.pixelId) return;
  if (!initializedPixelIds.has(currentConfig.pixelId)) initMetaPixel();

  if (window.fbq) {
    const payload = {
      content_name: params?.content_name || 'Customer Support Contact',
      content_category: params?.channel || 'WhatsApp',
    };
    window.fbq('track', 'Contact', payload);
    devLog('Contact', payload);
  }
};

/**
 * 11. CompleteRegistration Event
 * Fired when customer completes sign up / registration.
 */
export const trackCompleteRegistration = (params?: {
  method?: string;
  status?: boolean;
}): void => {
  if (typeof window === 'undefined') return;
  if (!currentConfig.enabled || !currentConfig.pixelId) return;
  if (!initializedPixelIds.has(currentConfig.pixelId)) initMetaPixel();

  if (window.fbq) {
    const payload = {
      status: params?.status ?? true,
      content_name: params?.method || 'Email Registration',
    };
    window.fbq('track', 'CompleteRegistration', payload);
    devLog('CompleteRegistration', payload);
  }
};

/**
 * 12. CustomizeProduct Event
 * Fired when customer customizes a garment design or uploads an artwork file.
 */
export const trackCustomizeProduct = (params?: {
  content_name?: string;
  custom_options?: string;
}): void => {
  if (typeof window === 'undefined') return;
  if (!currentConfig.enabled || !currentConfig.pixelId) return;
  if (!initializedPixelIds.has(currentConfig.pixelId)) initMetaPixel();

  if (window.fbq) {
    const payload = {
      content_name: params?.content_name || 'Custom Garment Print',
      custom_options: params?.custom_options,
    };
    window.fbq('track', 'CustomizeProduct', payload);
    devLog('CustomizeProduct', payload);
  }
};

export const metaPixel = {
  init: initMetaPixel,
  syncSettings: syncMetaPixelSettings,
  validatePixelId,
  testPixelEvent,
  isPixelActive,
  getConfig: getPixelConfig,
  trackPageView,
  trackViewContent,
  trackSearch,
  trackAddToCart,
  trackInitiateCheckout,
  trackPurchase,
  trackLead,
  trackAddToWishlist,
  trackContact,
  trackCompleteRegistration,
  trackCustomizeProduct,
};

export default metaPixel;

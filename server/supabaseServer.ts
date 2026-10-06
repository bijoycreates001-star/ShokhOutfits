import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  OrderRecord,
  CustomerUser,
  CustomOrderRecord,
  WholesaleOrderRecord,
  ProductRecord,
  CouponRecord,
  StoreSettings,
  ProductReview,
  AdminActivityLog,
} from './db.ts';

const supabaseUrl = (
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
).trim();

const supabaseKey = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseKey.includes('your-publishable-key') &&
  !supabaseKey.includes('your-key')
);

export const supabaseServer: SupabaseClient | null = isServerSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

/**
 * Safely syncs an order and its items into Supabase orders & order_items tables
 */
export async function syncOrderToSupabase(order: OrderRecord): Promise<{ success: boolean; error?: string }> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.customerId || '');
    const orderPayload: any = {
      order_number: order.orderNumber,
      customer_id: isUuid ? order.customerId : null,
      customer_name: order.customer.fullName,
      phone: order.customer.phone,
      email: order.customer.email || null,
      address_information: order.customer.address,
      delivery_area: order.customer.deliveryArea || 'dhaka',
      subtotal: order.subtotal,
      discount_amount: order.discountAmount || 0,
      delivery_charge: order.deliveryFee || 0,
      total: order.total,
      payment_method: order.paymentMethod || 'cash_on_delivery',
      payment_status: order.paymentStatus === 'paid' ? 'paid' : 'pending',
      order_status: order.orderStatus || 'pending',
      order_type: order.orderType || 'retail',
      customer_note: order.customerNotes || null,
      coupon_code: order.couponCode || null,
      tracking_number: order.trackingNumber || null,
      channel: order.channel || 'online_store',
      created_at: new Date(order.createdAt).toISOString(),
      updated_at: new Date(order.updatedAt || order.createdAt).toISOString(),
    };

    const { data: insertedOrder, error: orderErr } = await supabaseServer
      .from('orders')
      .upsert(orderPayload, { onConflict: 'order_number' })
      .select('id')
      .single();

    if (orderErr) {
      console.warn('[Supabase Sync Warning] Could not sync order header:', orderErr.message);
      return { success: false, error: orderErr.message };
    }

    const orderDbId = insertedOrder?.id;

    // Insert items into order_items table
    if (orderDbId && order.items && order.items.length > 0) {
      const itemsPayload = order.items.map((it) => {
        const isProdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.productId || '');
        return {
          order_id: orderDbId,
          product_id: isProdUuid ? it.productId : null,
          product_name_snapshot: it.productName,
          sku_snapshot: it.sku || 'N/A',
          size: it.variant?.size || 'Free Size',
          color: it.variant?.color || 'Standard',
          quantity: it.quantity,
          unit_price: it.unitPrice,
          discount: it.discount || 0,
          final_price: it.finalPrice,
          image_snapshot: it.image || null,
          custom_design_url: it.customDesignUrl || null,
        };
      });

      const { error: itemsErr } = await supabaseServer
        .from('order_items')
        .insert(itemsPayload);

      if (itemsErr) {
        console.warn('[Supabase Sync Warning] Could not sync order items:', itemsErr.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync Exception]', err.message || err);
    return { success: false, error: err.message };
  }
}

/**
 * Safely updates order status & tracking number in Supabase
 */
export async function syncOrderStatusToSupabase(
  orderNumber: string,
  orderStatus: string,
  paymentStatus?: string,
  trackingNumber?: string
): Promise<void> {
  if (!supabaseServer) return;

  try {
    const payload: any = {
      order_status: orderStatus,
      updated_at: new Date().toISOString(),
    };
    if (paymentStatus) payload.payment_status = paymentStatus;
    if (trackingNumber !== undefined) payload.tracking_number = trackingNumber;

    await supabaseServer
      .from('orders')
      .update(payload)
      .eq('order_number', orderNumber);
  } catch (err: any) {
    console.warn('[Supabase Sync Order Status Error]', err.message || err);
  }
}

/**
 * Safely syncs a customer profile/address into Supabase
 */
export async function syncCustomerToSupabase(customer: CustomerUser): Promise<void> {
  if (!supabaseServer) return;

  try {
    const profilePayload = {
      full_name: customer.fullName,
      email: customer.email || null,
      phone: customer.phone,
      role: 'customer',
      updated_at: new Date().toISOString(),
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customer.id);
    if (isUuid) {
      await supabaseServer.from('profiles').upsert({ id: customer.id, ...profilePayload });
    }

    // Sync address if available
    if (customer.addresses && customer.addresses.length > 0 && isUuid) {
      for (const addr of customer.addresses) {
        await supabaseServer.from('addresses').upsert({
          customer_id: customer.id,
          full_name: customer.fullName,
          phone: addr.phone || customer.phone,
          full_address: addr.address,
          area: addr.deliveryArea,
          is_default: addr.isDefault,
        });
      }
    }
  } catch (err: any) {
    console.warn('[Supabase Sync Customer Error]', err.message || err);
  }
}

/**
 * Safely syncs a custom t-shirt order into Supabase custom_orders
 */
export async function syncCustomOrderToSupabase(custom: CustomOrderRecord): Promise<void> {
  if (!supabaseServer) return;

  try {
    const payload = {
      customer_name: custom.customerName,
      phone: custom.phone,
      email: custom.email || null,
      product_name: custom.productType || 'Custom T-Shirt',
      tshirt_color: custom.tshirtColor,
      size: custom.size,
      quantity: custom.quantity,
      uploaded_design_url: custom.designUrl || null,
      order_method: 'Website Order',
      customer_note: custom.customerNotes || null,
      status: custom.orderStatus || 'new',
      whatsapp_status: custom.whatsappStatus || 'pending',
      created_at: new Date(custom.createdAt).toISOString(),
    };

    await supabaseServer.from('custom_orders').insert(payload);
  } catch (err: any) {
    console.warn('[Supabase Sync Custom Order Error]', err.message || err);
  }
}

/**
 * Safely updates custom order status in Supabase
 */
export async function syncCustomOrderStatusToSupabase(
  id: string,
  orderStatus?: string,
  whatsappStatus?: string
): Promise<void> {
  if (!supabaseServer) return;

  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (orderStatus) payload.status = orderStatus;
    if (whatsappStatus) payload.whatsapp_status = whatsappStatus;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await supabaseServer.from('custom_orders').update(payload).eq('id', id);
    }
  } catch (err: any) {
    console.warn('[Supabase Sync Custom Status Error]', err.message || err);
  }
}

/**
 * Safely syncs a wholesale order into Supabase wholesale_orders
 */
export async function syncWholesaleOrderToSupabase(ws: WholesaleOrderRecord): Promise<void> {
  if (!supabaseServer) return;

  try {
    const payload = {
      customer_name: ws.customerName,
      phone: ws.phone,
      email: ws.email || null,
      company_name: ws.companyName || null,
      product_name: ws.productName,
      total_quantity: ws.totalQuantity,
      matrix_json: ws.matrix,
      size_breakdown_json: ws.sizeBreakdown,
      color_breakdown_json: ws.colorBreakdown,
      wholesale_unit_price: ws.wholesaleUnitPrice || 0,
      total_amount: ws.totalAmount || 0,
      customer_notes: ws.customerNotes || null,
      status: ws.status || 'new',
      created_at: new Date(ws.createdAt).toISOString(),
    };

    await supabaseServer.from('wholesale_orders').insert(payload);
  } catch (err: any) {
    console.warn('[Supabase Sync Wholesale Order Error]', err.message || err);
  }
}

/**
 * Safely updates wholesale order status in Supabase
 */
export async function syncWholesaleOrderStatusToSupabase(id: string, status: string): Promise<void> {
  if (!supabaseServer) return;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await supabaseServer.from('wholesale_orders').update({
        status,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    }
  } catch (err: any) {
    console.warn('[Supabase Sync Wholesale Status Error]', err.message || err);
  }
}

function toCleanStringArray(val: any): string[] {
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

/**
 * Safely syncs a product to Supabase products table
 */
export async function syncProductToSupabase(prod: ProductRecord): Promise<void> {
  if (!supabaseServer) return;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prod.id);
    const tagsArr = toCleanStringArray(prod.tags);
    const rawTypes = toCleanStringArray(prod.productTypes);
    const productTypesArr = rawTypes.length > 0 ? rawTypes : [prod.productType || 'normal'];
    let pType = prod.productType || productTypesArr[0] || 'normal';
    if (!['normal', 'printed', 'wholesale'].includes(pType)) {
      pType = 'normal';
    }

    const payload: any = {
      name: prod.name,
      slug: prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + prod.sku.toLowerCase(),
      description: prod.description,
      short_description: prod.shortDescription || null,
      sku: prod.sku,
      product_type: pType,
      product_types: productTypesArr,
      regular_price: prod.originalPrice || prod.price,
      sale_price: prod.price,
      wholesale_price: prod.wholesalePrice || null,
      min_wholesale_qty: prod.minWholesaleQty || 25,
      status: prod.status || 'active',
      brand: prod.brand || 'Shokh Outfits',
      tags: tagsArr,
      badge: prod.badge || null,
      fabric: prod.fabric || '100% Combed Cotton',
      gsm: prod.gsm || '220 GSM',
      fit: prod.fit || 'Regular Fit',
      is_featured: prod.badge === 'Bestseller' || prod.badge === 'Hot' || false,
      updated_at: new Date().toISOString(),
    };

    if (isUuid) {
      payload.id = prod.id;
    }

    const { data: upsertedProduct } = await supabaseServer
      .from('products')
      .upsert(payload, { onConflict: 'sku' })
      .select('id')
      .single();

    const targetProductId = upsertedProduct?.id || (isUuid ? prod.id : null);

    // Sync images if available
    if (targetProductId && (prod.image || (Array.isArray(prod.images) && prod.images.length > 0))) {
      try {
        await supabaseServer.from('product_images').delete().eq('product_id', targetProductId);
        const imagesList: any[] = [];
        const mainImg = prod.image || (typeof prod.images?.[0] === 'string' ? prod.images[0] : prod.images?.[0]?.url);
        if (mainImg) {
          imagesList.push({
            product_id: targetProductId,
            image_url: mainImg,
            is_primary: true,
            sort_order: 0,
            alt_text: prod.name,
          });
        }
        if (Array.isArray(prod.images)) {
          prod.images.forEach((img: any, idx: number) => {
            const url = typeof img === 'string' ? img : img?.url;
            if (url && url !== mainImg) {
              imagesList.push({
                product_id: targetProductId,
                image_url: url,
                is_primary: false,
                sort_order: idx + 1,
                alt_text: prod.name,
              });
            }
          });
        }
        if (imagesList.length > 0) {
          await supabaseServer.from('product_images').insert(imagesList);
        }
      } catch (imgErr) {
        console.warn('[Supabase Sync Product Images Warning]', imgErr);
      }
    }

    // Sync variants if available
    if (targetProductId && prod.variants && prod.variants.length > 0) {
      for (const v of prod.variants) {
        try {
          await supabaseServer.from('product_variants').upsert({
            product_id: targetProductId,
            sku: v.sku,
            size: v.size,
            color: v.color,
            stock: v.stock,
            status: 'active',
          }, { onConflict: 'sku' });
        } catch {}
      }
    }
  } catch (err: any) {
    console.warn('[Supabase Sync Product Error]', err.message || err);
  }
}

/**
 * Safely syncs variant stock adjustment to Supabase
 */
export async function syncVariantStockToSupabase(variantSku: string, newStock: number): Promise<void> {
  if (!supabaseServer) return;

  try {
    await supabaseServer
      .from('product_variants')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('sku', variantSku);
  } catch (err: any) {
    console.warn('[Supabase Sync Variant Stock Error]', err.message || err);
  }
}

/**
 * Safely syncs coupon into Supabase coupons table
 */
export async function syncCouponToSupabase(coupon: CouponRecord): Promise<void> {
  if (!supabaseServer) return;

  try {
    await supabaseServer.from('coupons').upsert({
      code: coupon.code,
      discount_type: coupon.discountType,
      discount_value: coupon.discountValue,
      minimum_order_amount: coupon.minOrderAmount,
      maximum_discount_amount: coupon.maxDiscountAmount || null,
      start_date: new Date(coupon.startDate).toISOString(),
      expiry_date: coupon.endDate ? new Date(coupon.endDate).toISOString() : null,
      total_usage_limit: coupon.usageLimit,
      total_usage_count: coupon.usageCount,
      per_customer_usage_limit: coupon.perCustomerLimit,
      is_active: coupon.status === 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'code' });
  } catch (err: any) {
    console.warn('[Supabase Sync Coupon Error]', err.message || err);
  }
}

/**
 * Safely syncs store settings into Supabase store_settings table
 */
export async function syncStoreSettingsToSupabase(settings: StoreSettings): Promise<void> {
  if (!supabaseServer) return;

  try {
    await supabaseServer.from('store_settings').upsert({
      business_name: settings.businessName,
      tagline: settings.tagline,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      address: settings.address,
      delivery_charge_inside_dhaka: settings.deliveryChargeInsideDhaka,
      delivery_charge_outside_dhaka: settings.deliveryChargeOutsideDhaka,
      free_delivery_threshold: settings.freeDeliveryThreshold,
      low_stock_threshold: settings.lowStockThreshold,
      default_min_wholesale_qty: settings.defaultMinWholesaleQty,
      cod_enabled: settings.codEnabled,
      bkash_enabled: settings.bkashEnabled,
      bkash_merchant_number: settings.bkashMerchantNumber,
      announcement_text: settings.announcementText,
      announcement_active: settings.announcementActive,
      meta_pixel_enabled: settings.metaPixelEnabled !== false,
      meta_pixel_id: settings.metaPixelId || '4455123488042747',
      meta_access_token: settings.metaAccessToken || '',
      meta_test_event_code: settings.metaTestEventCode || '',
      meta_capi_enabled: settings.metaCapiEnabled !== false,
      updated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[Supabase Sync Store Settings Error]', err.message || err);
  }
}

/**
 * Safely syncs product review into Supabase product_reviews table
 */
export async function syncReviewToSupabase(review: ProductReview): Promise<void> {
  if (!supabaseServer) return;

  try {
    const isProdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(review.productId);
    await supabaseServer.from('product_reviews').insert({
      product_id: isProdUuid ? review.productId : null,
      author_name: review.customerName,
      rating: review.rating,
      title: review.title || null,
      comment: review.comment,
      is_verified_purchase: review.verifiedPurchase,
      helpful_count: review.helpfulCount || 0,
      created_at: new Date(review.createdAt).toISOString(),
    });
  } catch (err: any) {
    console.warn('[Supabase Sync Review Error]', err.message || err);
  }
}

/**
 * Safely syncs admin activity log into Supabase admin_activity_logs table
 */
export async function syncActivityLogToSupabase(log: AdminActivityLog): Promise<void> {
  if (!supabaseServer) return;

  try {
    await supabaseServer.from('admin_activity_logs').insert({
      admin_email: log.adminEmail,
      admin_name: log.adminName,
      action: log.action,
      details: log.details,
      target_id: log.targetId || null,
      created_at: new Date(log.timestamp).toISOString(),
    });
  } catch (err: any) {
    console.warn('[Supabase Sync Activity Log Error]', err.message || err);
  }
}


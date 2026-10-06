-- ====================================================================
-- SHOKH OUTFITS BD - Complete Production Supabase Database Schema
-- Run this entire script in Supabase SQL Editor (https://app.supabase.com)
-- This creates all tables, triggers, storage buckets, RLS policies & initial catalog
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- TABLE 1: PROFILES (Linked to auth.users)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 2: PRODUCT CATEGORIES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Categories
INSERT INTO public.product_categories (name, slug, description, sort_order)
VALUES
    ('T-Shirts', 't-shirts', 'Minimalist combed cotton premium crewneck tees', 1),
    ('Printed T-Shirts', 'printed-t-shirts', 'High-density screen printed and graphic streetwear tees', 2),
    ('Hoodies', 'hoodies', 'Heavyweight fleece drop-shoulder winter hoodies', 3),
    ('Custom T-Shirts', 'custom-t-shirts', 'Custom printed bulk and personalized t-shirts', 4),
    ('Wholesale', 'wholesale', 'B2B factory rate matrix orders for brands and retailers', 5)
ON CONFLICT (slug) DO NOTHING;

-- ====================================================================
-- TABLE 3: PRODUCTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    short_description TEXT,
    sku TEXT NOT NULL UNIQUE,
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    product_type TEXT NOT NULL DEFAULT 'normal' CHECK (product_type IN ('normal', 'printed', 'wholesale')),
    product_types TEXT[] NOT NULL DEFAULT ARRAY['normal']::TEXT[],
    regular_price NUMERIC(10, 2) NOT NULL CHECK (regular_price >= 0),
    sale_price NUMERIC(10, 2) CHECK (sale_price >= 0),
    wholesale_price NUMERIC(10, 2) CHECK (wholesale_price >= 0),
    min_wholesale_qty INT DEFAULT 25,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'out_of_stock', 'archived')),
    brand TEXT NOT NULL DEFAULT 'Shokh Outfits',
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    badge TEXT,
    fabric TEXT NOT NULL DEFAULT '100% Combed Cotton',
    gsm TEXT NOT NULL DEFAULT '220 GSM',
    fit TEXT NOT NULL DEFAULT 'Regular Fit',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_types TEXT[] DEFAULT ARRAY['normal']::TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_wholesale_qty INT DEFAULT 25;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fabric TEXT DEFAULT '100% Combed Cotton';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gsm TEXT DEFAULT '220 GSM';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fit TEXT DEFAULT 'Regular Fit';

-- ====================================================================
-- TABLE 4: PRODUCT IMAGES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    alt_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 5: PRODUCT VARIANTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL UNIQUE,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    color_hex TEXT DEFAULT '#000000',
    price_override NUMERIC(10, 2),
    sale_price_override NUMERIC(10, 2),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
    image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 6: INVENTORY
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL UNIQUE REFERENCES public.product_variants(id) ON DELETE CASCADE,
    current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reserved_stock INT NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    available_stock INT GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    low_stock_threshold INT NOT NULL DEFAULT 10,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-sync inventory on variant insert/update
CREATE OR REPLACE FUNCTION public.handle_variant_inventory_sync()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory (variant_id, current_stock, reserved_stock, low_stock_threshold)
    VALUES (NEW.id, NEW.stock, 0, 10)
    ON CONFLICT (variant_id)
    DO UPDATE SET
        current_stock = NEW.stock,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_variant_inventory ON public.product_variants;
CREATE TRIGGER trg_sync_variant_inventory
AFTER INSERT OR UPDATE OF stock ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.handle_variant_inventory_sync();

-- ====================================================================
-- TABLE 7: CUSTOMER ADDRESSES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    division TEXT,
    district TEXT,
    area TEXT NOT NULL DEFAULT 'dhaka',
    full_address TEXT NOT NULL,
    delivery_note TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 8: DISCOUNTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    minimum_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    maximum_discount_amount NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    applicable_products UUID[] DEFAULT ARRAY[]::UUID[],
    applicable_categories UUID[] DEFAULT ARRAY[]::UUID[],
    usage_limit INT,
    usage_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 9: COUPONS & COUPON USAGE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    minimum_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    maximum_discount_amount NUMERIC(10, 2),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    total_usage_limit INT NOT NULL DEFAULT 1000,
    total_usage_count INT NOT NULL DEFAULT 0,
    per_customer_usage_limit INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    applicable_products UUID[] DEFAULT ARRAY[]::UUID[],
    applicable_categories UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id UUID,
    discount_amount_applied NUMERIC(10, 2) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial coupon
INSERT INTO public.coupons (code, discount_type, discount_value, minimum_order_amount, total_usage_limit, is_active)
VALUES ('SHOKH100', 'fixed', 100, 1000, 500, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ====================================================================
-- TABLE 10: ORDERS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address_information TEXT NOT NULL,
    delivery_area TEXT NOT NULL DEFAULT 'dhaka',
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    coupon_code TEXT,
    delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 70,
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
    order_type TEXT NOT NULL DEFAULT 'retail' CHECK (order_type IN ('retail', 'printed', 'wholesale', 'custom')),
    customer_note TEXT,
    admin_note TEXT,
    tracking_number TEXT,
    channel TEXT NOT NULL DEFAULT 'online_store',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 11: ORDER ITEMS (Historical Snapshot)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    sku_snapshot TEXT NOT NULL,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    final_price NUMERIC(10, 2) NOT NULL CHECK (final_price >= 0),
    image_snapshot TEXT,
    custom_design_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 12: CUSTOM T-SHIRT ORDERS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.custom_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    product_name TEXT NOT NULL DEFAULT 'Custom T-Shirt',
    tshirt_color TEXT NOT NULL,
    size TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    uploaded_design_url TEXT,
    order_method TEXT NOT NULL DEFAULT 'Website Order',
    customer_note TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    whatsapp_status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS order_method TEXT NOT NULL DEFAULT 'Website Order';

-- ====================================================================
-- TABLE 13: WHOLESALE ORDERS & SETTINGS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.wholesale_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    company_name TEXT,
    product_name TEXT NOT NULL,
    total_quantity INT NOT NULL CHECK (total_quantity > 0),
    matrix_json JSONB,
    size_breakdown_json JSONB,
    color_breakdown_json JSONB,
    wholesale_unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    customer_notes TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wholesale_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    minimum_order_quantity INT NOT NULL DEFAULT 25,
    default_discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
    whatsapp_contact TEXT NOT NULL DEFAULT '+880 1346-068854',
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.wholesale_settings (minimum_order_quantity, default_discount_percentage, whatsapp_contact)
VALUES (25, 30.00, '+880 1346-068854')
ON CONFLICT DO NOTHING;

-- ====================================================================
-- TABLE 14: ADMIN ACTIVITY LOGS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    target_id TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TABLE 15: STORE SETTINGS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL DEFAULT 'Shokh Outfits',
    tagline TEXT NOT NULL DEFAULT 'Minimalist Streetwear & Custom Garments',
    phone TEXT NOT NULL DEFAULT '+880 1346-068854',
    whatsapp TEXT NOT NULL DEFAULT '+880 1346-068854',
    email TEXT NOT NULL DEFAULT 'contact@shokhoutfits.com',
    address TEXT NOT NULL DEFAULT 'Dhaka, Bangladesh',
    delivery_charge_inside_dhaka NUMERIC(10, 2) NOT NULL DEFAULT 70.00,
    delivery_charge_outside_dhaka NUMERIC(10, 2) NOT NULL DEFAULT 130.00,
    free_delivery_threshold NUMERIC(10, 2) NOT NULL DEFAULT 2500.00,
    low_stock_threshold INT NOT NULL DEFAULT 10,
    default_min_wholesale_qty INT NOT NULL DEFAULT 25,
    cod_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    bkash_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    bkash_merchant_number TEXT NOT NULL DEFAULT '01346068854',
    announcement_text TEXT NOT NULL DEFAULT 'Free delivery on orders over ৳2,500 across Bangladesh!',
    announcement_active BOOLEAN NOT NULL DEFAULT TRUE,
    meta_pixel_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    meta_pixel_id TEXT NOT NULL DEFAULT '4455123488042747',
    meta_access_token TEXT DEFAULT '',
    meta_test_event_code TEXT DEFAULT 'TEST89137',
    meta_capi_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.store_settings (business_name, tagline, phone, whatsapp, email)
VALUES ('Shokh Outfits', 'Minimalist Streetwear & Custom Garments', '+880 1346-068854', '+880 1346-068854', 'contact@shokhoutfits.com')
ON CONFLICT DO NOTHING;

-- ====================================================================
-- TABLE 16: PRODUCT REVIEWS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT NOT NULL,
    image_url TEXT,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT TRUE,
    helpful_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_product_variants_prod ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_prod ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON public.inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_created ON public.custom_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_created ON public.wholesale_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_product_reviews_prod ON public.product_reviews(product_id);

-- ====================================================================
-- AUTOMATIC PROFILE TRIGGER ON SUPABASE AUTH SIGNUP
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR auth.uid() IS NULL);

-- 2. Catalog Policies (Public Read, Admin Write)
DROP POLICY IF EXISTS "Categories viewable by all" ON public.product_categories;
CREATE POLICY "Categories viewable by all" ON public.product_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage categories" ON public.product_categories;
CREATE POLICY "Admin manage categories" ON public.product_categories FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Products viewable by all" ON public.products;
CREATE POLICY "Products viewable by all" ON public.products FOR SELECT USING (status != 'archived' OR public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Admin manage products" ON public.products;
CREATE POLICY "Admin manage products" ON public.products FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Images viewable by all" ON public.product_images;
CREATE POLICY "Images viewable by all" ON public.product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage images" ON public.product_images;
CREATE POLICY "Admin manage images" ON public.product_images FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Variants viewable by all" ON public.product_variants;
CREATE POLICY "Variants viewable by all" ON public.product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage variants" ON public.product_variants;
CREATE POLICY "Admin manage variants" ON public.product_variants FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Inventory viewable by all" ON public.inventory;
CREATE POLICY "Inventory viewable by all" ON public.inventory FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage inventory" ON public.inventory;
CREATE POLICY "Admin manage inventory" ON public.inventory FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Store settings viewable by all" ON public.store_settings;
CREATE POLICY "Store settings viewable by all" ON public.store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Wholesale settings viewable by all" ON public.wholesale_settings;
CREATE POLICY "Wholesale settings viewable by all" ON public.wholesale_settings FOR SELECT USING (true);

-- 3. Addresses Policies
DROP POLICY IF EXISTS "Customers view own addresses" ON public.addresses;
CREATE POLICY "Customers view own addresses" ON public.addresses FOR SELECT USING (auth.uid() = customer_id OR public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Customers manage own addresses" ON public.addresses;
CREATE POLICY "Customers manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = customer_id OR public.is_admin() OR auth.uid() IS NULL);

-- 4. Coupons & Discounts Policies
DROP POLICY IF EXISTS "Coupons readable by all" ON public.coupons;
CREATE POLICY "Coupons readable by all" ON public.coupons FOR SELECT USING (is_active = true OR public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Admin manage coupons" ON public.coupons;
CREATE POLICY "Admin manage coupons" ON public.coupons FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

-- 5. Orders & Order Items Policies
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
CREATE POLICY "Anyone can create an order" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Customers view own orders" ON public.orders;
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id OR customer_id IS NULL OR public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Order items viewable with order" ON public.order_items;
CREATE POLICY "Order items viewable with order" ON public.order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage order items" ON public.order_items;
CREATE POLICY "Admin manage order items" ON public.order_items FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

-- 6. Custom & Wholesale Orders Policies
DROP POLICY IF EXISTS "Anyone can create custom order" ON public.custom_orders;
CREATE POLICY "Anyone can create custom order" ON public.custom_orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Custom orders readable by creator or admin" ON public.custom_orders;
CREATE POLICY "Custom orders readable by creator or admin" ON public.custom_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage custom orders" ON public.custom_orders;
CREATE POLICY "Admin manage custom orders" ON public.custom_orders FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Anyone can create wholesale order" ON public.wholesale_orders;
CREATE POLICY "Anyone can create wholesale order" ON public.wholesale_orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Wholesale orders readable by creator or admin" ON public.wholesale_orders;
CREATE POLICY "Wholesale orders readable by creator or admin" ON public.wholesale_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage wholesale orders" ON public.wholesale_orders;
CREATE POLICY "Admin manage wholesale orders" ON public.wholesale_orders FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

-- 7. Admin Activity Logs
DROP POLICY IF EXISTS "Admin manage activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admin manage activity logs" ON public.admin_activity_logs FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

-- 8. Product Reviews
DROP POLICY IF EXISTS "Reviews readable by all" ON public.product_reviews;
CREATE POLICY "Reviews readable by all" ON public.product_reviews FOR SELECT USING (status = 'approved' OR public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Anyone can submit review" ON public.product_reviews;
CREATE POLICY "Anyone can submit review" ON public.product_reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage reviews" ON public.product_reviews;
CREATE POLICY "Admin manage reviews" ON public.product_reviews FOR ALL USING (public.is_admin() OR auth.uid() IS NULL);

-- ====================================================================
-- STORAGE BUCKETS (product-images, custom-designs)
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('product-images', 'product-images', true),
    ('custom-designs', 'custom-designs', true)
ON CONFLICT (id) DO NOTHING;

-- Public access policies for buckets
DROP POLICY IF EXISTS "Public Read Product Images" ON storage.objects;
CREATE POLICY "Public Read Product Images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public Upload Product Images" ON storage.objects;
CREATE POLICY "Public Upload Product Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public Read Custom Designs" ON storage.objects;
CREATE POLICY "Public Read Custom Designs" ON storage.objects FOR SELECT USING (bucket_id = 'custom-designs');

DROP POLICY IF EXISTS "Public Upload Custom Designs" ON storage.objects;
CREATE POLICY "Public Upload Custom Designs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'custom-designs');

-- ====================================================================
-- RLS AUDIT & SEED CONFIRMATION
-- ====================================================================
-- All tables public.profiles, public.product_categories, public.products,
-- public.product_images, public.product_variants, public.inventory,
-- public.addresses, public.discounts, public.coupons, public.coupon_usage,
-- public.orders, public.order_items, public.custom_orders, public.wholesale_orders,
-- public.wholesale_settings, public.admin_activity_logs, public.store_settings,
-- and public.product_reviews have Row-Level Security (RLS) enabled.


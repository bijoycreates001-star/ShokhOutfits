export type CategoryType = 'All' | 'T-Shirts' | 'Printed T-Shirts' | 'Hoodies';

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductImageItem {
  url: string;
  label: string;
}

export interface WholesaleTier {
  minQty: number;
  maxQty?: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  category: 'T-Shirts' | 'Printed T-Shirts' | 'Hoodies';
  price: number;
  originalPrice?: number;
  wholesalePrice?: number;
  wholesaleTiers?: WholesaleTier[];
  minWholesaleQty?: number;
  image: string;
  images?: (string | ProductImageItem)[];
  colors: ProductColor[];
  sizes: string[];
  description: string;
  fabric: string;
  gsm: string;
  fit: string;
  badge?: string;
  sku?: string;
  status?: 'active' | 'draft' | 'archived';
  productType?: string;
  productTypes?: string[];
  variants?: Array<{
    id: string;
    sku: string;
    color: string;
    size: string;
    stock: number;
    priceOverride?: number;
  }>;
}

export interface WholesaleMatrixEntry {
  color: string;
  size: string;
  quantity: number;
}

export interface CartItem {
  id: string;
  product: Product;
  selectedColor: string;
  selectedSize: string;
  selectedVariantId?: string;
  quantity: number;
  isWholesale?: boolean;
  wholesaleUnitPrice?: number;
  wholesaleBreakdown?: WholesaleMatrixEntry[];
  wholesaleNote?: string;
  sizeDistribution?: Record<string, number>;
  colorDistribution?: Record<string, number>;
  isCustom?: boolean;
  customDesignUrl?: string;
  customNote?: string;
  customOrderType?: 'website' | 'whatsapp';
}

export interface OrderCustomer {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  deliveryArea: 'dhaka' | 'outside';
}

export interface PlacedOrder {
  orderId: string;
  items: CartItem[];
  customer: OrderCustomer;
  paymentMethod: 'cod' | 'online';
  subtotal: number;
  deliveryFee: number;
  total: number;
  date: string;
}

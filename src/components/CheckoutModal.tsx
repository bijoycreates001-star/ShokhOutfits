import React, { useState, useEffect } from 'react';
import { CartItem, PlacedOrder } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Lock,
  User,
  Mail,
  MapPin,
  Phone,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  Truck,
  Building,
  Check,
  ChevronRight,
  ShoppingBag,
  ExternalLink,
  Ticket,
} from 'lucide-react';
import { ShokhLogo } from './ShokhLogo';
import { metaPixel } from '../services/metaPixel';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onClearCart: () => void;
  onOrderSuccess: (order: PlacedOrder) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onClearCart,
  onOrderSuccess,
}) => {
  const { customer } = useAuth();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka Division');
  const [zipCode, setZipCode] = useState('1205');
  const [phone, setPhone] = useState('');
  
  // Delivery option
  const [deliveryArea, setDeliveryArea] = useState<'dhaka' | 'outside'>('dhaka');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Payment option: 'bkash' (Mobile Banking) or 'cod' (Cash on Delivery) or 'card' (Online Card)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'card'>('bkash');
  const [bkashNumber, setBkashNumber] = useState('');
  const [bkashTrxId, setBkashTrxId] = useState('');
  
  // Card mock state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const [saveInfo, setSaveInfo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Prefill customer info if signed in
  useEffect(() => {
    if (customer) {
      if (customer.fullName && !fullName) setFullName(customer.fullName);
      if (customer.email && !email) setEmail(customer.email);
      if (customer.phone && !phone) setPhone(customer.phone);
      if (customer.addresses && customer.addresses.length > 0 && !address) {
        const defaultAddr = customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
        setAddress(defaultAddr.address);
        setDeliveryArea(defaultAddr.deliveryArea || 'dhaka');
      }
    }
  }, [customer, isOpen]);

  // Reset order state when modal opens or closes & track InitiateCheckout
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFormError(null);

      // Track InitiateCheckout on modal open
      if (items.length > 0) {
        const totalCartValue = items.reduce((sum, it) => {
          const price = it.isWholesale && it.wholesaleUnitPrice ? it.wholesaleUnitPrice : it.product.price;
          return sum + price * it.quantity;
        }, 0);
        const totalItemsCount = items.reduce((sum, it) => sum + it.quantity, 0);

        metaPixel.trackInitiateCheckout({
          value: totalCartValue,
          num_items: totalItemsCount,
          content_ids: items.map((it) => it.product.id),
          currency: 'BDT',
        });
      }
    } else {
      document.body.style.overflow = 'unset';
      setPlacedOrder(null);
      setFormError(null);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleModalClose = () => {
    setPlacedOrder(null);
    setFormError(null);
    onClose();
  };

  if (!isOpen) return null;

  const getItemUnitPrice = (item: CartItem) => {
    return item.isWholesale && item.wholesaleUnitPrice
      ? item.wholesaleUnitPrice
      : item.product.price;
  };

  // Totals
  const subtotal = items.reduce((sum, item) => sum + getItemUnitPrice(item) * item.quantity, 0);
  const deliveryFee = deliveryArea === 'dhaka' ? 70 : 130;
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    try {
      setCouponLoading(true);
      setCouponMsg(null);
      const res = await api.storeValidateCoupon(couponInput.trim(), subtotal);
      if (res.success && res.coupon) {
        setAppliedCouponCode(res.coupon.code);
        setCouponDiscount(res.coupon.discountAmount || 0);
        setCouponMsg({ text: `৳${res.coupon.discountAmount} discount applied!`, error: false });
      } else {
        setCouponMsg({ text: res.error || 'Invalid coupon code.', error: true });
      }
    } catch (err: any) {
      setCouponMsg({ text: err.message || 'Failed to validate coupon.', error: true });
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Please enter your Full Name.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter your phone number.');
      return;
    }
    if (!address.trim()) {
      setFormError('Please provide your complete delivery address.');
      return;
    }

    if (items.length === 0) {
      setFormError('Your cart is empty. Please add items before placing an order.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullAddress = city || district ? `${address}, ${city}, ${district}` : address;
      const payload = {
        customer: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: (email && email.trim()) || (customer && customer.email) || undefined,
          address: fullAddress,
          deliveryArea,
        },
        items: items.map((it) => ({
          productId: it.product.id,
          selectedColor: it.selectedColor,
          selectedSize: it.selectedSize,
          selectedVariantId: it.selectedVariantId,
          quantity: it.quantity,
          isWholesale: it.isWholesale,
          wholesaleBreakdown: it.wholesaleBreakdown,
          customDesignUrl: it.customDesignUrl,
          customNote: it.customNote,
          isCustom: it.isCustom,
        })),
        paymentMethod: paymentMethod === 'cod' ? 'cod' : paymentMethod === 'bkash' ? 'bkash' : 'card',
        couponCode: appliedCouponCode || undefined,
        customerNotes: paymentMethod === 'bkash' && bkashTrxId ? `bKash TrxID: ${bkashTrxId} (From: ${bkashNumber})` : undefined,
      };

      const res = await api.storeCheckout(payload);

      if (res.success && res.order) {
        const orderId = res.order.orderNumber || res.order.id || `ORD-${Date.now()}`;
        const orderTotal = Number(res.order.total || total);

        const orderData: PlacedOrder = {
          orderId,
          items: [...items],
          customer: {
            fullName,
            phone,
            email: email || undefined,
            address: fullAddress,
            deliveryArea,
          },
          paymentMethod: paymentMethod === 'cod' ? 'cod' : 'online',
          subtotal: res.order.subtotal || subtotal,
          deliveryFee: res.order.deliveryFee || deliveryFee,
          total: orderTotal,
          date: new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
        };

        // Track Meta Pixel Purchase event with real order details & deduplication protection
        metaPixel.trackPurchase({
          orderId,
          value: orderTotal,
          currency: 'BDT',
          num_items: items.reduce((sum, it) => sum + (it.quantity || 1), 0),
          content_ids: items.map((it) => it.product?.id || '').filter(Boolean),
          contents: items.map((it) => ({
            id: it.product?.id || 'unknown',
            name: it.product?.name || 'Product',
            quantity: it.quantity || 1,
            item_price: it.isWholesale && it.wholesaleUnitPrice ? it.wholesaleUnitPrice : (it.product?.price || 0),
          })),
        });

        setPlacedOrder(orderData);
        onOrderSuccess(orderData);
        onClearCart();
      } else {
        setFormError(res.error || 'Failed to place order. Please try again.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Checkout failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-50 flex flex-col min-h-screen selection:bg-emerald-500 selection:text-white">
      
      {/* 1. Header (Centered Checkout with lock icon as shown in GOOD UI/UX) */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleModalClose}
            className="p-1.5 sm:p-2 -ml-1 rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            aria-label="Back to store"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-800" />
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline text-neutral-600">
              Return
            </span>
          </button>
        </div>

        {/* Center Header: "Checkout - Complete your purchase securely" */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
              Checkout
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-500 font-medium hidden sm:block">
            Complete your purchase securely
          </p>
        </div>

        {/* Right Green Security Icon */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200 text-emerald-600">
            <Lock className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
      </header>

      {/* 2. Main Page Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {placedOrder ? (
          /* Order Success Confirmation View */
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase">
              Order Placed Successfully!
            </h2>
            <p className="text-xs text-neutral-500 mt-1 font-mono">
              Order ID: <strong className="text-neutral-900">{placedOrder.orderId}</strong>
            </p>

            <div className="mt-6 bg-[#F6F5F2] rounded-2xl p-5 text-left border border-neutral-200/80 text-xs sm:text-sm space-y-2.5">
              <div className="flex justify-between text-neutral-600">
                <span>Customer:</span>
                <span className="font-bold text-neutral-900">{placedOrder.customer.fullName}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Phone:</span>
                <span className="font-bold text-neutral-900 font-mono">{placedOrder.customer.phone}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Delivery Area:</span>
                <span className="font-bold text-neutral-900">
                  {placedOrder.customer.deliveryArea === 'dhaka' ? 'Inside Dhaka (24-48 hrs)' : 'Outside Dhaka (2-3 days)'}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Payment Method:</span>
                <span className="font-bold text-neutral-900">
                  {paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : paymentMethod === 'bkash' ? 'bKash Mobile Banking' : 'Card Payment'}
                </span>
              </div>
              <div className="border-t border-neutral-300 pt-2 flex justify-between text-base font-black text-neutral-900">
                <span>Total Amount:</span>
                <span className="tabular-nums text-emerald-600">৳{placedOrder.total.toLocaleString('en-US')}</span>
              </div>
            </div>

            <p className="text-xs text-neutral-500 mt-4 leading-relaxed">
              We have received your order. Our team will verify your phone number and dispatch with Steadfast/Pathao Courier.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`https://wa.me/8801346068854?text=${encodeURIComponent(
                  `Hello Shokh Outfits, I just placed order ${placedOrder.orderId} for total ৳${placedOrder.total}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-6 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                Track on WhatsApp
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={handleModalClose}
                className="py-3 px-6 rounded-xl bg-white text-neutral-800 border border-neutral-300 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          /* Form Layout: 2 Columns on Desktop & Tablet (Form on Left, Summary on Right) */
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Clean Numbered Steps (1 Contact, 2 Shipping, 3 Payment) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-8 border border-neutral-200 shadow-xs space-y-8">
              
              {/* Validation error banner */}
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center justify-between">
                  <span>{formError}</span>
                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="text-rose-500 hover:text-rose-800 font-bold p-1 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* STEP 1: Contact Information */}
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                    Contact Information
                  </h2>
                </div>

                <div className="space-y-3">
                  {/* Full Name Input with Left Icon */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name *"
                      className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-white rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all text-neutral-900 placeholder:text-neutral-400"
                    />
                  </div>

                  {/* Phone Number Input (Contact Section) */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone Number (017...)*"
                      className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-white rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all text-neutral-900 placeholder:text-neutral-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: Shipping Address & Delivery Option */}
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                    Shipping Address &amp; Delivery
                  </h2>
                </div>

                <div className="space-y-3">
                  {/* Delivery Address (House no., Street name) with Pin Icon */}
                  <div className="relative">
                    <div className="absolute top-3 left-3.5 pointer-events-none text-neutral-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <textarea
                      required
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Address (House no., Street name, Area, Thana) *"
                      className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-white rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all text-neutral-900 placeholder:text-neutral-400 resize-none"
                    />
                  </div>

                  {/* City & District */}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full px-3.5 py-3 text-xs sm:text-sm bg-white rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all text-neutral-900"
                    />
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3.5 py-3 text-xs sm:text-sm bg-white rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all text-neutral-900 cursor-pointer"
                    >
                      <option value="Dhaka Division">Dhaka Division</option>
                      <option value="Chittagong Division">Chittagong Division</option>
                      <option value="Sylhet Division">Sylhet Division</option>
                      <option value="Rajshahi Division">Rajshahi Division</option>
                      <option value="Khulna Division">Khulna Division</option>
                      <option value="Barisal Division">Barisal Division</option>
                      <option value="Rangpur Division">Rangpur Division</option>
                      <option value="Mymensingh Division">Mymensingh Division</option>
                    </select>
                  </div>

                  {/* Delivery Option Radio Cards */}
                  <div className="pt-2">
                    <span className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                      Delivery Option
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        onClick={() => setDeliveryArea('dhaka')}
                        className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                          deliveryArea === 'dhaka'
                            ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="deliveryAreaOption"
                            checked={deliveryArea === 'dhaka'}
                            onChange={() => setDeliveryArea('dhaka')}
                            className="accent-emerald-600 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-neutral-900 block">
                              Inside Dhaka
                            </span>
                            <span className="text-[11px] text-neutral-500">24-48 hours delivery</span>
                          </div>
                        </div>
                        <span className="font-black text-xs sm:text-sm text-emerald-700 tabular-nums">৳60</span>
                      </label>

                      <label
                        onClick={() => setDeliveryArea('outside')}
                        className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                          deliveryArea === 'outside'
                            ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="deliveryAreaOption"
                            checked={deliveryArea === 'outside'}
                            onChange={() => setDeliveryArea('outside')}
                            className="accent-emerald-600 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-neutral-900 block">
                              Outside Dhaka
                            </span>
                            <span className="text-[11px] text-neutral-500">2-3 days delivery</span>
                          </div>
                        </div>
                        <span className="font-black text-xs sm:text-sm text-emerald-700 tabular-nums">৳120</span>
                      </label>
                    </div>
                  </div>

                </div>
              </div>

              {/* STEP 3: Payment Method (bKash, Cash on Delivery, Card tabs like reference) */}
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                    Payment Method
                  </h2>
                </div>

                {/* 3 Horizontal Payment Selector Tabs (Card, bKash / Mobile, COD / Cash) */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  
                  {/* Option A: bKash (Mobile Banking) */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bkash')}
                    className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'bkash'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-[#E2136E]" />
                    <span className="text-xs font-bold">bKash</span>
                  </button>

                  {/* Option B: Cash on Delivery */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'cod'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-neutral-800" />
                    <span className="text-xs font-bold">Cash on Del.</span>
                  </button>

                  {/* Option C: Card */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-neutral-800" />
                    <span className="text-xs font-bold">Card</span>
                  </button>
                </div>

                {/* Sub-fields depending on chosen payment method */}
                <div className="mt-4">
                  {/* bKash Payment Box */}
                  {paymentMethod === 'bkash' && (
                    <div className="p-4 bg-[#FDF2F8] rounded-2xl border border-pink-200 text-left space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#E2136E]" />
                          <span className="text-xs font-bold text-neutral-900">
                            bKash Merchant / Personal Send Money
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-[#E2136E] bg-white px-2 py-0.5 rounded border border-pink-200">
                          01712-345678
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 leading-relaxed">
                        Send total <strong>৳{total.toLocaleString('en-US')}</strong> to the bKash number above or pay to delivery rider. You can provide your bKash phone or TrxID below:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <input
                          type="text"
                          value={bkashNumber}
                          onChange={(e) => setBkashNumber(e.target.value)}
                          placeholder="Your bKash Number (e.g. 018...)"
                          className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-pink-200 focus:outline-none focus:border-[#E2136E] font-mono text-neutral-900"
                        />
                        <input
                          type="text"
                          value={bkashTrxId}
                          onChange={(e) => setBkashTrxId(e.target.value)}
                          placeholder="Transaction ID / TrxID (optional)"
                          className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-pink-200 focus:outline-none focus:border-[#E2136E] font-mono text-neutral-900 uppercase"
                        />
                      </div>
                    </div>
                  )}

                  {/* Cash on Delivery Box */}
                  {paymentMethod === 'cod' && (
                    <div className="p-4 bg-neutral-100 rounded-2xl border border-neutral-200 text-left space-y-2">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-neutral-900">
                          Cash on Delivery (COD) Selected
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        No advance payment needed. Pay in cash to the delivery rider only after receiving your package.
                      </p>
                    </div>
                  )}

                  {/* Card Payment Inputs */}
                  {paymentMethod === 'card' && (
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-left space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                          Card Number
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="1234 5678 9012 3456"
                            className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-500 font-mono text-neutral-900"
                          />
                          <CreditCard className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                            Expiry Date
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-500 font-mono text-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                            CVV
                          </label>
                          <input
                            type="text"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="123"
                            className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-500 font-mono text-neutral-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                          Name on Card
                        </label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="Name on card"
                          className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-500 text-neutral-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Save info checkbox (like reference image) */}
                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveThisInfo"
                    checked={saveInfo}
                    onChange={(e) => setSaveInfo(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <label htmlFor="saveThisInfo" className="text-xs text-neutral-700 font-medium cursor-pointer">
                    Save this information for faster checkout next time
                  </label>
                </div>

                {/* Green "Pay Securely" Button (from reference) */}
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting || items.length === 0}
                    className="w-full py-4 px-6 rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 disabled:bg-neutral-300"
                  >
                    <Lock className="w-4 h-4 text-white" />
                    <span>
                      {isSubmitting
                        ? 'Processing Order...'
                        : paymentMethod === 'cod'
                        ? `Confirm Order · ৳${total.toLocaleString('en-US')}`
                        : `Pay Securely · ৳${total.toLocaleString('en-US')} >`}
                    </span>
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Your data is safe and encrypted</span>
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN: Order Summary Card (Responsive Tablet & Desktop) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-7 border border-neutral-200 shadow-xs space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="font-bold text-sm text-neutral-900">
                  Order Summary
                </h3>
                <span className="text-xs font-semibold text-neutral-500">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-neutral-100 max-h-60 overflow-y-auto pr-1 space-y-1">
                {items.map((item) => {
                  const unitPrice = getItemUnitPrice(item);
                  return (
                    <div key={item.id} className="py-2.5 flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-neutral-900 truncate">
                            {item.product.name}
                          </p>
                          {item.isWholesale && (
                            <span className="text-[9px] font-black bg-black text-white px-1.5 py-0.2 rounded uppercase">
                              Wholesale ({item.quantity} pcs)
                            </span>
                          )}
                          {item.isCustom && (
                            <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.2 rounded uppercase">
                              Custom Print
                            </span>
                          )}
                        </div>
                        {item.isWholesale ? (
                          <div className="text-[10px] text-neutral-500 mt-0.5 space-y-0.5">
                            {item.sizeDistribution && (
                              <p>
                                Sizes: {Object.entries(item.sizeDistribution).filter(([_, q]) => q > 0).map(([s, q]) => `${s}:${q}`).join(', ')}
                              </p>
                            )}
                            {item.colorDistribution && (
                              <p>
                                Colors: {Object.entries(item.colorDistribution).filter(([_, q]) => q > 0).map(([c, q]) => `${c}:${q}`).join(', ')}
                              </p>
                            )}
                            {item.wholesaleNote && (
                              <p className="italic text-neutral-600 font-medium line-clamp-1">
                                Note: "{item.wholesaleNote}"
                              </p>
                            )}
                          </div>
                        ) : item.isCustom ? (
                          <div className="text-[10px] text-neutral-500 mt-0.5 space-y-0.5">
                            <p>
                              {item.selectedColor} · Size {item.selectedSize} · Qty {item.quantity}
                            </p>
                            {item.customNote && (
                              <p className="italic text-neutral-600 font-medium line-clamp-1">
                                Note: "{item.customNote}"
                              </p>
                            )}
                            {item.customDesignUrl && (
                              <p className="text-[10px] text-indigo-600 font-bold">
                                ✓ Custom Artwork Attached
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-500">
                            {item.selectedColor} · Size {item.selectedSize} · Qty {item.quantity}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-neutral-900 tabular-nums shrink-0">
                        ৳{(unitPrice * item.quantity).toLocaleString('en-US')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Promo Code Input Box */}
              <div className="pt-3 border-t border-neutral-100 space-y-2">
                <label className="text-[11px] font-bold text-neutral-700 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Promo Code / Coupon</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter code (e.g. WELCOME10)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-black uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {couponLoading ? 'Checking...' : 'Apply'}
                  </button>
                </div>
                {couponMsg && (
                  <p className={`text-[11px] font-bold ${couponMsg.error ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-neutral-900 tabular-nums">
                    ৳{subtotal.toLocaleString('en-US')}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount ({appliedCouponCode})</span>
                    <span className="tabular-nums">-৳{couponDiscount.toLocaleString('en-US')}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600">
                  <span>
                    Delivery ({deliveryArea === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})
                  </span>
                  <span className="font-bold text-neutral-900 tabular-nums">
                    ৳{deliveryFee}
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-200 flex justify-between text-base font-black text-neutral-900">
                  <span>Total</span>
                  <span className="text-emerald-600 tabular-nums">
                    ৳{total.toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              {/* Trust Features list */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2 text-xs text-neutral-600">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>7-Day Easy Exchange Policy</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Check product before paying rider (COD)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Real-time SMS &amp; phone verification</span>
                </div>
              </div>

            </div>

          </form>
        )}

      </main>

    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Eye,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  ExternalLink,
  MapPin,
  X,
  CreditCard
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'registered' | 'guests'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.adminGetCustomers();
      if (res.success) {
        if (filterTab === 'registered') setCustomers(res.registered || []);
        else if (filterTab === 'guests') setCustomers(res.guests || []);
        else setCustomers(res.all || []);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [filterTab]);

  useEffect(() => {
    fetchCustomers(false);

    // Auto-polling every 5 seconds
    const interval = setInterval(() => {
      fetchCustomers(true);
    }, 5000);

    // Refetch on focus
    const handleFocus = () => {
      fetchCustomers(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchCustomers]);

  const handleOpenDetail = async (id: string) => {
    try {
      setSelectedCustomerId(id);
      setLoadingDetail(true);
      const res = await api.adminGetCustomer(id);
      if (res.success && res.customer) {
        setCustomerDetail(res.customer);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load customer profile');
    } finally {
      setLoadingDetail(false);
    }
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Customer Directory</h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Registered customer accounts, guest orders, lifetime spending &amp; purchase histories
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-black w-60 sm:w-72"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'all'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-50'
          }`}
        >
          All Customers
        </button>
        <button
          onClick={() => setFilterTab('registered')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'registered'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-50'
          }`}
        >
          Registered Accounts
        </button>
        <button
          onClick={() => setFilterTab('guests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'guests'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-50'
          }`}
        >
          Guest Checkouts
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Registered Date</th>
                <th className="py-3.5 px-4">Orders</th>
                <th className="py-3.5 px-4">Total Spent</th>
                <th className="py-3.5 px-4">Last Order</th>
                <th className="py-3.5 px-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    Loading customers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filtered
                  .filter((c) => c && c.id)
                  .map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs">
                          {c.name ? c.name[0] : 'U'}
                        </div>
                        <span className="font-bold text-neutral-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600">{c.phone}</td>
                    <td className="py-3.5 px-4 text-neutral-500">{c.email}</td>
                    <td className="py-3.5 px-4 text-neutral-400 whitespace-nowrap">{c.registrationDate}</td>
                    <td className="py-3.5 px-4 font-bold text-neutral-900">{c.totalOrders} orders</td>
                    <td className="py-3.5 px-4 font-black text-neutral-900">৳{c.totalSpent?.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">{c.lastOrderDate}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(c.id)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER DETAIL & SHOPPING HISTORY MODAL */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 flex flex-col">
            <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-black">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-900">
                    Customer Profile &amp; Shopping History
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Detailed breakdown of spending, past orders, and addresses
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-2 rounded-xl border border-neutral-200 hover:bg-white text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 text-xs">
              {loadingDetail || !customerDetail ? (
                <div className="py-12 text-center text-neutral-400">
                  Loading customer details...
                </div>
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                      <p className="text-neutral-400 text-[11px] font-semibold">Total Orders</p>
                      <p className="text-xl font-black text-neutral-900 mt-1">{customerDetail.stats?.totalOrders}</p>
                    </div>
                    <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                      <p className="text-neutral-400 text-[11px] font-semibold">Total Spent</p>
                      <p className="text-xl font-black text-neutral-900 mt-1">৳{customerDetail.stats?.totalSpent?.toLocaleString()}</p>
                    </div>
                    <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                      <p className="text-neutral-400 text-[11px] font-semibold">Avg Order Value</p>
                      <p className="text-xl font-black text-neutral-900 mt-1">৳{customerDetail.stats?.averageOrderValue?.toLocaleString()}</p>
                    </div>
                    <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                      <p className="text-neutral-400 text-[11px] font-semibold">Customer Status</p>
                      <p className="text-xs font-black uppercase text-emerald-600 mt-2">{customerDetail.status || 'Active'}</p>
                    </div>
                  </div>

                  {/* Profile info & address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-neutral-200 bg-white space-y-1.5">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase">Personal Info</p>
                      <p className="text-sm font-extrabold text-neutral-900">{customerDetail.name}</p>
                      <p className="text-neutral-600">Email: {customerDetail.email}</p>
                      <p className="text-neutral-600">Phone: {customerDetail.phone}</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-neutral-200 bg-white space-y-1.5">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase">Saved Addresses</p>
                      {customerDetail.addresses?.map((addr: any, i: number) => (
                        <div key={i} className="text-neutral-700 font-semibold leading-relaxed">
                          {addr.address} ({addr.deliveryArea})
                        </div>
                      )) || <p className="text-neutral-400">No saved address.</p>}
                    </div>
                  </div>

                  {/* Complete Shopping History Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                      Order History ({customerDetail.orders?.length || 0})
                    </h4>
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="py-2.5 px-3">Order ID</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Items</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {customerDetail.orders?.map((o: any) => (
                            <tr key={o.id} className="hover:bg-neutral-50">
                              <td className="py-2.5 px-3 font-bold text-neutral-900">{o.orderNumber}</td>
                              <td className="py-2.5 px-3 text-neutral-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                              <td className="py-2.5 px-3 font-medium truncate max-w-44">
                                {o.items?.map((it: any) => it.productName).join(', ')}
                              </td>
                              <td className="py-2.5 px-3 font-black text-neutral-900">৳{o.total?.toLocaleString()}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-800">
                                  {o.orderStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

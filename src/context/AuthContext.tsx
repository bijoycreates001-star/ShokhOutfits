import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, AdminProfile, CustomerProfile } from '../services/api';
import { supabase, isSupabaseConfigured, logSupabaseError } from '../lib/supabaseClient';

interface AuthContextType {
  // Admin state
  admin: AdminProfile | null;
  adminToken: string | null;
  isAdminLoading: boolean;
  loginAdmin: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;

  // Customer state
  customer: CustomerProfile | null;
  customerToken: string | null;
  isCustomerLoading: boolean;
  loginCustomer: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerCustomer: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
    deliveryArea?: string;
  }) => Promise<{ success: boolean; error?: string; emailConfirmationRequired?: boolean }>;
  logoutCustomer: () => Promise<void>;
  refreshCustomer: () => Promise<void>;

  // UI Modals
  isCustomerAuthModalOpen: boolean;
  openCustomerAuthModal: (defaultTab?: 'login' | 'register' | 'track') => void;
  closeCustomerAuthModal: () => void;
  customerAuthModalDefaultTab: 'login' | 'register' | 'track';

  isCustomerDrawerOpen: boolean;
  openCustomerDrawer: () => void;
  closeCustomerDrawer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminProfile | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('shokh_admin_profile');
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [adminToken, setAdminToken] = useState<string | null>(() => api.getAdminToken());
  const [isAdminLoading, setIsAdminLoading] = useState<boolean>(true);

  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('shokh_customer_profile');
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [customerToken, setCustomerToken] = useState<string | null>(() => api.getCustomerToken());
  const [isCustomerLoading, setIsCustomerLoading] = useState<boolean>(true);

  const [isCustomerAuthModalOpen, setIsCustomerAuthModalOpen] = useState(false);
  const [customerAuthModalDefaultTab, setCustomerAuthModalDefaultTab] = useState<'login' | 'register' | 'track'>('login');
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);

  // Helper to load Supabase profile & addresses for active session user
  const syncUserFromSession = useCallback(async (user: any) => {
    if (!user || !user.id) return;
    try {
      const [profRes, addrsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('addresses').select('*').eq('customer_id', user.id).order('is_default', { ascending: false }),
      ]);

      if (profRes.error) {
        logSupabaseError('syncUserFromSession:profiles', profRes.error);
      }

      let profile = profRes.data;
      if (!profile && user.id) {
        const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || 'Customer';
        const fallbackPhone = user.user_metadata?.phone || '';
        const { data: createdProf, error: createErr } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: fallbackName,
            email: user.email || '',
            phone: fallbackPhone,
            role: 'customer',
          })
          .select()
          .maybeSingle();

        if (!createErr && createdProf) {
          profile = createdProf;
        }
      }

      const addrs = addrsRes.data || [];

      const mappedAddrs = addrs.map((a) => ({
        id: a.id,
        label: a.area === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
        address: a.full_address,
        deliveryArea: (a.area as any) || 'dhaka',
        phone: a.phone,
        isDefault: a.is_default,
      }));

      const customerObj: CustomerProfile = {
        id: user.id,
        fullName: profile?.full_name || user.user_metadata?.full_name || 'Customer',
        email: user.email || '',
        phone: profile?.phone || user.user_metadata?.phone || '',
        addresses: mappedAddrs,
      };

      setCustomer(customerObj);
      setCustomerToken(user.id);
      api.setCustomerToken(user.id);
      try {
        window.localStorage.setItem('shokh_customer_profile', JSON.stringify(customerObj));
      } catch {
        // ignore
      }

      // Check role for Admin access
      const adminEmails = ['sokhtshirt@gmail.com', 'bijoycreates001@gmai.com', 'bijoycreates001@gmail.com'];
      const isDesignatedEmail = user.email && adminEmails.includes(user.email.toLowerCase());
      const role = profile?.role || (isDesignatedEmail ? 'admin' : 'customer');

      if (role === 'admin' || isDesignatedEmail) {
        const adminObj: AdminProfile = {
          id: user.id,
          email: user.email || '',
          name: profile?.full_name || 'Admin',
          role: 'admin',
          lastLoginAt: Date.now(),
        };
        setAdmin(adminObj);
        setAdminToken(user.id);
        api.setAdminToken(user.id);
        try {
          window.localStorage.setItem('shokh_admin_profile', JSON.stringify(adminObj));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      logSupabaseError('syncUserFromSession:exception', err);
    }
  }, []);

  // Initialize Supabase Auth & Listen to onAuthStateChange
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            logSupabaseError('getSession', error);
          }
          if (session?.user && isMounted) {
            await syncUserFromSession(session.user);
            return;
          }
        }

        if (isMounted) {
          // Restore Admin session from persistent storage
          try {
            const savedAdminProf = localStorage.getItem('shokh_admin_profile');
            const savedAdminTok = localStorage.getItem('shokh_admin_token');
            if (savedAdminProf && savedAdminTok) {
              const parsedAdmin = JSON.parse(savedAdminProf);
              if (parsedAdmin && parsedAdmin.email) {
                setAdmin(parsedAdmin);
                setAdminToken(savedAdminTok);
                api.setAdminToken(savedAdminTok);
              }
            }
          } catch (adminErr) {
            console.warn('Error restoring admin profile:', adminErr);
          }

          // Restore Customer session from persistent storage
          try {
            const savedCustProf = localStorage.getItem('shokh_customer_profile');
            const savedCustTok = localStorage.getItem('shokh_customer_token');
            if (savedCustProf && savedCustTok) {
              const parsedCust = JSON.parse(savedCustProf);
              if (parsedCust && parsedCust.id) {
                setCustomer(parsedCust);
                setCustomerToken(savedCustTok);
                api.setCustomerToken(savedCustTok);
              }
            }
          } catch (custErr) {
            console.warn('Error restoring customer profile:', custErr);
          }
        }
      } catch (err) {
        logSupabaseError('checkSession:catch', err);
      } finally {
        if (isMounted) {
          setIsAdminLoading(false);
          setIsCustomerLoading(false);
        }
      }
    };

    checkSession();

    let subscription: any = null;
    if (isSupabaseConfigured) {
      const authListener = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user && isMounted) {
            await syncUserFromSession(session.user);
          }
        }
      });
      subscription = authListener.data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [syncUserFromSession]);

  const loginAdmin = async (email: string, password: string, rememberMe = true) => {
    try {
      const res = await api.adminLogin(email, password, rememberMe);
      if (res.success && res.admin) {
        setAdmin(res.admin);
        setAdminToken(res.token);
        try {
          window.localStorage.setItem('shokh_admin_profile', JSON.stringify(res.admin));
        } catch {
          // ignore
        }
        return { success: true };
      }
      return { success: false, error: res.error || 'Login failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed.' };
    }
  };

  const logoutAdmin = async () => {
    try {
      await api.adminLogout();
    } catch {
      // ignore
    } finally {
      setAdmin(null);
      setAdminToken(null);
      api.setAdminToken(null);
      try {
        window.localStorage.removeItem('shokh_admin_profile');
      } catch {
        // ignore
      }
    }
  };

  const loginCustomer = async (identifier: string, password: string) => {
    try {
      const res = await api.customerLogin(identifier, password);
      if (res.success && res.customer) {
        setCustomer(res.customer);
        setCustomerToken(res.token);
        try {
          window.localStorage.setItem('shokh_customer_profile', JSON.stringify(res.customer));
        } catch {
          // ignore
        }
        if (res.admin) {
          setAdmin(res.admin);
          setAdminToken(res.adminToken || res.token);
          try {
            window.localStorage.setItem('shokh_admin_profile', JSON.stringify(res.admin));
          } catch {
            // ignore
          }
        }
        setIsCustomerAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: res.error || 'Login failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed.' };
    }
  };

  const registerCustomer = async (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
    deliveryArea?: string;
  }) => {
    try {
      const res = await api.customerRegister(data);
      if (res.success) {
        if (res.customer && !res.emailConfirmationRequired) {
          setCustomer(res.customer);
          setCustomerToken(res.token);
          try {
            window.localStorage.setItem('shokh_customer_profile', JSON.stringify(res.customer));
          } catch {
            // ignore
          }
          setIsCustomerAuthModalOpen(false);
        }
        return {
          success: true,
          emailConfirmationRequired: res.emailConfirmationRequired,
        };
      }
      return { success: false, error: res.error || 'Registration failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  const logoutCustomer = async () => {
    await api.customerLogout();
    setCustomer(null);
    setCustomerToken(null);
    setAdmin(null);
    setAdminToken(null);
    setIsCustomerDrawerOpen(false);
    try {
      window.localStorage.removeItem('shokh_customer_profile');
      window.localStorage.removeItem('shokh_admin_profile');
    } catch {
      // ignore
    }
  };

  const refreshCustomer = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await syncUserFromSession(user);
    }
  };

  const openCustomerAuthModal = (defaultTab: 'login' | 'register' | 'track' = 'login') => {
    setCustomerAuthModalDefaultTab(defaultTab);
    setIsCustomerAuthModalOpen(true);
  };

  const closeCustomerAuthModal = () => {
    setIsCustomerAuthModalOpen(false);
  };

  const openCustomerDrawer = () => {
    setIsCustomerDrawerOpen(true);
  };

  const closeCustomerDrawer = () => {
    setIsCustomerDrawerOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        adminToken,
        isAdminLoading,
        loginAdmin,
        logoutAdmin,
        customer,
        customerToken,
        isCustomerLoading,
        loginCustomer,
        registerCustomer,
        logoutCustomer,
        refreshCustomer,
        isCustomerAuthModalOpen,
        openCustomerAuthModal,
        closeCustomerAuthModal,
        customerAuthModalDefaultTab,
        isCustomerDrawerOpen,
        openCustomerDrawer,
        closeCustomerDrawer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

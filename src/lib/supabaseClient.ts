import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read Supabase credentials dynamically from Vite or Node environment variables
const rawUrl: string = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)) ||
  ''
).trim();

const rawKey: string = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)) ||
  ''
).trim();

export const isSupabaseConfigured: boolean = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl.startsWith('https://') &&
  !rawUrl.includes('your-project') &&
  !rawKey.includes('your-publishable-key') &&
  !rawKey.includes('your-key')
);

export const safeUrl: string = isSupabaseConfigured ? rawUrl : '';
export const safeKey: string = isSupabaseConfigured ? rawKey : '';

// Custom fetch to route requests through same-origin /api/supabase in browser preview environments
const proxyFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (!isSupabaseConfigured) {
    return Promise.reject(new Error('Supabase is not configured.'));
  }

  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

  const isStaticDeploy =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('netlify.app') ||
      window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('shokhoutfits.com'));

  if (!isStaticDeploy && typeof window !== 'undefined' && url.includes('.supabase.co')) {
    const proxyUrl = url.replace(/https:\/\/[^/]+\.supabase\.co/, '/api/supabase');
    const enrichedHeaders = new Headers(init?.headers || {});
    enrichedHeaders.set('x-supabase-target-url', safeUrl);
    enrichedHeaders.set('x-supabase-client-key', safeKey);
    if (!enrichedHeaders.has('apikey')) {
      enrichedHeaders.set('apikey', safeKey);
    }
    if (!enrichedHeaders.has('Authorization') && !enrichedHeaders.has('authorization')) {
      enrichedHeaders.set('Authorization', `Bearer ${safeKey}`);
    }
    return fetch(proxyUrl, {
      ...init,
      headers: enrichedHeaders,
    }).catch(() => fetch(input, init));
  }

  return fetch(input, init);
};

// Create the Supabase client when configured, or a dummy client if unconfigured to prevent runtime null crashes
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(safeUrl, safeKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'shokh_supabase_auth_token',
      },
      global: {
        fetch: proxyFetch,
      },
    })
  : createClient('https://placeholder-disconnected.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

export function logSupabaseError(operation: string, error: any) {
  if (error && isSupabaseConfigured) {
    console.warn(`[Supabase Notice in "${operation}"]:`, {
      message: error.message || error,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
}

export default supabase;

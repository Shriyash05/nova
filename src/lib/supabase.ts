import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = (
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://jcwlxiujyjlessgfwjgu.supabase.co'
).trim();

export const getSupabaseAnonKey = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('nova_supabase_anon_key');
    if (stored && stored.trim().length > 10) return stored.trim();
  }
  return ((import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '').trim();
};

export const setSupabaseAnonKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem('nova_supabase_anon_key', key.trim());
    } else {
      localStorage.removeItem('nova_supabase_anon_key');
    }
  }
};

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && getSupabaseAnonKey());
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  const key = getSupabaseAnonKey();
  clientInstance = createClient(SUPABASE_URL, key || 'placeholder-anon-key', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return clientInstance;
};

export const supabase = getSupabaseClient();

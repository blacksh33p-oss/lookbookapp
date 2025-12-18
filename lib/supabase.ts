import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  const value = (import.meta as any).env?.[key] || (window as any).process?.env?.[key] || '';
  return value.trim();
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Strict check to see if we have valid-looking credentials
export const isConfigured = 
  supabaseUrl.length > 10 && 
  supabaseAnonKey.length > 10 && 
  !supabaseUrl.includes('placeholder');

if (!isConfigured && typeof window !== 'undefined') {
  console.warn('FashionStudio: Supabase configuration missing. Archive features disabled.');
}

// Initialize client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
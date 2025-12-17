import { createClient } from '@supabase/supabase-js';

/**
 * Safely resolves environment variables from Vite's import.meta.env.
 * Prevents crashes if the environment is not standard Vite or missing vars.
 */
const getSafeEnv = () => {
  try {
    const meta = import.meta as any;
    if (meta && meta.env) {
      return meta.env;
    }
  } catch (e) {}
  return {};
};

const env = getSafeEnv();
const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isConfigured = !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.length > 0;

if (!isConfigured && typeof window !== 'undefined') {
  console.warn('FashionStudio: Missing or invalid Supabase Environment Variables (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY).');
}

// Initialize with safe fallbacks to prevent "Cannot read properties of undefined"
export const supabase: any = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
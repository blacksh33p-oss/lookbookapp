import { createClient } from '@supabase/supabase-js';

// Robust environment variable detector for Vite/Vercel
const getSafeEnv = (key: string): string => {
  if (typeof window === 'undefined') return '';
  
  try {
    // Check Vite's import.meta.env first
    const meta = (import.meta as any);
    if (meta && meta.env && meta.env[key]) {
      return meta.env[key];
    }
  } catch (e) {}

  try {
    // Fallback to process.env if available
    const proc = (window as any).process;
    if (proc && proc.env && proc.env[key]) {
      return proc.env[key];
    }
  } catch (e) {}

  return '';
};

const supabaseUrl = getSafeEnv('VITE_SUPABASE_URL').trim();
const supabaseAnonKey = getSafeEnv('VITE_SUPABASE_ANON_KEY').trim();

// Initialization with strict configuration check
export const isConfigured = !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseUrl.length > 10;

if (!isConfigured && typeof window !== 'undefined') {
  console.warn('FashionStudio: Supabase not configured. Archive features will be disabled.');
}

// Create client with fallback values to prevent initialization crash
export const supabase: any = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
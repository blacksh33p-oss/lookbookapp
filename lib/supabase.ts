import { createClient } from '@supabase/supabase-js';

// Safe environment variable accessor that checks multiple sources
const getEnvVar = (key: string): string => {
  try {
    // Check Vite's import.meta.env first
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const val = (import.meta as any).env[key];
      if (val) return val;
    }
  } catch (e) {}

  try {
    // Fallback to process.env (for environments that shim it or SSR)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] || '';
    }
  } catch (e) {}

  // Also check window.process for browser shims
  try {
    const win = window as any;
    if (win.process?.env?.[key]) {
      return win.process.env[key];
    }
  } catch (e) {}

  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL').trim();
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY').trim();

export const isConfigured = !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.length > 0;

if (!isConfigured) {
  console.warn('FashionStudio: Missing or invalid Supabase Environment Variables (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY). Authentication features will be disabled.');
}

// Initialize with safe fallbacks to prevent client-side crashes
export const supabase: any = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

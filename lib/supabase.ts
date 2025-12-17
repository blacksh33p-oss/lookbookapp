import { createClient } from '@supabase/supabase-js';

/**
 * Defensive access to import.meta.env to prevent "Cannot read properties of undefined" 
 * errors during initialization if the bundler hasn't injected the env object yet.
 */
const env = (import.meta as any).env || {};

const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isConfigured = !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.length > 0;

if (!isConfigured && typeof window !== 'undefined') {
  console.warn('FashionStudio: Missing Supabase Environment Variables. Login and Folders will be disabled.');
}

// Initialize with safe fallbacks to prevent instantiation crashes
export const supabase: any = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
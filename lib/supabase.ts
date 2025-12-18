import { createClient } from '@supabase/supabase-js';

// Safe access for Vite environment variables
const getEnvVar = (name: string): string => {
  try {
    const meta = (import.meta as any);
    if (meta && meta.env) {
      return meta.env[name] || '';
    }
  } catch (e) {}
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL').trim();
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY').trim();

export const isConfigured = !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseUrl.length > 5;

if (!isConfigured && typeof window !== 'undefined') {
  console.warn('FashionStudio: Supabase not configured. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for Archive features.');
}

// Initialize client with fallback to prevent crash during setup
export const supabase: any = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
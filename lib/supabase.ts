
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  // Priority: check window.process.env (populated by env-bridge) then import.meta.env
  const value = (window as any).process?.env?.[key] || (import.meta as any).env?.[key] || '';
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
  console.warn('FashionStudio: Supabase configuration missing. Archive features disabled. Check your environment variables.');
}

// Initialize client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

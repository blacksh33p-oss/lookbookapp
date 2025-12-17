
import { createClient } from '@supabase/supabase-js';

// Access variables from process.env which are defined in vite.config.ts or shimmed in index.html.
const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co' && !supabaseUrl.includes('placeholder');

if (!isConfigured) {
  console.warn('FashionStudio: Missing or invalid Supabase Environment Variables (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY). Authentication features will be disabled.');
}

// Initialize with safe fallbacks
export const supabase: any = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

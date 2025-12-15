import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables in any environment (Vite, Node, etc.)
const getEnvVar = (key: string) => {
  // 1. Try Vite's import.meta.env
  // Use optional chaining (?.) to avoid crash if (import.meta as any).env is undefined
  const viteVal = (import.meta as any).env?.[key];
  if (viteVal) return viteVal;

  // 2. Try process.env (Node.js / Webpack fallback)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignore ReferenceError if process is not defined
  }
  return '';
};

// Trim to avoid copy-paste whitespace issues
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')?.trim();
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY')?.trim();

export const isConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co';

if (!isConfigured) {
  console.warn('FashionStudio: Missing or invalid Supabase Environment Variables. Authentication features will be disabled.');
}

// Initialize with safe fallbacks to prevent runtime crash on load
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

/**
 * ENVIRONMENT BRIDGE
 * Ensures process.env is available globally and stays in sync with platform injections.
 * This is crucial for Gemini 3 Pro model access which requires dynamic API key switching.
 */
if (typeof window !== 'undefined') {
  const win = window as any;
  
  // Create process.env if it doesn't exist
  if (!win.process) win.process = { env: {} };
  if (!win.process.env) win.process.env = {};

  // Sync VITE_ prefixed keys to process.env
  const env = (import.meta as any).env || {};
  Object.keys(env).forEach(key => {
    // 1. Sync the exact key (e.g., VITE_SUPABASE_URL)
    win.process.env[key] = env[key];
    
    // 2. Also sync the stripped key for convenience (e.g., SUPABASE_URL)
    if (key.startsWith('VITE_')) {
      const strippedKey = key.replace('VITE_', '');
      if (!win.process.env[strippedKey]) {
        win.process.env[strippedKey] = env[key];
      }
    }
  });

  // Ensure API_KEY specifically is set if VITE_API_KEY exists
  // This is the primary key used by the @google/genai SDK
  if (!win.process.env.API_KEY) {
    win.process.env.API_KEY = env.VITE_API_KEY || env.VITE_GOOGLE_API_KEY || '';
  }
}

export {};

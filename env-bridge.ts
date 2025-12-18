
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

  // Sync VITE_ prefixed keys to process.env for local development
  const env = (import.meta as any).env || {};
  Object.keys(env).forEach(key => {
    if (key.startsWith('VITE_')) {
      const processKey = key.replace('VITE_', '');
      if (!win.process.env[processKey]) {
        win.process.env[processKey] = env[key];
      }
    }
  });

  // Ensure API_KEY specifically is set if VITE_API_KEY exists
  if (!win.process.env.API_KEY && env.VITE_API_KEY) {
    win.process.env.API_KEY = env.VITE_API_KEY;
  }
}

export {};

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * ENVIRONMENT BRIDGE
 * Strictly required to satisfy @google/genai SDK guidelines when running in a 
 * deployed environment like Vercel where API keys are provided via VITE_ prefixes.
 */
declare global {
  interface Window {
    process: {
      env: {
        API_KEY?: string;
        [key: string]: any;
      }
    }
  }
}

// Ensure window.process.env exists without overwriting existing shims
window.process = window.process || ({} as any);
window.process.env = window.process.env || ({} as any);

// Safely attempt to get the API key from Vite's environment variables
const getViteEnv = (key: string): string | undefined => {
  try {
    // Check import.meta.env if it exists (standard for Vite)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch (e) {
    // Fallback if import.meta is restricted
  }
  return undefined;
};

// Map Vite's VITE_API_KEY (or variants) to process.env.API_KEY as required by the Gemini SDK.
const viteKey = getViteEnv('VITE_API_KEY') || getViteEnv('VITE_GEMINI_API_KEY') || getViteEnv('VITE_GOOGLE_API_KEY');

if (viteKey) {
  window.process.env.API_KEY = viteKey;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

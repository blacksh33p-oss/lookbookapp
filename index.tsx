/**
 * ENVIRONMENT BRIDGE - CRITICAL
 * This must run before other imports to ensure process.env.API_KEY 
 * is available globally for the @google/genai SDK.
 */
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  
  let apiKey: string | undefined;
  
  try {
    // Safely check for Vite's env object
    const meta = import.meta as any;
    if (meta && meta.env) {
      apiKey = meta.env.VITE_API_KEY || meta.env.VITE_GEMINI_API_KEY || meta.env.VITE_GOOGLE_API_KEY;
    }
  } catch (e) {
    console.debug("FashionStudio: import.meta.env access restricted or unavailable");
  }

  // If the bridge finds a key, attach it to the shimmed process object
  if (apiKey) {
    win.process.env.API_KEY = apiKey;
    console.debug("FashionStudio: API Key bridged from environment.");
  }
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

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
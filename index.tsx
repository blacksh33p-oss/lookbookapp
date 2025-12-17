/**
 * ENVIRONMENT BRIDGE - CRITICAL
 * This must use static property access (import.meta.env.KEY) so that 
 * Vite's compiler can replace the values during the production build.
 */
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  
  // Safe access to prevent TypeErrors if environment isn't fully initialized
  const env = (import.meta as any).env || {};
  
  // Explicit static access - Mandatory for Vite build replacement
  const apiKey = env.VITE_API_KEY || 
                 env.VITE_GEMINI_API_KEY || 
                 env.VITE_GOOGLE_API_KEY;
  
  if (apiKey) {
    win.process.env.API_KEY = apiKey;
    console.debug("FashionStudio: API Key bridged successfully.");
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
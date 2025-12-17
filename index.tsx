/**
 * ENVIRONMENT BRIDGE
 * This must run before ANY other imports to ensure process.env.API_KEY 
 * is available globally for the @google/genai SDK.
 */
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  
  // Use import.meta.env for Vite projects (standard on Vercel/Vite)
  const env = (import.meta as any).env;
  const apiKey = env?.VITE_API_KEY || env?.VITE_GEMINI_API_KEY || env?.VITE_GOOGLE_API_KEY;
  
  if (apiKey && !win.process.env.API_KEY) {
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

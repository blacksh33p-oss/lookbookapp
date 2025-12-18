import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * ENVIRONMENT BRIDGE
 * Ensures environment variables are available to services in production.
 * Vite replaces 'import.meta.env' values during the build process.
 */
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  
  // Defensive access to import.meta to prevent 'Cannot read properties of undefined'
  const meta = (import.meta as any);
  const env = meta.env || {};
  
  const apiKey = env.VITE_API_KEY || 
                 env.VITE_GEMINI_API_KEY || 
                 env.VITE_GOOGLE_API_KEY;
                 
  if (apiKey) {
    win.process.env.API_KEY = apiKey;
  }
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
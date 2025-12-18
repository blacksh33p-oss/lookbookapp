import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * ENVIRONMENT BRIDGE
 * Ensures core environment variables are available globally.
 */
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  
  const env = (import.meta as any).env || {};
  
  // Ensure keys exist in process.env for service compatibility
  const keys = ['VITE_API_KEY', 'API_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  keys.forEach(key => {
    if (env[key]) win.process.env[key] = env[key];
  });
  
  // Standardize API_KEY for Gemini SDK
  if (win.process.env.VITE_API_KEY && !win.process.env.API_KEY) {
    win.process.env.API_KEY = win.process.env.VITE_API_KEY;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
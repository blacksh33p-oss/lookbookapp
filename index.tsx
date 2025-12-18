
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * ENVIRONMENT BRIDGE
 * Ensures core environment variables are available globally and dynamically.
 */
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  
  const env = (import.meta as any).env || {};
  
  // Standardize API_KEY for Gemini SDK
  // We check window.process.env first as it might be injected by the AI Studio environment
  if (!win.process.env.API_KEY && env.VITE_API_KEY) {
    win.process.env.API_KEY = env.VITE_API_KEY;
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

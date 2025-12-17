
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // We remove the hard-definition of process.env.API_KEY to let the runtime 
    // environment (like AI Studio) inject it dynamically when the user selects a key.
    define: {
      // Still allow VITE_ prefix variables for other config
    },
    envPrefix: 'VITE_',
    build: {
      outDir: 'dist',
    },
    server: {
      port: 5173,
      host: true
    }
  };
});

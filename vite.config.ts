import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: 'VITE_', // Explicitly tell Vite to load VITE_ variables
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    host: true
  }
});
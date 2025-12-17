
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // We load env vars but do NOT define them under process.env here to avoid
  // conflicting with dynamic runtime injection.
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    server: {
      port: 5173,
      host: true
    }
  };
});


import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // We only define specific environment variables for Supabase.
    // We do NOT define process.env.API_KEY here to avoid esbuild syntax errors during deployment.
    // This allows the browser to fall back to the runtime 'process' object defined in index.html.
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
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


import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // We no longer define process.env.API_KEY here to allow it to be dynamic 
      // and injected by the environment at runtime for Pro model access.
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
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

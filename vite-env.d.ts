// Removed missing vite/client reference

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_GOOGLE_API_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Add process.env definition to support strict coding guidelines for API Key usage
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};

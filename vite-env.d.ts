

// Removed missing vite/client reference

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_GOOGLE_API_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_FASTSPRING_STARTER_URL: string
  readonly VITE_FASTSPRING_CREATOR_URL: string
  readonly VITE_FASTSPRING_STUDIO_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Augment NodeJS.ProcessEnv to support strict coding guidelines for API Key usage
// We do not redeclare 'process' here to avoid conflicts with @types/node or other libraries.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}

// FastSpring SBL Type Definitions
interface Window {
    fastspring: {
        builder: {
            push: (session: any) => void;
            // Add other builder methods if needed
        };
    };
    onPopupClosed: (orderReference: any) => void;
}

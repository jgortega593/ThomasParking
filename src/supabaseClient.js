import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true
    },
    global: {
      fetch: (url, options) => {
        // Redirigir solo las llamadas REST a través del proxy
        const isRestAPI = url.includes('/rest/v1/');
        const proxyUrl = isRestAPI 
          ? `/api/cors-proxy/${url.split('/rest/v1/')[1]}`
          : url;

        return fetch(proxyUrl, options);
      }
    }
  }
);

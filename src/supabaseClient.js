import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
      fetch: (url, options = {}) => {
        // Si la URL es la REST API de Supabase, redirige por el proxy
        if (url.startsWith(supabaseUrl + '/rest/v1/')) {
          const path = url.replace(supabaseUrl + '/rest/v1/', '');
          return fetch(`/api/cors-proxy/${path}${options && options.params ? options.params : ''}`, options);
        }
        // Si no, usa fetch normal (por ejemplo, para auth)
        return fetch(url, options);
      }
    }
  }
)

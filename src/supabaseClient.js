// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase usando variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validación de variables en desarrollo
if (import.meta.env.DEV) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(`
      ERROR: Variables de entorno de Supabase no configuradas.
      Asegúrate de tener un archivo .env con:
      VITE_SUPABASE_URL=tu_url_supabase
      VITE_SUPABASE_ANON_KEY=tu_clave_anonima
    `)
  }
}

// Configuración de autenticación con persistencia de sesión
const authOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  storage: localStorage
}

/**
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authOptions,
  // Opciones globales adicionales
  global: {
    headers: {
      'X-Application-Name': import.meta.env.VITE_SITE_NAME || 'Thomas Parking'
    }
  }
})

export default supabase

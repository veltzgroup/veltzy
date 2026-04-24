import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variaveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorias')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'veltzy',
  },
  global: {
    headers: {
      'x-product': 'veltzy',
    },
  },
})

export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
})

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variaveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorias')
}

const STORAGE_KEY = 'veltzy-auth-token'

// Client principal para tabelas do produto (schema veltzy) + auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'veltzy' },
  auth: {
    storageKey: STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Client para tabelas compartilhadas (schema public) - compartilha a mesma session de auth
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
  auth: {
    storageKey: STORAGE_KEY,
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

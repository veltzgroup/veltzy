import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variaveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorias')
}

// Client para tabelas do produto (schema veltzy)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'veltzy' },
})

// Client para tabelas compartilhadas (schema public: companies, profiles, user_roles)
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
})

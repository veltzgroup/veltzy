import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variaveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorias')
}

// Client unico - schema public por default (auth, companies, profiles, user_roles)
// Para tabelas veltzy.*, usar supabase.schema('veltzy').from('tabela')
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper para queries no schema veltzy
export const veltzy = () => supabase.schema('veltzy')

// Alias para manter compatibilidade com imports existentes
export const supabasePublic = supabase

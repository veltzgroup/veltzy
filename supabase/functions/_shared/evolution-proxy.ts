import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY_GLOBAL')!

/**
 * Retorna o Supabase client com service role (para operacoes admin)
 */
export function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

/**
 * Busca a configuracao ativa da Evolution no banco
 */
export async function getEvolutionConfig(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data, error } = await supabaseAdmin
    .from('evolution_config')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('Evolution API nao configurada ou desativada')
  }

  return data as { base_url: string; api_key_secret_name: string; api_version: string }
}

/**
 * Faz uma chamada autenticada a Evolution API
 */
export async function evolutionFetch(
  baseUrl: string,
  path: string,
  options: {
    method?: string
    body?: Record<string, unknown>
  } = {}
): Promise<Response> {
  const { method = 'GET', body } = options

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  return res
}

/**
 * Valida JWT e retorna user. Retorna null se invalido.
 */
export async function authenticateUser(
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string | null
) {
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')

  // Aceitar service_role como autenticacao interna (machine-to-machine)
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (token === serviceKey) {
    return { id: 'service-role', email: 'service@internal', role: 'service_role' }
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) return null
  return user
}

/**
 * Verifica se user e super_admin
 */
export async function isSuperAdmin(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')

  return (data?.length ?? 0) > 0
}

/**
 * Busca o limite de instancias WhatsApp para uma empresa (via subscriptions.metadata)
 */
export async function getInstanceQuota(
  supabaseAdmin: ReturnType<typeof createClient>,
  companyId: string
): Promise<number> {
  // Planos validados contra SubscriptionPlan em database.ts:47 (trial|starter|pro|enterprise)
  const PLAN_DEFAULTS: Record<string, number> = {
    trial: 1,
    starter: 1,
    pro: 3,
    enterprise: 10,
  }

  const { data: subscriptions } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, metadata')
    .eq('company_id', companyId)
    .in('status', ['trial', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (!subscriptions || subscriptions.length === 0) return 1

  const sub = subscriptions[0]
  const metadataLimit = (sub.metadata as Record<string, unknown>)?.max_whatsapp_instances

  if (typeof metadataLimit === 'number') return metadataLimit
  return PLAN_DEFAULTS[sub.plan] ?? 1
}

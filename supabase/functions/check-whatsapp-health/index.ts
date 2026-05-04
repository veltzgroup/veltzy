import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAllConnectedZApiConfigs, updateZApiMetadata, buildZApiUrl } from '../_shared/zapi-config.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app.veltzy.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(url, key, { db: { schema: 'veltzy' } })
    const supabasePublic = createClient(url, key)

    const configs = await getAllConnectedZApiConfigs(supabasePublic)

    if (configs.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, checked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const results: { companyId: string; oldStatus: string; newStatus: string }[] = []

    for (const config of configs) {
      let newStatus: string = 'connected'

      try {
        const res = await fetch(
          `${buildZApiUrl(config)}/status`,
          { headers: { 'Client-Token': config.client_token } },
        )
        const data = await res.json()
        console.log(`[health] company=${config.company_id} z-api response:`, JSON.stringify(data))

        if (data.connected !== true) {
          newStatus = 'disconnected'
        }
      } catch (err) {
        console.error(`[health] company=${config.company_id} fetch error:`, err)
        newStatus = 'error'
      }

      if (newStatus !== 'connected') {
        await updateZApiMetadata(supabasePublic, config.id, { status: newStatus })

        // Notificar admins da empresa
        const { data: admins } = await supabasePublic
          .from('user_roles')
          .select('user_id')
          .eq('company_id', config.company_id)
          .in('role', ['admin', 'super_admin'])

        if (admins && admins.length > 0) {
          const notifications = admins.map((a: { user_id: string }) => ({
            company_id: config.company_id,
            user_id: a.user_id,
            type: 'system',
            title: 'WhatsApp desconectado',
            body: 'A conexao WhatsApp da sua empresa foi interrompida. Entre em contato com o suporte.',
          }))

          await supabase.from('notifications').insert(notifications)
        }

        results.push({
          companyId: config.company_id,
          oldStatus: config.status,
          newStatus,
        })
      }
    }

    return new Response(
      JSON.stringify({ ok: true, checked: configs.length, changed: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[health] error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

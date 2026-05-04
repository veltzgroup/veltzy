import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getZApiConfigByCompany, updateZApiMetadata, buildZApiUrl } from '../_shared/zapi-config.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app.veltzy.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabasePublic = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { companyId, action } = await req.json()

    const config = await getZApiConfigByCompany(supabasePublic, companyId)

    if (!config) {
      return new Response(JSON.stringify({ error: 'No config found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const baseUrl = buildZApiUrl(config)
    const headers = { 'Client-Token': config.client_token }

    if (action === 'status') {
      const res = await fetch(`${baseUrl}/status`, { headers })
      const data = await res.json()

      const status = data.connected ? 'connected' : 'disconnected'
      await updateZApiMetadata(supabasePublic, config.id, {
        status,
        phone_number: data.phoneNumber ?? config.phone_number,
        connected_at: data.connected ? new Date().toISOString() : config.connected_at,
      })

      return new Response(JSON.stringify({ status, phone_number: data.phoneNumber }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'qrcode') {
      const res = await fetch(`${baseUrl}/qr-code`, { headers })
      const data = await res.json()

      await updateZApiMetadata(supabasePublic, config.id, {
        status: 'connecting',
        qr_code: data.value,
      })

      return new Response(JSON.stringify({ qr_code: data.value }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'disconnect') {
      await fetch(`${baseUrl}/disconnect`, { method: 'POST', headers })

      await updateZApiMetadata(supabasePublic, config.id, {
        status: 'disconnected',
        qr_code: null,
      })

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'restart') {
      await fetch(`${baseUrl}/restart`, { method: 'POST', headers })

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

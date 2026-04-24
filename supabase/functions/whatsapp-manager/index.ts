import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { db: { schema: 'veltzy' } }
    )

    const { companyId, action } = await req.json()

    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (!config) {
      return new Response(JSON.stringify({ error: 'No config found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.instance_token}`
    const headers = { 'Client-Token': config.client_token }

    if (action === 'status') {
      const res = await fetch(`${baseUrl}/status`, { headers })
      const data = await res.json()

      const status = data.connected ? 'connected' : 'disconnected'
      await supabase
        .from('whatsapp_configs')
        .update({
          status,
          phone_number: data.phoneNumber ?? config.phone_number,
          connected_at: data.connected ? new Date().toISOString() : config.connected_at,
        })
        .eq('id', config.id)

      return new Response(JSON.stringify({ status, phone_number: data.phoneNumber }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'qrcode') {
      const res = await fetch(`${baseUrl}/qr-code`, { headers })
      const data = await res.json()

      await supabase
        .from('whatsapp_configs')
        .update({ qr_code: data.value, status: 'connecting' })
        .eq('id', config.id)

      return new Response(JSON.stringify({ qr_code: data.value }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'disconnect') {
      await fetch(`${baseUrl}/disconnect`, { method: 'POST', headers })

      await supabase
        .from('whatsapp_configs')
        .update({ status: 'disconnected', qr_code: null })
        .eq('id', config.id)

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

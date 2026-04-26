import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app.veltzy.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === Deno.env.get('INSTAGRAM_VERIFY_TOKEN')) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'veltzy' } })

    for (const entry of payload.entry ?? []) {
      for (const messaging of entry.messaging ?? []) {
        if (!messaging.message?.text) continue

        const igAccountId = entry.id
        const senderId = messaging.sender.id
        const content = messaging.message.text

        const { data: connection } = await supabase
          .from('instagram_connections')
          .select('company_id')
          .eq('instagram_account_id', igAccountId)
          .single()

        if (!connection) continue

        let { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('company_id', connection.company_id)
          .eq('instagram_id', senderId)
          .maybeSingle()

        if (!lead) {
          const { data: stage } = await supabase.from('pipeline_stages').select('id').eq('company_id', connection.company_id).order('position').limit(1).single()
          const { data: source } = await supabase.from('lead_sources').select('id').eq('company_id', connection.company_id).eq('slug', 'instagram').maybeSingle()
          const { data: newLead } = await supabase.from('leads').insert({
            company_id: connection.company_id,
            phone: senderId,
            instagram_id: senderId,
            stage_id: stage?.id,
            source_id: source?.id,
          }).select('id').single()
          lead = newLead
        }

        if (lead) {
          await supabase.from('messages').insert({
            lead_id: lead.id,
            company_id: connection.company_id,
            content,
            sender_type: 'lead',
            message_type: 'text',
            source: 'instagram',
          })
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

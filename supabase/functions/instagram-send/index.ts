import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { leadId, content, companyId } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'veltzy' } })

    const { data: lead } = await supabase.from('leads').select('instagram_id').eq('id', leadId).single()
    if (!lead?.instagram_id) return new Response(JSON.stringify({ error: 'No Instagram ID' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: connection } = await supabase.from('instagram_connections').select('access_token, page_id').eq('company_id', companyId).single()
    if (!connection) return new Response(JSON.stringify({ error: 'No connection' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    await fetch(`https://graph.facebook.com/v18.0/${connection.page_id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: lead.instagram_id },
        message: { text: content },
        access_token: connection.access_token,
      }),
    })

    const { data: message } = await supabase.from('messages').insert({
      lead_id: leadId,
      company_id: companyId,
      content,
      sender_type: 'human',
      message_type: 'text',
      source: 'instagram',
    }).select().single()

    return new Response(JSON.stringify(message), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

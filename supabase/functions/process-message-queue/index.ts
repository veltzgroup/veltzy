import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app.veltzy.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(url, key, { db: { schema: 'veltzy' } })

    const now = new Date().toISOString()

    const { data: items } = await supabase
      .from('message_queue')
      .select('id, company_id, lead_id, content, message_type, file_url')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(10)

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let sent = 0
    let failed = 0

    for (const item of items) {
      try {
        // Busca config WhatsApp da empresa
        const { data: config } = await supabase
          .from('whatsapp_configs')
          .select('instance_id, instance_token, client_token, status')
          .eq('company_id', item.company_id)
          .eq('status', 'connected')
          .maybeSingle()

        if (!config) {
          await supabase
            .from('message_queue')
            .update({ status: 'failed', error_message: 'WhatsApp not connected' })
            .eq('id', item.id)
          failed++
          continue
        }

        // Busca phone do lead
        const { data: lead } = await supabase
          .from('leads')
          .select('phone')
          .eq('id', item.lead_id)
          .single()

        if (!lead?.phone) {
          await supabase
            .from('message_queue')
            .update({ status: 'failed', error_message: 'Lead has no phone' })
            .eq('id', item.id)
          failed++
          continue
        }

        // Envia via Z-API
        const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.instance_token}`
        const msgType = item.message_type ?? 'text'

        const endpoints: Record<string, string> = {
          text: '/send-text',
          image: '/send-image',
          audio: '/send-audio',
          video: '/send-video',
          document: '/send-document',
        }

        const body: Record<string, unknown> = { phone: lead.phone }
        if (msgType === 'text') {
          body.message = item.content
        } else {
          body.caption = item.content
          if (msgType === 'image') body.image = item.file_url
          if (msgType === 'audio') body.audio = item.file_url
          if (msgType === 'video') body.video = item.file_url
          if (msgType === 'document') body.document = item.file_url
        }

        const res = await fetch(`${baseUrl}${endpoints[msgType] ?? '/send-text'}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Client-Token': config.client_token,
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const errBody = await res.text()
          throw new Error(`Z-API ${res.status}: ${errBody}`)
        }

        // Salva a mensagem no historico
        await supabase.from('messages').insert({
          lead_id: item.lead_id,
          company_id: item.company_id,
          content: item.content,
          sender_type: 'ai',
          message_type: msgType,
          file_url: item.file_url ?? null,
          source: 'whatsapp',
        })

        await supabase
          .from('message_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id)

        sent++

        // Delay de 2s entre envios para evitar deteccao de envio em massa
        if (items.indexOf(item) < items.length - 1) {
          await delay(2000)
        }
      } catch (err) {
        await supabase
          .from('message_queue')
          .update({ status: 'failed', error_message: (err as Error).message })
          .eq('id', item.id)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ processed: items.length, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[process-message-queue] error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getWhatsAppConfig } from '../_shared/whatsapp-config.ts'
import { createProvider } from '../_shared/whatsapp-factory.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
    const supabasePublic = createClient(url, key)

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
        const config = await getWhatsAppConfig(supabasePublic, item.company_id, { status: 'connected' })

        if (!config) {
          await supabase
            .from('message_queue')
            .update({ status: 'failed', error_message: 'WhatsApp not connected' })
            .eq('id', item.id)
          failed++
          continue
        }

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

        const provider = createProvider(config.provider)
        const msgType = (item.message_type ?? 'text') as 'text' | 'image' | 'audio' | 'video' | 'document'

        await provider.sendMessage(config, {
          phone: lead.phone,
          content: item.content,
          type: msgType,
          mediaUrl: item.file_url ?? undefined,
        })

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

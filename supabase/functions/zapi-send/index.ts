import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app.veltzy.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendPayload {
  leadId: string
  content: string
  messageType?: string
  fileUrl?: string
  fileName?: string
  mimeType?: string
  repliedMessageId?: string
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

    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAuth = createClient(url, key)
    const supabase = createClient(url, key, { db: { schema: 'veltzy' } })
    const supabasePublic = createClient(url, key, { db: { schema: 'public' } })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payload: SendPayload = await req.json()

    const { data: profile } = await supabasePublic
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'No company' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('phone')
      .eq('id', payload.leadId)
      .eq('company_id', profile.company_id)
      .single()

    if (!lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('company_id', profile.company_id)
      .single()

    if (config?.status === 'connected') {
      const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.instance_token}`
      const msgType = payload.messageType ?? 'text'

      const endpoints: Record<string, string> = {
        text: '/send-text',
        image: '/send-image',
        audio: '/send-audio',
        video: '/send-video',
        document: '/send-document',
      }

      const body: Record<string, unknown> = { phone: lead.phone }
      if (msgType === 'text') {
        body.message = payload.content
      } else {
        body.caption = payload.content
        if (msgType === 'image') body.image = payload.fileUrl
        if (msgType === 'audio') body.audio = payload.fileUrl
        if (msgType === 'video') body.video = payload.fileUrl
        if (msgType === 'document') {
          body.document = payload.fileUrl
          body.fileName = payload.fileName
        }
      }

      await fetch(`${baseUrl}${endpoints[msgType] ?? '/send-text'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': config.client_token,
        },
        body: JSON.stringify(body),
      })
    }

    const { data: message } = await supabase
      .from('messages')
      .insert({
        lead_id: payload.leadId,
        company_id: profile.company_id,
        content: payload.content,
        sender_type: 'human',
        message_type: payload.messageType ?? 'text',
        file_url: payload.fileUrl ?? null,
        file_name: payload.fileName ?? null,
        file_mime_type: payload.mimeType ?? null,
        source: config?.status === 'connected' ? 'whatsapp' : 'manual',
        replied_message_id: payload.repliedMessageId ?? null,
      })
      .select()
      .single()

    await supabase
      .from('leads')
      .update({ conversation_status: 'replied' })
      .eq('id', payload.leadId)

    return new Response(JSON.stringify(message), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

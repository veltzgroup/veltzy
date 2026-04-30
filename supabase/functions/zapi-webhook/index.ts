import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app.veltzy.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZAPIPayload {
  phone: string
  isGroup: boolean
  fromMe: boolean
  momment: number
  messageId: string
  instanceId: string
  chatName?: string
  senderName?: string
  type?: string
  text?: { message: string }
  image?: { caption?: string; imageUrl?: string; mimeType?: string }
  audio?: { audioUrl?: string; mimeType?: string }
  video?: { caption?: string; videoUrl?: string; mimeType?: string }
  document?: { caption?: string; documentUrl?: string; fileName?: string; mimeType?: string }
  referral?: {
    headline?: string; body?: string
    sourceUrl?: string; thumbnailUrl?: string
    mediaUrl?: string; ctwaClid?: string
    sourceId?: string; sourceType?: string
  }
}

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length === 13) {
    return digits.slice(2)
  }
  return digits
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Headers recebidos:', Object.fromEntries(req.headers.entries()))
    const payload: ZAPIPayload = await req.json()

    if (payload.fromMe || payload.isGroup) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (payload.type === 'StatusCallback' || payload.type === 'ReadReceiptCallback' || payload.type === 'MessageUpdateCallback') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(url, key, { db: { schema: 'veltzy' } })
    const supabasePublic = createClient(url, key, { db: { schema: 'public' } })

    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('company_id, instance_id, instance_token, client_token')
      .eq('instance_id', payload.instanceId)
      .single()

    if (!config) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const companyId = config.company_id
    const phone = normalizePhone(payload.phone)

    let content = ''
    let messageType = 'text'
    let fileUrl: string | null = null
    let fileName: string | null = null
    let fileMimeType: string | null = null

    if (payload.text?.message) {
      content = payload.text.message
    } else if (payload.image) {
      content = payload.image.caption ?? ''
      messageType = 'image'
      fileUrl = payload.image.imageUrl ?? null
      fileMimeType = payload.image.mimeType ?? null
    } else if (payload.audio) {
      messageType = 'audio'
      fileUrl = payload.audio.audioUrl ?? null
      fileMimeType = payload.audio.mimeType ?? null
    } else if (payload.video) {
      content = payload.video.caption ?? ''
      messageType = 'video'
      fileUrl = payload.video.videoUrl ?? null
      fileMimeType = payload.video.mimeType ?? null
    } else if (payload.document) {
      content = payload.document.caption ?? ''
      messageType = 'document'
      fileUrl = payload.document.documentUrl ?? null
      fileName = payload.document.fileName ?? null
      fileMimeType = payload.document.mimeType ?? null
    }

    let { data: lead } = await supabase
      .from('leads')
      .select('id, assigned_to, avatar_url')
      .eq('company_id', companyId)
      .eq('phone', phone)
      .maybeSingle()

    if (!lead) {
      const { data: defaultStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('company_id', companyId)
        .order('position')
        .limit(1)
        .single()

      const { data: whatsappSource } = await supabase
        .from('lead_sources')
        .select('id')
        .eq('company_id', companyId)
        .eq('slug', 'whatsapp')
        .single()

      let assignedTo: string | null = null
      const { data: sellers } = await supabasePublic
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_available', true)

      if (sellers && sellers.length > 0) {
        const idx = Math.floor(Math.random() * sellers.length)
        assignedTo = sellers[idx].id
      }

      const adContext = payload.referral ? {
        ad_title: payload.referral.headline,
        ad_body: payload.referral.body,
        source_url: payload.referral.sourceUrl,
        media_url: payload.referral.mediaUrl,
        ctwa_clid: payload.referral.ctwaClid,
        source: 'meta_ads',
      } : null

      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          company_id: companyId,
          phone,
          name: payload.senderName ?? payload.chatName ?? null,
          stage_id: defaultStage?.id,
          source_id: whatsappSource?.id,
          assigned_to: assignedTo,
          is_queued: !assignedTo,
          ad_context: adContext,
        })
        .select('id, assigned_to, avatar_url')
        .single()

      lead = newLead
    }

    if (!lead) {
      return new Response(JSON.stringify({ error: 'Failed to create lead' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Busca foto de perfil do WhatsApp se o lead nao tem avatar
    if (!lead.avatar_url) {
      try {
        const photoRes = await fetch(
          `https://api.z-api.io/instances/${config.instance_id}/token/${config.instance_token}/profile-picture?phone=${phone}`,
          { headers: { 'Client-Token': config.client_token } }
        )
        const photoData = await photoRes.json()
        const photoUrl = photoData?.value

        if (photoUrl) {
          const imgRes = await fetch(photoUrl)
          const imgBlob = await imgRes.blob()
          const path = `avatars/${lead.id}.jpg`

          await supabase.storage
            .from('chat-attachments')
            .upload(path, imgBlob, { contentType: 'image/jpeg', upsert: true })

          const { data: urlData } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(path)

          await supabase
            .from('leads')
            .update({ avatar_url: urlData.publicUrl })
            .eq('id', lead.id)
        }
      } catch {
        // falha silenciosa — nao bloqueia o webhook
      }
    }

    const isNewLead = !lead.assigned_to && lead.id

    const { data: savedMessage } = await supabase.from('messages').insert({
      lead_id: lead.id,
      company_id: companyId,
      content,
      sender_type: 'lead',
      message_type: messageType,
      file_url: fileUrl,
      file_name: fileName,
      file_mime_type: fileMimeType,
      source: 'whatsapp',
      external_id: payload.messageId,
    }).select('id').single()

    // Transcricao assincrona de audio via Whisper (nao bloqueia o webhook)
    if ((messageType === 'audio' || payload.type === 'ptt') && fileUrl && savedMessage?.id) {
      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      if (openaiKey) {
        const transcribeAudio = async (audioUrl: string, messageId: string) => {
          try {
            const audioResponse = await fetch(audioUrl)
            const audioBuffer = await audioResponse.arrayBuffer()

            const formData = new FormData()
            formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'audio.ogg')
            formData.append('model', 'whisper-1')
            formData.append('language', 'pt')

            const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${openaiKey}` },
              body: formData,
            })

            const result = await whisperResponse.json()
            const transcription = result.text ?? null

            if (transcription) {
              await supabase.from('messages')
                .update({ content: transcription })
                .eq('id', messageId)
            }
          } catch (err) {
            console.error('Transcription failed:', err)
          }
        }
        // Nao bloqueia — fire and forget
        transcribeAudio(fileUrl, savedMessage.id)
      }
    }

    const supabaseUrl = url
    const serviceKey = key
    const fnHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` }

    // Dispara IA SDR
    try {
      const { data: leadFull } = await supabase.from('leads').select('is_ai_active').eq('id', lead.id).single()
      if (leadFull?.is_ai_active) {
        await fetch(`${supabaseUrl}/functions/v1/sdr-ai`, {
          method: 'POST',
          headers: fnHeaders,
          body: JSON.stringify({ leadId: lead.id, companyId, messageContent: content, conversationHistory: [] }),
        })
      }
    } catch { /* best-effort */ }

    // Dispara automacoes
    try {
      await fetch(`${supabaseUrl}/functions/v1/run-automations`, {
        method: 'POST',
        headers: fnHeaders,
        body: JSON.stringify({
          trigger: isNewLead ? 'lead_created' : 'message_received',
          leadId: lead.id,
          companyId,
          triggerData: { messageContent: content, source: 'whatsapp' },
        }),
      })
    } catch { /* best-effort */ }

    // Auto-reply fora do horario
    if (isNewLead) {
      try {
        const { data: autoReplySetting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('company_id', companyId)
          .eq('key', 'auto_reply_config')
          .maybeSingle()

        const arConfig = autoReplySetting?.value as { enabled?: boolean; message?: string; schedule?: { start: string; end: string; days: number[]; timezone: string } } | null

        if (arConfig?.enabled && arConfig.message && arConfig.schedule) {
          const now = new Date(new Date().toLocaleString('en', { timeZone: arConfig.schedule.timezone }))
          const day = now.getDay()
          const time = now.getHours() * 60 + now.getMinutes()
          const [startH, startM] = arConfig.schedule.start.split(':').map(Number)
          const [endH, endM] = arConfig.schedule.end.split(':').map(Number)
          const isOutside = !arConfig.schedule.days.includes(day) || time < startH * 60 + startM || time >= endH * 60 + endM

          if (isOutside) {
            await supabase.from('messages').insert({
              lead_id: lead.id,
              company_id: companyId,
              content: arConfig.message,
              sender_type: 'ai',
              message_type: 'text',
              source: 'whatsapp',
            })
          }
        }
      } catch { /* best-effort */ }
    }

    return new Response(JSON.stringify({ ok: true, leadId: lead.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

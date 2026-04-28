import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app.veltzy.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(url, key, { db: { schema: 'veltzy' } })

    // Buscar lembretes pendentes com scheduled_at <= agora + 1 minuto
    const threshold = new Date(Date.now() + 60 * 1000).toISOString()
    const { data: reminders, error: fetchError } = await supabase
      .from('task_reminders')
      .select('*, tasks:task_id(id, title, meeting_link, meeting_lead_email, company_id)')
      .eq('status', 'pending')
      .lte('scheduled_at', threshold)
      .limit(100)

    if (fetchError) throw fetchError
    if (!reminders?.length) {
      return new Response(JSON.stringify({ processed: 0, sent: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    let failed = 0

    for (const reminder of reminders) {
      try {
        const task = reminder.tasks as { id: string; title: string; meeting_link: string | null; meeting_lead_email: string | null; company_id: string } | null
        if (!task) continue

        const companyId = task.company_id
        const channel = reminder.channel as string

        // WhatsApp
        if (channel === 'whatsapp' || channel === 'both') {
          if (reminder.lead_id) {
            const { data: lead } = await supabase
              .from('leads')
              .select('phone')
              .eq('id', reminder.lead_id)
              .single()

            if (lead?.phone) {
              const { data: config } = await supabase
                .from('whatsapp_configs')
                .select('instance_id, instance_token, client_token, status')
                .eq('company_id', companyId)
                .eq('status', 'connected')
                .maybeSingle()

              if (config) {
                const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.instance_token}`
                await fetch(`${baseUrl}/send-text`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Client-Token': config.client_token },
                  body: JSON.stringify({ phone: lead.phone, message: reminder.content }),
                })
              }
            }
          }
        }

        // Email via Brevo
        if (channel === 'email' || channel === 'both') {
          const email = task.meeting_lead_email
          const brevoKey = Deno.env.get('BREVO_API_KEY')

          if (email && brevoKey) {
            await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'api-key': brevoKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sender: { name: 'Veltzy', email: 'noreply@veltzy.com' },
                to: [{ email }],
                subject: `Lembrete: ${task.title}`,
                textContent: reminder.content,
              }),
            })
          }
        }

        // Marcar como enviado
        await supabase
          .from('task_reminders')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', reminder.id)

        sent++
      } catch (err) {
        // Marcar como falhou
        await supabase
          .from('task_reminders')
          .update({ status: 'failed', error_message: (err as Error).message })
          .eq('id', reminder.id)

        failed++
      }
    }

    return new Response(
      JSON.stringify({ processed: reminders.length, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

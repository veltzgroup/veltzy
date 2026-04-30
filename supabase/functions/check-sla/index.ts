import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const SLA_MINUTES = 30
    const now = new Date()
    const threshold = new Date(now.getTime() - SLA_MINUTES * 60 * 1000).toISOString()

    // Leads aguardando resposta ha mais de 30 min (nao resolvidos, nao breached ainda)
    const { data: pendingLeads } = await supabase
      .from('leads')
      .select('id, name, phone, company_id, assigned_to, last_customer_message_at')
      .eq('sla_breached', false)
      .neq('conversation_status', 'resolved')
      .not('last_customer_message_at', 'is', null)
      .lt('last_customer_message_at', threshold)

    const breached: string[] = []

    if (pendingLeads && pendingLeads.length > 0) {
      for (const lead of pendingLeads) {
        // Verifica se ja tem resposta humana apos a ultima mensagem do cliente
        const { data: lastHumanMsg } = await supabase
          .from('messages')
          .select('created_at')
          .eq('lead_id', lead.id)
          .eq('sender_type', 'human')
          .gt('created_at', lead.last_customer_message_at)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastHumanMsg) {
          // Ja respondeu, nao precisa breach
          continue
        }

        // Marca como breached
        await supabase
          .from('leads')
          .update({ sla_breached: true })
          .eq('id', lead.id)

        // Notifica o responsavel
        if (lead.assigned_to) {
          const minutesWaiting = Math.round(
            (now.getTime() - new Date(lead.last_customer_message_at).getTime()) / 60000,
          )
          const leadName = lead.name || lead.phone

          await supabase.from('notifications').insert({
            company_id: lead.company_id,
            user_id: lead.assigned_to,
            type: 'system',
            title: 'Lead aguardando resposta',
            body: `${leadName} esta aguardando resposta ha ${minutesWaiting} minutos`,
            action_type: 'open_lead',
            action_data: { leadId: lead.id },
          })
        }

        breached.push(lead.id)
      }
    }

    // Limpa sla_breached de leads que ja receberam resposta
    const { data: breachedLeads } = await supabase
      .from('leads')
      .select('id, last_customer_message_at')
      .eq('sla_breached', true)
      .neq('conversation_status', 'resolved')

    const cleared: string[] = []

    if (breachedLeads && breachedLeads.length > 0) {
      for (const lead of breachedLeads) {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('sender_type')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastMsg?.sender_type === 'human') {
          await supabase
            .from('leads')
            .update({ sla_breached: false })
            .eq('id', lead.id)
          cleared.push(lead.id)
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, breached, cleared }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[check-sla] error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app.veltzy.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationInput {
  company_id: string
  user_id: string // auth.users.id
  type: 'copilot'
  title: string
  body: string
  action_data: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(url, key, { db: { schema: 'veltzy' } })
    const supabasePublic = createClient(url, key, { db: { schema: 'public' } })

    const body = await req.json()
    const runAll = body.run_all_companies === true

    let companyIds: string[] = []
    if (runAll) {
      const { data } = await supabasePublic.from('companies').select('id').eq('is_active', true)
      companyIds = (data ?? []).map((c: { id: string }) => c.id)
    } else if (body.company_id) {
      companyIds = [body.company_id]
    }

    if (!companyIds.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    let totalCreated = 0

    for (const companyId of companyIds) {
      const notifications: NotificationInput[] = []

      // Helper: verificar se ja existe notificacao copilot recente para evitar duplicatas
      const hasDuplicate = async (leadId: string | null, taskId: string | null): Promise<boolean> => {
        let query = supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('type', 'copilot')
          .gte('created_at', twentyFourHoursAgo)

        if (leadId) {
          query = query.contains('action_data', { leadId })
        }
        if (taskId) {
          query = query.contains('action_data', { taskId })
        }

        const { count } = await query
        return (count ?? 0) > 0
      }

      // 1. Tarefas vencidas (due_date < now, status pending/in_progress)
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('id, title, assigned_to, lead_id, leads:lead_id(name, phone)')
        .eq('company_id', companyId)
        .in('status', ['pending', 'in_progress'])
        .lt('due_date', now.toISOString())
        .limit(50)

      for (const task of overdueTasks ?? []) {
        if (await hasDuplicate(null, task.id)) continue
        if (!task.assigned_to) continue

        // Buscar user_id do profile
        const { data: profile } = await supabasePublic
          .from('profiles')
          .select('user_id')
          .eq('id', task.assigned_to)
          .single()
        if (!profile) continue

        const lead = task.leads as { name: string | null; phone: string } | null
        const leadName = lead?.name || lead?.phone || ''
        notifications.push({
          company_id: companyId,
          user_id: profile.user_id,
          type: 'copilot',
          title: 'Tarefa vencida',
          body: `"${task.title}"${leadName ? ` para ${leadName}` : ''} nao foi concluida.`,
          action_data: { taskId: task.id, leadId: task.lead_id },
        })
      }

      // 2. Leads quentes sem contato ha 3+ dias
      const { data: hotLeads } = await supabase
        .from('leads')
        .select('id, name, phone, assigned_to, stage_id, pipeline_stages:stage_id(name)')
        .eq('company_id', companyId)
        .in('temperature', ['warm', 'hot', 'fire'])
        .not('assigned_to', 'is', null)
        .limit(100)

      for (const lead of hotLeads ?? []) {
        // Verificar ultima mensagem
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('created_at')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastMsg && lastMsg.created_at > threeDaysAgo) continue
        if (await hasDuplicate(lead.id, null)) continue

        const { data: profile } = await supabasePublic
          .from('profiles')
          .select('user_id')
          .eq('id', lead.assigned_to)
          .single()
        if (!profile) continue

        const stage = lead.pipeline_stages as { name: string } | null
        const leadName = lead.name || lead.phone
        const daysAgo = lastMsg
          ? Math.floor((now.getTime() - new Date(lastMsg.created_at).getTime()) / (24 * 60 * 60 * 1000))
          : 'muitos'
        notifications.push({
          company_id: companyId,
          user_id: profile.user_id,
          type: 'copilot',
          title: 'Lead quente sem contato',
          body: `${leadName} esta em ${stage?.name ?? 'pipeline'} ha ${daysAgo} dias sem interacao.`,
          action_data: { leadId: lead.id },
        })
      }

      // 3. Meetings proximas 24h sem lembretes enviados
      const { data: upcomingMeetings } = await supabase
        .from('tasks')
        .select('id, title, assigned_to, lead_id, meeting_date, leads:lead_id(name, phone)')
        .eq('company_id', companyId)
        .eq('type', 'meeting')
        .in('status', ['pending', 'in_progress'])
        .gte('meeting_date', now.toISOString())
        .lte('meeting_date', twentyFourHoursFromNow)
        .limit(50)

      for (const task of upcomingMeetings ?? []) {
        // Verificar se tem lembretes enviados
        const { count: sentCount } = await supabase
          .from('task_reminders')
          .select('id', { count: 'exact', head: true })
          .eq('task_id', task.id)
          .eq('status', 'sent')
        if ((sentCount ?? 0) > 0) continue
        if (await hasDuplicate(null, task.id)) continue
        if (!task.assigned_to) continue

        const { data: profile } = await supabasePublic
          .from('profiles')
          .select('user_id')
          .eq('id', task.assigned_to)
          .single()
        if (!profile) continue

        const lead = task.leads as { name: string | null; phone: string } | null
        const meetingDate = new Date(task.meeting_date!)
        const hoursUntil = Math.round((meetingDate.getTime() - now.getTime()) / (60 * 60 * 1000))
        notifications.push({
          company_id: companyId,
          user_id: profile.user_id,
          type: 'copilot',
          title: 'Reuniao em breve',
          body: `${lead?.name || lead?.phone || 'Reuniao'} em ${hoursUntil}h. Verifique se esta preparado.`,
          action_data: { taskId: task.id, leadId: task.lead_id },
        })
      }

      // 4. Leads com alto score sem tasks pendentes
      const { data: highScoreLeads } = await supabase
        .from('leads')
        .select('id, name, phone, ai_score, assigned_to')
        .eq('company_id', companyId)
        .gte('ai_score', 70)
        .not('assigned_to', 'is', null)
        .limit(100)

      for (const lead of highScoreLeads ?? []) {
        const { count: taskCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('lead_id', lead.id)
          .in('status', ['pending', 'in_progress'])
        if ((taskCount ?? 0) > 0) continue
        if (await hasDuplicate(lead.id, null)) continue

        const { data: profile } = await supabasePublic
          .from('profiles')
          .select('user_id')
          .eq('id', lead.assigned_to)
          .single()
        if (!profile) continue

        notifications.push({
          company_id: companyId,
          user_id: profile.user_id,
          type: 'copilot',
          title: 'Lead de alto score sem acao',
          body: `${lead.name || lead.phone} tem score ${lead.ai_score} e nenhuma tarefa planejada.`,
          action_data: { leadId: lead.id },
        })
      }

      // Inserir notificacoes em batch
      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications)
        totalCreated += notifications.length
      }
    }

    return new Response(
      JSON.stringify({ ok: true, companies: companyIds.length, notifications_created: totalCreated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

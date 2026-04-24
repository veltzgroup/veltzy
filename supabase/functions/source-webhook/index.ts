import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const reqUrl = new URL(req.url)
    const companySlug = reqUrl.searchParams.get('company')
    const sourceSlug = url.searchParams.get('source') ?? 'manual'

    if (!companySlug) {
      return new Response(JSON.stringify({ error: 'Missing company param' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(url, key, { db: { schema: 'veltzy' } })
    const supabasePublic = createClient(url, key, { db: { schema: 'public' } })

    const { data: company } = await supabasePublic.from('companies').select('id').eq('slug', companySlug).single()
    if (!company) return new Response(JSON.stringify({ error: 'Company not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const payload = await req.json()
    if (!payload.phone) return new Response(JSON.stringify({ error: 'Phone required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: source } = await supabase.from('lead_sources').select('id').eq('company_id', company.id).eq('slug', sourceSlug).maybeSingle()
    const { data: stage } = await supabase.from('pipeline_stages').select('id').eq('company_id', company.id).order('position').limit(1).single()

    const phone = payload.phone.replace(/\D/g, '')

    const { data: existingLead } = await supabase.from('leads').select('id').eq('company_id', company.id).eq('phone', phone).maybeSingle()

    if (existingLead) {
      if (payload.name || payload.email || payload.tags) {
        const updates: Record<string, unknown> = {}
        if (payload.name) updates.name = payload.name
        if (payload.email) updates.email = payload.email
        if (payload.tags) updates.tags = payload.tags
        if (payload.observations) updates.observations = payload.observations
        await supabase.from('leads').update(updates).eq('id', existingLead.id)
      }
      return new Response(JSON.stringify({ success: true, leadId: existingLead.id, updated: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: sellers } = await supabasePublic.from('profiles').select('id').eq('company_id', company.id).eq('is_available', true)
    const assignedTo = sellers && sellers.length > 0 ? sellers[Math.floor(Math.random() * sellers.length)].id : null

    const { data: lead } = await supabase.from('leads').insert({
      company_id: company.id,
      phone,
      name: payload.name ?? null,
      email: payload.email ?? null,
      stage_id: stage?.id,
      source_id: source?.id ?? null,
      assigned_to: assignedTo,
      is_queued: !assignedTo,
      tags: payload.tags ?? [],
      observations: payload.observations ?? null,
    }).select('id').single()

    return new Response(JSON.stringify({ success: true, leadId: lead?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

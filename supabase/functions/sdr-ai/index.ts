import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app.veltzy.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_PROMPT = `Voce e um SDR (Sales Development Representative) especialista em qualificacao de leads.
Analise a conversa e retorne um JSON com:
- score: numero de 0-100 indicando potencial de compra
- temperature: cold/warm/hot/fire
- response: mensagem de resposta ao lead (em portugues, natural e amigavel)
- should_respond: true se deve responder agora, false se deve aguardar
- reasoning: breve explicacao da pontuacao`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { leadId, companyId, messageContent, conversationHistory } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { db: { schema: 'veltzy' } }
    )

    const { data: sdrSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('company_id', companyId)
      .eq('key', 'sdr_config')
      .single()

    const sdrConfig = sdrSetting?.value as { enabled: boolean; model: string; prompt: string; api_key?: string } | null

    if (!sdrConfig?.enabled) {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('name, phone, email, temperature, ai_score, tags, deal_value')
      .eq('id', leadId)
      .single()

    const systemPrompt = (sdrConfig.prompt || DEFAULT_PROMPT) +
      `\n\nDados do lead: ${JSON.stringify(lead)}`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory ?? []),
      { role: 'user', content: messageContent },
    ]

    const apiKey = sdrConfig.api_key || Deno.env.get('OPENAI_API_KEY')
    const model = sdrConfig.model || 'gpt-4o-mini'

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })

    const aiData = await aiResponse.json()
    const content = aiData.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty AI response')

    const result = JSON.parse(content)

    await supabase
      .from('leads')
      .update({
        ai_score: Math.min(100, Math.max(0, result.score ?? 0)),
        temperature: result.temperature ?? 'cold',
      })
      .eq('id', leadId)

    if (result.should_respond && result.response) {
      await supabase.from('messages').insert({
        lead_id: leadId,
        company_id: companyId,
        content: result.response,
        sender_type: 'ai',
        message_type: 'text',
        source: 'whatsapp',
      })

      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/zapi-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            leadId,
            content: result.response,
            messageType: 'text',
          }),
        })
      } catch { /* Z-API send is best-effort */ }
    }

    await supabase.from('automation_logs').insert({
      company_id: companyId,
      lead_id: leadId,
      status: 'success',
      trigger_data: { type: 'sdr_qualification', model },
      new_value: { score: result.score, temperature: result.temperature, reasoning: result.reasoning },
    })

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

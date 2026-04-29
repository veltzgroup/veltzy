import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TIMEOUT_MS = 30_000
const PRODUCT = 'veltzy'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app.veltzy.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Precos por modelo — verificados abril 2026
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'gpt-4.1-nano': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
  'gpt-4.1-mini': { input: 0.40 / 1_000_000, output: 1.60 / 1_000_000 },
  'gpt-4.1':      { input: 2.00 / 1_000_000, output: 8.00 / 1_000_000 },
  'claude-sonnet-4-6':         { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  'claude-haiku-4-5-20251001': { input: 1.00 / 1_000_000, output: 5.00 / 1_000_000 },
  'gemini-2.5-flash':  { input: 0.30 / 1_000_000, output: 2.50 / 1_000_000 },
  'gemini-flash-lite': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
}

const SDR_SYSTEM_PROMPT = `Voce e um SDR (Sales Development Representative) automatizado.
Analise a mensagem recebida e o historico da conversa para qualificar o lead.

Retorne APENAS JSON valido, sem texto adicional:
{
  "score": number,
  "temperature": "cold" | "warm" | "hot" | "fire",
  "reply": string | null,
  "reasoning": string
}`

interface CallAIResult {
  text: string
  tokensInput: number
  tokensOutput: number
}

async function callProvider(
  provider: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature = 0.3,
  jsonMode = true,
): Promise<CallAIResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          ...(jsonMode && { response_format: { type: 'json_object' } }),
        }),
        signal: controller.signal,
      })
      const data = await res.json()
      return {
        text: data.choices?.[0]?.message?.content ?? '',
        tokensInput: data.usage?.prompt_tokens ?? 0,
        tokensOutput: data.usage?.completion_tokens ?? 0,
      }
    }

    if (provider === 'anthropic') {
      const systemMsg = messages.find((m) => m.role === 'system')?.content ?? ''
      const userMsgs = messages.filter((m) => m.role !== 'system')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: 1024, system: systemMsg, messages: userMsgs }),
        signal: controller.signal,
      })
      const data = await res.json()
      return {
        text: data.content?.[0]?.text ?? '',
        tokensInput: data.usage?.input_tokens ?? 0,
        tokensOutput: data.usage?.output_tokens ?? 0,
      }
    }

    throw new Error(`Provider nao suportado: ${provider}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

async function logUsage(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  feature: string,
  provider: string,
  model: string,
  tokensInput: number,
  tokensOutput: number,
  metadata: Record<string, unknown>,
) {
  const prices = MODEL_PRICES[model] ?? { input: 0, output: 0 }
  const custoUsd = tokensInput * prices.input + tokensOutput * prices.output

  await supabase.from('ai_usage').insert({
    company_id: companyId,
    product: PRODUCT,
    provider,
    model,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    tokens_cached: 0,
    custo_estimado_usd: custoUsd,
    feature,
    metadata,
  })

  await supabase.rpc('increment_ai_spend', {
    p_company_id: companyId,
    p_custo: custoUsd,
  })

  return custoUsd
}

async function getModelConfig(
  supabase: ReturnType<typeof createClient>,
  feature: string,
): Promise<{ provider: string; model: string }> {
  const { data } = await supabase
    .from('ai_model_config')
    .select('provider, model')
    .eq('product', PRODUCT)
    .eq('feature', feature)
    .eq('is_active', true)
    .single()
  if (!data) throw new Error(`Model config not found: ${PRODUCT}/${feature}`)
  return data
}

async function checkTenantLimits(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
): Promise<boolean> {
  const { data: aiConfig } = await supabase
    .from('tenant_ai_config')
    .select('monthly_limit_usd, current_month_spend_usd, is_ai_enabled')
    .eq('company_id', companyId)
    .maybeSingle()

  if (aiConfig && !aiConfig.is_ai_enabled) return false
  if (aiConfig && aiConfig.current_month_spend_usd >= aiConfig.monthly_limit_usd) return false
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, key)
  const supabaseVeltzy = createClient(url, key, { db: { schema: 'veltzy' } })

  try {
    const body = await req.json()

    // =============================================
    // MODE: meeting-reminders (chamado pelo frontend)
    // =============================================
    if (body.mode === 'meeting-reminders') {
      const { leadName, meetingDate, meetingLink, companyId: cid } = body
      const companyId = cid as string | undefined

      // Consultar modelo para meeting-reminders (usa sdr-reply)
      let provider = 'openai'
      let model = 'gpt-4.1-mini'
      try {
        const cfg = await getModelConfig(supabase, 'sdr-reply')
        provider = cfg.provider
        model = cfg.model
      } catch { /* fallback */ }

      const prompt = `Voce e um assistente de vendas. Gere 3 mensagens de lembrete para uma reuniao comercial.
Lead: ${leadName || 'o cliente'}
Data/hora: ${meetingDate}
Link: ${meetingLink || 'nao informado'}
Tom: profissional mas amigavel, natural, sem ser robotico.

Retorne JSON com exatamente este formato:
{
  "reminder_48h": "mensagem completa para 48h antes",
  "reminder_2h": "mensagem completa para 2h antes",
  "reminder_15min": "mensagem completa para 15min antes"
}
Retorne apenas o JSON, sem texto adicional.`

      try {
        const result = await callProvider(
          provider, model,
          [{ role: 'user', content: prompt }],
          0.7, true,
        )

        // Log de uso se company_id disponivel
        if (companyId) {
          await logUsage(supabase, companyId, 'meeting-reminders', provider, model,
            result.tokensInput, result.tokensOutput, {})
        }

        return new Response(result.text, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      } catch {
        // Fallback generico sem IA
        return new Response(JSON.stringify({
          reminder_48h: `Ola ${leadName || 'cliente'}! Lembrete: temos uma reuniao agendada para ${meetingDate}. Nos vemos la!`,
          reminder_2h: `Ola ${leadName || 'cliente'}! Nossa reuniao comeca em 2 horas. ${meetingLink ? `Link: ${meetingLink}` : 'Ate logo!'}`,
          reminder_15min: `${leadName || 'Cliente'}, nossa reuniao comeca em 15 minutos! ${meetingLink || ''}`,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // =============================================
    // MODE: SDR scoring + auto-reply (chamado pelo zapi-webhook)
    // =============================================
    const { leadId, companyId, messageContent, conversationHistory } = body

    // 1. Checar feature flag
    const { data: company } = await supabase
      .from('companies')
      .select('features')
      .eq('id', companyId)
      .single()

    if (!(company?.features as Record<string, unknown>)?.ai_sdr_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'ai_sdr_not_enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Checar limites do tenant
    const withinLimits = await checkTenantLimits(supabase, companyId)
    if (!withinLimits) {
      return new Response(JSON.stringify({ skipped: true, reason: 'limit_reached' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Consultar modelo para scoring
    const scoringConfig = await getModelConfig(supabase, 'sdr-scoring')

    // 4. Buscar dados do lead e prompt customizado
    const { data: lead } = await supabaseVeltzy
      .from('leads')
      .select('name, phone, email, temperature, ai_score, tags, deal_value')
      .eq('id', leadId)
      .single()

    const { data: sdrSetting } = await supabaseVeltzy
      .from('system_settings')
      .select('value')
      .eq('company_id', companyId)
      .eq('key', 'sdr_config')
      .maybeSingle()

    const sdrConfig = sdrSetting?.value as { enabled?: boolean; prompt?: string } | null
    if (sdrConfig?.enabled === false) {
      return new Response(JSON.stringify({ skipped: true, reason: 'sdr_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const customPrompt = sdrConfig?.prompt || SDR_SYSTEM_PROMPT
    const systemPrompt = customPrompt + `\n\nDados do lead: ${JSON.stringify(lead)}`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory ?? []),
      { role: 'user', content: messageContent },
    ]

    // 5. Chamar IA para scoring
    const scoringResult = await callProvider(
      scoringConfig.provider, scoringConfig.model, messages, 0.3, true,
    )

    // 6. Log de scoring
    await logUsage(supabase, companyId, 'sdr-scoring', scoringConfig.provider, scoringConfig.model,
      scoringResult.tokensInput, scoringResult.tokensOutput, { lead_id: leadId })

    const parsed = JSON.parse(scoringResult.text)

    // 7. Atualizar lead
    await supabaseVeltzy
      .from('leads')
      .update({
        ai_score: Math.min(100, Math.max(0, parsed.score ?? 0)),
        temperature: parsed.temperature ?? 'cold',
      })
      .eq('id', leadId)

    // 8. Auto-reply se habilitado e IA sugeriu
    if (parsed.reply) {
      // Consultar modelo para reply (pode ser diferente do scoring)
      const replyConfig = await getModelConfig(supabase, 'sdr-reply')

      // Se o modelo de reply for diferente do scoring, refazer a chamada
      let replyText = parsed.reply
      if (replyConfig.model !== scoringConfig.model || replyConfig.provider !== scoringConfig.provider) {
        const replyResult = await callProvider(
          replyConfig.provider, replyConfig.model,
          [
            { role: 'system', content: `Voce e um SDR automatizado. Responda ao lead de forma natural e amigavel em portugues. Nao mencione que voce e uma IA.\n\nDados do lead: ${JSON.stringify(lead)}` },
            ...(conversationHistory ?? []),
            { role: 'user', content: messageContent },
          ],
          0.7, false,
        )
        replyText = replyResult.text

        await logUsage(supabase, companyId, 'sdr-reply', replyConfig.provider, replyConfig.model,
          replyResult.tokensInput, replyResult.tokensOutput, { lead_id: leadId })
      }

      // Salvar mensagem IA
      await supabaseVeltzy.from('messages').insert({
        lead_id: leadId,
        company_id: companyId,
        content: replyText,
        sender_type: 'ai',
        message_type: 'text',
        source: 'whatsapp',
      })

      // Enviar via Z-API (best-effort)
      try {
        await fetch(`${url}/functions/v1/zapi-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({ leadId, content: replyText, messageType: 'text' }),
        })
      } catch { /* best-effort */ }
    }

    // 9. Log de automacao
    await supabaseVeltzy.from('automation_logs').insert({
      company_id: companyId,
      lead_id: leadId,
      status: 'success',
      trigger_data: { type: 'sdr_qualification', model: scoringConfig.model, provider: scoringConfig.provider },
      new_value: { score: parsed.score, temperature: parsed.temperature, reasoning: parsed.reasoning },
    })

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[sdr-ai] Erro:', err)
    return new Response(
      JSON.stringify({ error: 'Servico de IA temporariamente indisponivel', fallback: true }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

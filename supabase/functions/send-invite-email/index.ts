import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { invite_id, email, role, company_name, token, invited_by_name } = await req.json()

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: 'email and token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const brevoKey = Deno.env.get('BREVO_API_KEY')
    if (!brevoKey) {
      console.error('BREVO_API_KEY not set')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'https://app.veltzy.com'
    const acceptLink = `${appUrl}/aceitar-convite?token=${token}`

    const roleLabels: Record<string, string> = {
      seller: 'Vendedor',
      manager: 'Gestor',
      admin: 'Administrador',
    }
    const roleLabel = roleLabels[role] ?? role

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ec4899; margin: 0; font-size: 28px;">Veltzy</h1>
          <p style="color: #888; margin-top: 4px;">CRM inteligente para vendas</p>
        </div>

        <h2 style="color: #333;">Voce foi convidado!</h2>

        <p style="color: #555; line-height: 1.6;">
          ${invited_by_name ? `<strong>${invited_by_name}</strong> convidou voce` : 'Voce foi convidado'}
          para fazer parte de <strong>${company_name ?? 'uma empresa'}</strong> no Veltzy como <strong>${roleLabel}</strong>.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptLink}"
             style="display: inline-block; background-color: #ec4899; color: white;
                    padding: 14px 32px; border-radius: 8px; text-decoration: none;
                    font-weight: bold; font-size: 16px;">
            Aceitar convite
          </a>
        </div>

        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          Este convite expira em 7 dias. Se voce nao reconhece este convite, ignore este email.
        </p>

        <p style="color: #888; font-size: 12px; margin-top: 8px;">
          Ou copie e cole este link no navegador:<br/>
          <a href="${acceptLink}" style="color: #ec4899; word-break: break-all;">${acceptLink}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 11px; text-align: center;">
          Veltzy - CRM com IA para vendas via WhatsApp
        </p>
      </div>
    `

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Veltzy', email: 'noreply@veltzy.com' },
        to: [{ email }],
        subject: `Convite para ${company_name ?? 'Veltzy'} - ${roleLabel}`,
        htmlContent,
      }),
    })

    if (!res.ok) {
      const errorBody = await res.text()
      console.error('Brevo error:', errorBody)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorBody }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

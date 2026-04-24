import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, companyId, code, redirectUri } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'veltzy' } })

    if (action === 'authorize') {
      const appId = Deno.env.get('INSTAGRAM_APP_ID')
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_messages,pages_manage_metadata&response_type=code`
      return new Response(JSON.stringify({ url: authUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'callback') {
      const appId = Deno.env.get('INSTAGRAM_APP_ID')
      const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET')

      const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`)
      const tokenData = await tokenRes.json()

      const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`)
      const pagesData = await pagesRes.json()
      const page = pagesData.data?.[0]

      if (!page) return new Response(JSON.stringify({ error: 'No page found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const igRes = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`)
      const igData = await igRes.json()

      await supabase.from('instagram_connections').upsert({
        company_id: companyId,
        page_id: page.id,
        page_name: page.name,
        instagram_account_id: igData.instagram_business_account?.id ?? '',
        access_token: page.access_token,
      }, { onConflict: 'company_id' })

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'disconnect') {
      await supabase.from('instagram_connections').delete().eq('company_id', companyId)
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

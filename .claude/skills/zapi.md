# SKILL: Z-API + Supabase Integration

## VISÃO GERAL
Guia completo para integrar WhatsApp via Z-API com Supabase, cobrindo
arquitetura, permissões, edge functions e checklist de debug.
Baseado em experiência real de migração no ecossistema Veltz Group.

---

## 1. ARQUITETURA DE DADOS

Credenciais Z-API ficam em `public.oauth_integrations`:

```json
{
  "company_id": "uuid",
  "provider": "zapi",
  "status": "connected",
  "metadata": {
    "instance_id": "string",
    "token": "string",
    "client_token": "string",
    "server_url": "https://api.z-api.io",
    "phone_number": "string (opcional)",
    "qr_code": "string (opcional)",
    "connected_at": "string (opcional)"
  }
}
```

ATENÇÃO CRÍTICA: O campo no metadata é `token`, não `instance_token`.
O zapi-config.ts mapeia `metadata.token` -> `instance_token` internamente.
Se o Hub salvar como `instance_token`, a edge function não encontra e retorna config: null silenciosamente.

---

## 2. MAPEAMENTO NO ZAPI-CONFIG.TS

```typescript
function mapToZApiConfig(row): ZApiConfig {
  const m = row.metadata
  return {
    instance_id: m.instance_id,
    instance_token: m.token,        // lê 'token', não 'instance_token'
    client_token: m.client_token,
    server_url: m.server_url ?? 'https://api.z-api.io',
    status: row.status,
  }
}
```

---

## 3. PERMISSÕES DE BANCO (OBRIGATÓRIAS)

Sem essas permissões, as edge functions recebem `permission denied` mesmo
com service role key.

```sql
-- GRANT explícito para os roles acessarem a tabela
GRANT ALL ON public.oauth_integrations TO service_role;
GRANT ALL ON public.oauth_integrations TO authenticated;

-- RLS policies necessárias
CREATE POLICY "oauth_integrations_select" ON public.oauth_integrations
  FOR SELECT TO authenticated
  USING (company_id = get_current_company_id() OR is_super_admin());

CREATE POLICY "oauth_integrations_admin" ON public.oauth_integrations
  FOR ALL TO authenticated
  USING (
    (company_id = get_current_company_id() AND is_company_admin())
    OR is_super_admin()
  )
  WITH CHECK (
    (company_id = get_current_company_id() AND is_company_admin())
    OR is_super_admin()
  );

CREATE POLICY "service_role_bypass" ON public.oauth_integrations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## 4. EDGE FUNCTIONS — REGRAS CRÍTICAS

### Funções COM JWT de usuário (zapi-send, whatsapp-manager)

O cliente que acessa `oauth_integrations` DEVE passar o JWT do usuário:

```typescript
// ERRADO — RLS bloqueia mesmo com service role key
const supabasePublic = createClient(url, key)

// CORRETO — JWT do usuário satisfaz as RLS policies
const supabasePublic = createClient(url, key, {
  global: { headers: { Authorization: authHeader } }
})
```

### Funções webhook/cron SEM JWT (zapi-webhook, check-whatsapp-health, distribute-queue)

Usam service role key diretamente. Precisam do GRANT explícito acima.
Não passar Authorization header — não há usuário nessas chamadas.

### verify_jwt = false (OBRIGATÓRIO para webhooks externos)

A Z-API chama o webhook sem JWT. Sem essa config, Supabase retorna 401
antes de chegar no código da função.

No `supabase/config.toml`:
```toml
[functions.zapi-webhook]
verify_jwt = false
```

No deploy:
```bash
npx supabase functions deploy zapi-webhook --no-verify-jwt
```

---

## 5. CONSTRUÇÃO DA URL Z-API

```typescript
function buildZApiUrl(config: ZApiConfig): string {
  return `${config.server_url}/instances/${config.instance_id}/token/${config.instance_token}`
}

function buildZApiHeaders(config: ZApiConfig) {
  return {
    'Content-Type': 'application/json',
    'Client-Token': config.client_token,
  }
}
```

---

## 6. FLUXO DE ENVIO

```
Frontend -> zapi-send (edge function)
  -> busca profile.company_id (supabasePublic COM JWT)
  -> getZApiConfigByCompany (supabasePublic COM JWT)
  -> se config.status === 'connected': chama Z-API
  -> salva mensagem com source: 'whatsapp'
  -> se não conectado: salva com source: 'manual' (SILENCIOSO — debugar aqui)
```

---

## 7. FLUXO DE RECEBIMENTO

```
Celular responde -> Z-API -> POST /functions/v1/zapi-webhook
  -> Supabase valida (precisa verify_jwt = false)
  -> getZApiConfigByInstanceId (service role, SEM JWT)
  -> valida z-api-token header === config.instance_token
  -> salva mensagem no banco
  -> Realtime notifica frontend
```

---

## 8. CHECKLIST DE DEBUG

### Envio não funciona (mensagem salva como source: 'manual')
- [ ] `oauth_integrations` tem registro com `status = 'connected'`
- [ ] `metadata.token` está preenchido (não `metadata.instance_token`)
- [ ] `supabasePublic` está passando JWT do usuário no `createClient`
- [ ] Logs da `zapi-send`: `config: null` indica RLS bloqueando

### Recebimento não funciona (mensagem não aparece no chat)
- [ ] Webhook configurado na Z-API apontando para URL correta da edge function
- [ ] `zapi-webhook` deployada com `--no-verify-jwt`
- [ ] `verify_jwt = false` no `config.toml`
- [ ] GRANT executado: `GRANT ALL ON public.oauth_integrations TO service_role`
- [ ] Logs da `zapi-webhook`: status 401 = falta verify_jwt | permission denied = falta GRANT

### Instância desconectada
- [ ] Verificar status no painel Z-API
- [ ] `instance_token` não muda ao reconectar — só muda se gerar novo token manual
- [ ] `client_token` nunca muda

---

## 9. QUERIES ÚTEIS DE DIAGNÓSTICO

```sql
-- Ver estado completo da integração Z-API
SELECT
  company_id,
  status,
  metadata->>'instance_id' as instance_id,
  metadata->>'token' as token,
  metadata->>'client_token' as client_token,
  metadata->>'server_url' as server_url,
  updated_at
FROM public.oauth_integrations
WHERE provider = 'zapi';

-- Verificar permissões da tabela
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'oauth_integrations';

-- Verificar policies RLS
SELECT polname, polcmd,
  pg_get_expr(polqual, polrelid) as using_expr
FROM pg_policy
WHERE polrelid = 'public.oauth_integrations'::regclass;
```

---

## 10. ERROS COMUNS E SOLUÇÕES

| Erro | Causa | Solução |
|---|---|---|
| `config: null` no log | JWT não passado no createClient | Adicionar `Authorization` header no createClient |
| `permission denied for table oauth_integrations` | Falta GRANT para o role | `GRANT ALL ON public.oauth_integrations TO service_role` |
| Status 401 no zapi-webhook | verify_jwt não configurado | Deploy com `--no-verify-jwt` e `config.toml` |
| `source: 'manual'` na mensagem | config null ou status != connected | Ver checklist de envio acima |
| Mensagem chega no celular mas não no chat | zapi-webhook com permission denied | Ver checklist de recebimento acima |

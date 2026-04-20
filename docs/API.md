# API - Veltzy Edge Functions

## Webhooks Publicos

### WhatsApp (Z-API)
```
POST https://{project}.supabase.co/functions/v1/zapi-webhook
```
Configurar no painel Z-API como URL de webhook.

### Source Webhook (Landing Pages)
```
POST https://{project}.supabase.co/functions/v1/source-webhook?company={slug}&source={source_slug}
Content-Type: application/json

{
  "name": "Nome do Lead",
  "phone": "11999999999",
  "email": "lead@email.com",
  "tags": ["landing-page", "promo"],
  "observations": "Veio da campanha X"
}
```

Resposta:
```json
{ "success": true, "leadId": "uuid" }
```

### Instagram Webhook
```
POST https://{project}.supabase.co/functions/v1/instagram-webhook
```
Configurar no Meta Developer Dashboard como webhook URL.
Verify token: configurar como secret `INSTAGRAM_VERIFY_TOKEN`.

## Funcoes Autenticadas

Todas requerem header `Authorization: Bearer {access_token}`.

### Enviar Mensagem WhatsApp
```
POST https://{project}.supabase.co/functions/v1/zapi-send
{
  "leadId": "uuid",
  "content": "Mensagem",
  "messageType": "text"
}
```

### Gerenciar WhatsApp
```
POST https://{project}.supabase.co/functions/v1/whatsapp-manager
{ "companyId": "uuid", "action": "status|qrcode|disconnect|restart" }
```

### IA SDR
```
POST https://{project}.supabase.co/functions/v1/sdr-ai
{
  "leadId": "uuid",
  "companyId": "uuid",
  "messageContent": "texto da mensagem",
  "conversationHistory": []
}
```

Resposta:
```json
{
  "score": 72,
  "temperature": "hot",
  "response": "Mensagem da IA",
  "should_respond": true,
  "reasoning": "Explicacao"
}
```

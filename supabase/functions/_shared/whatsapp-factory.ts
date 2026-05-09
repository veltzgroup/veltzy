import type { WhatsAppProvider, WhatsAppProviderType } from './whatsapp-provider.ts'
import { ZApiProvider } from './providers/zapi.ts'

const providers: Record<string, WhatsAppProvider> = {
  zapi: new ZApiProvider(),
  // wuzapi: new WuzApiProvider(),     // Fase 2
  // revolution: new RevolutionProvider(), // Fase 3
}

export function createProvider(provider: WhatsAppProviderType): WhatsAppProvider {
  const impl = providers[provider]
  if (!impl) throw new Error(`WhatsApp provider nao suportado: ${provider}`)
  return impl
}

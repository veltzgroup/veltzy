// @deprecated - Use whatsapp-config.ts e whatsapp-factory.ts
// Mantido apenas para retrocompatibilidade durante a migração

export { getWhatsAppConfig as getZApiConfigByCompany } from './whatsapp-config.ts'
export { getWhatsAppConfigByInstanceId as getZApiConfigByInstanceId } from './whatsapp-config.ts'
export { getAllConnectedConfigs as getAllConnectedZApiConfigs } from './whatsapp-config.ts'
export { updateWhatsAppMetadata as updateZApiMetadata } from './whatsapp-config.ts'
export type { WhatsAppConfig as ZApiConfig } from './whatsapp-provider.ts'

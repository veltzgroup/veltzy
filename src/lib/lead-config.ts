import type { LeadTemperature } from '@/types/database'

export const leadTemperatureConfig: Record<LeadTemperature, {
  label: string; color: string; bgColor: string; borderColor: string
}> = {
  cold:  { label: 'Frio',          color: 'text-blue-400',   bgColor: 'bg-blue-500/10',   borderColor: 'border-blue-500/30' },
  warm:  { label: 'Morno',         color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  hot:   { label: 'Quente',        color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  fire:  { label: 'Pegando Fogo',  color: 'text-red-400',    bgColor: 'bg-red-500/10',    borderColor: 'border-red-500/30' },
}

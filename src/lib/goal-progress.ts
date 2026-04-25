import type { GoalMetric, MetricType } from '@/services/goals.service'
import type { Lead } from '@/types/database'
import type { PipelineStage } from '@/types/database'

interface LeadWithStage extends Lead {
  pipeline_stages?: PipelineStage | null
}

interface ProgressResult {
  current: number | null
  target: number
  percentage: number | null
}

const isInPeriod = (createdAt: string, startDate: string, endDate: string): boolean => {
  const date = new Date(createdAt)
  return date >= new Date(startDate) && date <= new Date(endDate)
}

const isClosedWon = (lead: LeadWithStage): boolean =>
  !!lead.pipeline_stages?.is_final && !!lead.pipeline_stages?.is_positive

const filterByScope = (leads: LeadWithStage[], metric: GoalMetric): LeadWithStage[] => {
  if (metric.applies_to === 'individual' && metric.profile_id) {
    return leads.filter((l) => l.assigned_to === metric.profile_id)
  }
  return leads
}

export const calculateProgress = (
  metric: GoalMetric,
  leads: LeadWithStage[],
  startDate: string,
  endDate: string
): ProgressResult => {
  const scopedLeads = filterByScope(leads, metric)
  const periodLeads = scopedLeads.filter((l) => isInPeriod(l.created_at, startDate, endDate))

  const calculators: Record<MetricType, () => ProgressResult> = {
    revenue: () => {
      const current = periodLeads
        .filter(isClosedWon)
        .reduce((sum, l) => sum + (l.deal_value ?? 0), 0)
      return {
        current,
        target: metric.target_value,
        percentage: metric.target_value > 0 ? Math.round((current / metric.target_value) * 100) : 0,
      }
    },

    deals_closed: () => {
      const current = periodLeads.filter(isClosedWon).length
      return {
        current,
        target: metric.target_value,
        percentage: metric.target_value > 0 ? Math.round((current / metric.target_value) * 100) : 0,
      }
    },

    leads_attended: () => {
      const current = periodLeads.filter((l) => l.assigned_to !== null).length
      return {
        current,
        target: metric.target_value,
        percentage: metric.target_value > 0 ? Math.round((current / metric.target_value) * 100) : 0,
      }
    },

    conversion_rate: () => {
      const attended = periodLeads.filter((l) => l.assigned_to !== null).length
      const closed = periodLeads.filter(isClosedWon).length
      const current = attended > 0 ? Math.round((closed / attended) * 100) : 0
      return {
        current,
        target: metric.target_value,
        percentage: metric.target_value > 0 ? Math.round((current / metric.target_value) * 100) : 0,
      }
    },

    avg_response_time: () => ({
      current: null,
      target: metric.target_value,
      percentage: null,
    }),
  }

  return calculators[metric.metric_type]()
}

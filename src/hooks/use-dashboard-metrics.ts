import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import * as dashboardService from '@/services/dashboard.service'

export const useDashboardMetrics = (days = 30, pipelineId?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['dashboard-metrics', companyId, days, pipelineId],
    queryFn: () => dashboardService.getConversionMetrics(companyId!, days, pipelineId ?? undefined),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useDashboardKpis = (days?: number, pipelineId?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['dashboard-kpis', companyId, days, pipelineId],
    queryFn: () => dashboardService.getDashboardKpis(companyId!, days, pipelineId ?? undefined),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useLeadsBySource = (days?: number, pipelineId?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['leads-by-source', companyId, days, pipelineId],
    queryFn: () => dashboardService.getLeadsBySource(companyId!, days, pipelineId ?? undefined),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const usePipelineOverview = (days?: number, pipelineId?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['pipeline-overview', companyId, days, pipelineId],
    queryFn: () => dashboardService.getPipelineOverview(companyId!, days, pipelineId ?? undefined),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useMonthlyComparison = (days?: number, pipelineId?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['monthly-comparison', companyId, days, pipelineId],
    queryFn: () => dashboardService.getMonthlyComparison(companyId!, days, pipelineId ?? undefined),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useMonthlyComparisonGrid = (months = 6, pipelineId?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['monthly-comparison-grid', companyId, months, pipelineId],
    queryFn: () => dashboardService.getMonthlyComparisonGrid(companyId!, months, pipelineId ?? undefined),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useHistoricalConversionRates = (days = 90, pipelineId?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['historical-conversion-rates', companyId, days, pipelineId],
    queryFn: () => dashboardService.getHistoricalConversionRates(companyId!, days, pipelineId ?? undefined),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useSellerPerformance = (days?: number, pipelineId?: string | null) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['seller-performance', companyId, days, pipelineId],
    queryFn: () => dashboardService.getSellerPerformance(companyId!, days, pipelineId ?? undefined),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

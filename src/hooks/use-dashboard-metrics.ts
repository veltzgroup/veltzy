import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import * as dashboardService from '@/services/dashboard.service'

export const useDashboardMetrics = (days = 30) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['dashboard-metrics', companyId, days],
    queryFn: () => dashboardService.getConversionMetrics(companyId!, days),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useDashboardKpis = (days?: number) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['dashboard-kpis', companyId, days],
    queryFn: () => dashboardService.getDashboardKpis(companyId!, days),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useLeadsBySource = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['leads-by-source', companyId],
    queryFn: () => dashboardService.getLeadsBySource(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const usePipelineOverview = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['pipeline-overview', companyId],
    queryFn: () => dashboardService.getPipelineOverview(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useMonthlyComparison = (days?: number) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['monthly-comparison', companyId, days],
    queryFn: () => dashboardService.getMonthlyComparison(companyId!, days),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useMonthlyComparisonGrid = (months = 6) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['monthly-comparison-grid', companyId, months],
    queryFn: () => dashboardService.getMonthlyComparisonGrid(companyId!, months),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useHistoricalConversionRates = (days = 90) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['historical-conversion-rates', companyId, days],
    queryFn: () => dashboardService.getHistoricalConversionRates(companyId!, days),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useSellerPerformance = (days?: number) => {
  const companyId = useAuthStore((s) => s.company?.id)
  return useQuery({
    queryKey: ['seller-performance', companyId, days],
    queryFn: () => dashboardService.getSellerPerformance(companyId!, days),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

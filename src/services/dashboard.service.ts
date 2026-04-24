import { supabase } from '@/lib/supabase'
import type { ConversionMetrics, SourceMetrics, StageMetrics, SellerMetrics, MonthlyData } from '@/types/database'

const getPeriodDates = (days: number) => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  const prevStart = new Date(start)
  prevStart.setDate(prevStart.getDate() - days)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    prevStart: prevStart.toISOString(),
    prevEnd: start.toISOString(),
  }
}

export const getConversionMetrics = async (companyId: string, days = 30): Promise<ConversionMetrics> => {
  const { start, prevStart, prevEnd } = getPeriodDates(days)

  const { data: current } = await supabase.from('leads').select('status, deal_value').eq('company_id', companyId).gte('created_at', start)
  const { data: prev } = await supabase.from('leads').select('status, deal_value').eq('company_id', companyId).gte('created_at', prevStart).lt('created_at', prevEnd)

  const calc = (leads: typeof current) => {
    const total = leads?.length ?? 0
    const deals = leads?.filter((l) => l.status === 'deal') ?? []
    const revenue = deals.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0)
    return { total, deals: deals.length, rate: total > 0 ? (deals.length / total) * 100 : 0, revenue }
  }

  const c = calc(current)
  const p = calc(prev)

  return {
    totalLeads: c.total, dealsClosed: c.deals, conversionRate: Math.round(c.rate * 10) / 10, totalRevenue: c.revenue,
    prevTotalLeads: p.total, prevDealsClosed: p.deals, prevConversionRate: Math.round(p.rate * 10) / 10, prevTotalRevenue: p.revenue,
  }
}

export interface DashboardKpis {
  conversionRate: number
  avgAiScore: number
  dealsClosed: number
  totalLeads: number
  openCount: number
  closedCount: number
  lostCount: number
  openValue: number
  closedValue: number
  lostValue: number
  totalValue: number
  avgTicket: number
}

export const getDashboardKpis = async (companyId: string, days?: number): Promise<DashboardKpis> => {
  let query = supabase.from('leads').select('status, deal_value, ai_score').eq('company_id', companyId)
  if (days) {
    const start = new Date()
    start.setDate(start.getDate() - days)
    query = query.gte('created_at', start.toISOString())
  }
  const { data: leads } = await query

  const all = leads ?? []
  const total = all.length
  const open = all.filter((l) => !['deal', 'lost'].includes(l.status))
  const closed = all.filter((l) => l.status === 'deal')
  const lost = all.filter((l) => l.status === 'lost')

  const sumVal = (arr: typeof all) => arr.reduce((s, l) => s + (Number(l.deal_value) || 0), 0)
  const openValue = sumVal(open)
  const closedValue = sumVal(closed)
  const lostValue = sumVal(lost)
  const totalValue = openValue + closedValue + lostValue

  const avgScore = total > 0 ? Math.round(all.reduce((s, l) => s + (l.ai_score ?? 0), 0) / total) : 0
  const conversionRate = total > 0 ? Math.round((closed.length / total) * 100) : 0
  const avgTicket = closed.length > 0 ? closedValue / closed.length : 0

  return {
    conversionRate,
    avgAiScore: avgScore,
    dealsClosed: closed.length,
    totalLeads: total,
    openCount: open.length,
    closedCount: closed.length,
    lostCount: lost.length,
    openValue,
    closedValue,
    lostValue,
    totalValue,
    avgTicket,
  }
}

export const getLeadsBySource = async (companyId: string): Promise<SourceMetrics[]> => {
  const { data: leads } = await supabase.from('leads').select('source_id').eq('company_id', companyId)
  const { data: sources } = await supabase.from('lead_sources').select('id, name, color').eq('company_id', companyId)

  const counts: Record<string, number> = {}
  leads?.forEach((l) => { if (l.source_id) counts[l.source_id] = (counts[l.source_id] ?? 0) + 1 })

  return (sources ?? []).map((s) => ({ source_id: s.id, name: s.name, color: s.color, count: counts[s.id] ?? 0 })).filter((s) => s.count > 0)
}

export const getPipelineOverview = async (companyId: string): Promise<StageMetrics[]> => {
  const { data: stages } = await supabase.from('pipeline_stages').select('id, name, color, position').eq('company_id', companyId).order('position')
  const { data: leads } = await supabase.from('leads').select('stage_id, deal_value').eq('company_id', companyId)

  const map: Record<string, { count: number; value: number }> = {}
  leads?.forEach((l) => {
    if (!map[l.stage_id]) map[l.stage_id] = { count: 0, value: 0 }
    map[l.stage_id].count++
    map[l.stage_id].value += Number(l.deal_value) || 0
  })

  return (stages ?? []).map((s) => ({
    stage_id: s.id, name: s.name, color: s.color, position: s.position,
    count: map[s.id]?.count ?? 0, value: map[s.id]?.value ?? 0,
  }))
}

export const getMonthlyComparison = async (companyId: string): Promise<MonthlyData[]> => {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: leads } = await supabase.from('leads').select('status, created_at').eq('company_id', companyId).gte('created_at', sixMonthsAgo.toISOString())

  const months: Record<string, { leads: number; deals: number }> = {}
  leads?.forEach((l) => {
    const d = new Date(l.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!months[key]) months[key] = { leads: 0, deals: 0 }
    months[key].leads++
    if (l.status === 'deal') months[key].deals++
  })

  return Object.entries(months).sort().map(([month, data]) => ({
    month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
    ...data,
  }))
}

export const getSellerPerformance = async (companyId: string): Promise<SellerMetrics[]> => {
  const { data: profiles } = await supabase.from('profiles').select('id, name, is_available').eq('company_id', companyId)
  const { data: leads } = await supabase.from('leads').select('assigned_to, status, deal_value').eq('company_id', companyId)
  const { data: responseTimes } = await supabase.rpc('get_seller_avg_response_times', { _company_id: companyId })

  const responseMap: Record<string, number> = {}
  ;(responseTimes ?? []).forEach((r: { profile_id: string; avg_response_minutes: number }) => {
    responseMap[r.profile_id] = r.avg_response_minutes
  })

  return (profiles ?? []).map((p) => {
    const myLeads = leads?.filter((l) => l.assigned_to === p.id) ?? []
    const deals = myLeads.filter((l) => l.status === 'deal')
    return {
      profile_id: p.id,
      name: p.name,
      leads_count: myLeads.length,
      deals_count: deals.length,
      conversion_rate: myLeads.length > 0 ? Math.round((deals.length / myLeads.length) * 1000) / 10 : 0,
      avg_response_minutes: responseMap[p.id] ?? null,
      is_available: p.is_available,
    }
  })
}

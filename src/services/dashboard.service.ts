import { supabase, veltzy } from '@/lib/supabase'
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

export const getConversionMetrics = async (companyId: string, days = 30, pipelineId?: string, sellerProfileId?: string): Promise<ConversionMetrics> => {
  const { start, prevStart, prevEnd } = getPeriodDates(days)

  let currentQuery = veltzy().from('leads').select('status, deal_value').eq('company_id', companyId).gte('created_at', start)
  if (pipelineId) currentQuery = currentQuery.eq('pipeline_id', pipelineId)
  if (sellerProfileId) currentQuery = currentQuery.eq('assigned_to', sellerProfileId)
  const { data: current, error: currentError } = await currentQuery
  if (currentError) throw currentError
  let prevQuery = veltzy().from('leads').select('status, deal_value').eq('company_id', companyId).gte('created_at', prevStart).lt('created_at', prevEnd)
  if (pipelineId) prevQuery = prevQuery.eq('pipeline_id', pipelineId)
  if (sellerProfileId) prevQuery = prevQuery.eq('assigned_to', sellerProfileId)
  const { data: prev, error: prevError } = await prevQuery
  if (prevError) throw prevError

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
  prevConversionRate: number
  prevAvgAiScore: number
  prevDealsClosed: number
}

export const getDashboardKpis = async (companyId: string, days?: number, pipelineId?: string, sellerProfileId?: string): Promise<DashboardKpis> => {
  let query = veltzy().from('leads').select('status, deal_value, ai_score').eq('company_id', companyId)
  if (pipelineId) query = query.eq('pipeline_id', pipelineId)
  if (sellerProfileId) query = query.eq('assigned_to', sellerProfileId)
  if (days) {
    const start = new Date()
    start.setDate(start.getDate() - days)
    query = query.gte('created_at', start.toISOString())
  }
  const { data: leads, error } = await query
  if (error) throw error

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

  let prevConversionRate = 0
  let prevAvgAiScore = 0
  let prevDealsClosed = 0
  if (days) {
    const prevEnd = new Date()
    prevEnd.setDate(prevEnd.getDate() - days)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - days)
    let prevQuery = veltzy()
      .from('leads')
      .select('status, ai_score')
      .eq('company_id', companyId)
      .gte('created_at', prevStart.toISOString())
      .lt('created_at', prevEnd.toISOString())
    if (pipelineId) prevQuery = prevQuery.eq('pipeline_id', pipelineId)
    if (sellerProfileId) prevQuery = prevQuery.eq('assigned_to', sellerProfileId)
    const { data: prevLeads } = await prevQuery
    const pAll = prevLeads ?? []
    const pClosed = pAll.filter((l) => l.status === 'deal')
    prevConversionRate = pAll.length > 0 ? Math.round((pClosed.length / pAll.length) * 100) : 0
    prevAvgAiScore = pAll.length > 0 ? Math.round(pAll.reduce((s, l) => s + (l.ai_score ?? 0), 0) / pAll.length) : 0
    prevDealsClosed = pClosed.length
  }

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
    prevConversionRate,
    prevAvgAiScore,
    prevDealsClosed,
  }
}

export const getLeadsBySource = async (companyId: string, days?: number, pipelineId?: string, sellerProfileId?: string): Promise<SourceMetrics[]> => {
  let query = veltzy().from('leads').select('source_id').eq('company_id', companyId)
  if (pipelineId) query = query.eq('pipeline_id', pipelineId)
  if (sellerProfileId) query = query.eq('assigned_to', sellerProfileId)
  if (days) {
    const start = new Date()
    start.setDate(start.getDate() - days)
    query = query.gte('created_at', start.toISOString())
  }
  const { data: leads, error: leadsError } = await query
  if (leadsError) throw leadsError
  const { data: sources, error: sourcesError } = await veltzy().from('lead_sources').select('id, name, color').eq('company_id', companyId)
  if (sourcesError) throw sourcesError

  const counts: Record<string, number> = {}
  leads?.forEach((l) => { if (l.source_id) counts[l.source_id] = (counts[l.source_id] ?? 0) + 1 })

  return (sources ?? []).map((s) => ({ source_id: s.id, name: s.name, color: s.color, count: counts[s.id] ?? 0 })).filter((s) => s.count > 0)
}

export const getPipelineOverview = async (companyId: string, days?: number, pipelineId?: string, sellerProfileId?: string): Promise<StageMetrics[]> => {
  let stagesQuery = veltzy().from('pipeline_stages').select('id, name, color, position, is_final').eq('company_id', companyId).order('position')
  if (pipelineId) stagesQuery = stagesQuery.eq('pipeline_id', pipelineId)
  const { data: stages, error: stagesError } = await stagesQuery
  if (stagesError) throw stagesError
  let leadsQuery = veltzy().from('leads').select('stage_id, deal_value').eq('company_id', companyId)
  if (pipelineId) leadsQuery = leadsQuery.eq('pipeline_id', pipelineId)
  if (sellerProfileId) leadsQuery = leadsQuery.eq('assigned_to', sellerProfileId)
  if (days) {
    const start = new Date()
    start.setDate(start.getDate() - days)
    leadsQuery = leadsQuery.gte('created_at', start.toISOString())
  }
  const { data: leads, error: leadsError } = await leadsQuery
  if (leadsError) throw leadsError

  const map: Record<string, { count: number; value: number }> = {}
  leads?.forEach((l) => {
    if (!map[l.stage_id]) map[l.stage_id] = { count: 0, value: 0 }
    map[l.stage_id].count++
    map[l.stage_id].value += Number(l.deal_value) || 0
  })

  return (stages ?? []).map((s) => ({
    stage_id: s.id, name: s.name, color: s.color, position: s.position,
    count: map[s.id]?.count ?? 0, value: map[s.id]?.value ?? 0,
    is_final: s.is_final,
  }))
}

export const getMonthlyComparison = async (companyId: string, days?: number, pipelineId?: string, sellerProfileId?: string): Promise<MonthlyData[]> => {
  const monthsBack = days && days <= 30 ? 3 : 6
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - monthsBack)

  let query = veltzy().from('leads').select('status, created_at').eq('company_id', companyId).gte('created_at', startDate.toISOString())
  if (pipelineId) query = query.eq('pipeline_id', pipelineId)
  if (sellerProfileId) query = query.eq('assigned_to', sellerProfileId)
  const { data: leads, error } = await query
  if (error) throw error

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

export interface MonthlyGridData {
  month: string
  leads: number
  conversion: number
  deals: number
  value: number
}

export const getMonthlyComparisonGrid = async (companyId: string, months = 6, pipelineId?: string, sellerProfileId?: string): Promise<MonthlyGridData[]> => {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  let query = veltzy()
    .from('leads')
    .select('status, deal_value, created_at')
    .eq('company_id', companyId)
    .gte('created_at', startDate.toISOString())
  if (pipelineId) query = query.eq('pipeline_id', pipelineId)
  if (sellerProfileId) query = query.eq('assigned_to', sellerProfileId)
  const { data: leads, error } = await query
  if (error) throw error

  // Gerar todos os meses do periodo, mesmo sem dados
  const allMonths: string[] = []
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const now = new Date()
  while (cursor <= now) {
    allMonths.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const buckets: Record<string, { leads: number; deals: number; value: number }> = {}
  allMonths.forEach((key) => {
    buckets[key] = { leads: 0, deals: 0, value: 0 }
  })

  leads?.forEach((l) => {
    const d = new Date(l.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!buckets[key]) buckets[key] = { leads: 0, deals: 0, value: 0 }
    buckets[key].leads++
    if (l.status === 'deal') {
      buckets[key].deals++
      buckets[key].value += Number(l.deal_value) || 0
    }
  })

  return allMonths.map((month) => {
    const data = buckets[month]
    const [y, m] = month.split('-')
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    const label = `${monthNames[Number(m) - 1]}/${y.slice(2)}`
    return {
      month: label,
      leads: data.leads,
      conversion: data.leads > 0 ? Math.round((data.deals / data.leads) * 100) : 0,
      deals: data.deals,
      value: data.value,
    }
  })
}

export interface HistoricalConversionRate {
  stage_id: string
  stage_name: string
  position: number
  entered: number
  advanced: number
  rate: number
}

export const getHistoricalConversionRates = async (companyId: string, days = 90, pipelineId?: string, sellerProfileId?: string): Promise<HistoricalConversionRate[]> => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  let stagesQuery = veltzy()
    .from('pipeline_stages')
    .select('id, name, position, is_final')
    .eq('company_id', companyId)
    .order('position')
  if (pipelineId) stagesQuery = stagesQuery.eq('pipeline_id', pipelineId)
  const { data: stages, error: stagesError } = await stagesQuery
  if (stagesError) throw stagesError

  let leadsQuery = veltzy()
    .from('leads')
    .select('stage_id, status, created_at, updated_at')
    .eq('company_id', companyId)
    .gte('created_at', startDate.toISOString())
  if (pipelineId) leadsQuery = leadsQuery.eq('pipeline_id', pipelineId)
  if (sellerProfileId) leadsQuery = leadsQuery.eq('assigned_to', sellerProfileId)
  const { data: leads, error: leadsError } = await leadsQuery
  if (leadsError) throw leadsError

  const nonFinalStages = (stages ?? []).filter((s) => !s.is_final)
  const stagePositions = new Map((stages ?? []).map((s) => [s.id, s.position]))

  const entered: Record<string, number> = {}
  const advanced: Record<string, number> = {}

  ;(leads ?? []).forEach((lead) => {
    const pos = stagePositions.get(lead.stage_id)
    nonFinalStages.forEach((stage) => {
      if (stage.position <= (pos ?? -1)) {
        entered[stage.id] = (entered[stage.id] ?? 0) + 1
      }
      if (stage.position < (pos ?? -1)) {
        advanced[stage.id] = (advanced[stage.id] ?? 0) + 1
      }
    })
  })

  return nonFinalStages.map((stage) => {
    const e = entered[stage.id] ?? 0
    const a = advanced[stage.id] ?? 0
    return {
      stage_id: stage.id,
      stage_name: stage.name,
      position: stage.position,
      entered: e,
      advanced: a,
      rate: e > 0 ? Math.round((a / e) * 100) : 0,
    }
  })
}

export const getSellerPerformance = async (companyId: string, days?: number, pipelineId?: string, sellerProfileId?: string): Promise<SellerMetrics[]> => {
  // Se vendedor, mostra apenas sua propria performance
  let profilesQuery = supabase.from('profiles').select('id, name, is_available').eq('company_id', companyId)
  if (sellerProfileId) profilesQuery = profilesQuery.eq('id', sellerProfileId)
  const { data: profiles, error: profilesError } = await profilesQuery
  if (profilesError) throw profilesError

  let leadsQuery = veltzy().from('leads').select('assigned_to, status, deal_value').eq('company_id', companyId)
  if (pipelineId) leadsQuery = leadsQuery.eq('pipeline_id', pipelineId)
  if (sellerProfileId) leadsQuery = leadsQuery.eq('assigned_to', sellerProfileId)
  if (days) {
    const start = new Date()
    start.setDate(start.getDate() - days)
    leadsQuery = leadsQuery.gte('created_at', start.toISOString())
  }
  const { data: leads, error: leadsError } = await leadsQuery
  if (leadsError) throw leadsError

  const startDate = days ? new Date() : undefined
  if (startDate && days) startDate.setDate(startDate.getDate() - days)

  const { data: responseTimes, error: rpcError } = await supabase.rpc('get_seller_avg_response_times', {
    _company_id: companyId,
    ...(startDate ? { _start_date: startDate.toISOString() } : {}),
  })
  if (rpcError) throw rpcError

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

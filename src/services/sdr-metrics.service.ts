import { supabase } from '@/lib/supabase'

export interface ScoreRange {
  range: string
  min: number
  max: number
  count: number
  color: string
}

export interface SdrKpis {
  qualified_count: number
  avg_score: number
  qualification_rate: number
}

const RANGES: Omit<ScoreRange, 'count'>[] = [
  { range: '0-20', min: 0, max: 20, color: '#991b1b' },
  { range: '21-40', min: 21, max: 40, color: '#ef4444' },
  { range: '41-60', min: 41, max: 60, color: '#eab308' },
  { range: '61-80', min: 61, max: 80, color: '#86efac' },
  { range: '81-100', min: 81, max: 100, color: 'hsl(158 72% 46%)' },
]

export const getScoreDistribution = async (companyId: string, days?: number): Promise<ScoreRange[]> => {
  let query = supabase.from('leads').select('ai_score').eq('company_id', companyId)
  if (days) {
    const start = new Date()
    start.setDate(start.getDate() - days)
    query = query.gte('created_at', start.toISOString())
  }
  const { data } = await query

  return RANGES.map((r) => ({
    ...r,
    count: (data ?? []).filter((l) => l.ai_score >= r.min && l.ai_score <= r.max).length,
  }))
}

export const getSdrKpis = async (companyId: string, days?: number): Promise<SdrKpis> => {
  let query = supabase.from('leads').select('ai_score').eq('company_id', companyId)
  if (days) {
    const start = new Date()
    start.setDate(start.getDate() - days)
    query = query.gte('created_at', start.toISOString())
  }
  const { data } = await query

  const all = data ?? []
  const total = all.length
  const qualified = all.filter((l) => l.ai_score > 0)
  const avgScore = qualified.length > 0
    ? Math.round(qualified.reduce((s, l) => s + l.ai_score, 0) / qualified.length)
    : 0

  return {
    qualified_count: qualified.length,
    avg_score: avgScore,
    qualification_rate: total > 0 ? Math.round((qualified.length / total) * 100) : 0,
  }
}

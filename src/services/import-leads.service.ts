import { veltzy } from '@/lib/supabase'
import type { LeadTemperature, PipelineStage, LeadSourceRecord } from '@/types/database'
import type { LeadField } from '@/lib/csv-parser'

export interface ImportableRow {
  name?: string
  phone: string
  email?: string
  source_id?: string
  stage_id: string
  temperature?: LeadTemperature
  deal_value?: number
  observations?: string
  tags?: string[]
}

export interface RowResult {
  rowIndex: number
  status: 'success' | 'error' | 'skipped'
  reason?: string
}

export interface ImportBatchResult {
  results: RowResult[]
  inserted: number
  skipped: number
  errors: number
}

interface Lookups {
  stages: PipelineStage[]
  sources: LeadSourceRecord[]
}

const TEMP_MAP: Record<string, LeadTemperature> = {
  'frio': 'cold', 'cold': 'cold',
  'morno': 'warm', 'warm': 'warm',
  'quente': 'hot', 'hot': 'hot',
  'pegando fogo': 'fire', 'fire': 'fire',
}

const parseBrNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined
  const cleaned = value.replace(/\./g, '').replace(',', '.').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? undefined : num
}

const normalizePhone = (phone: string): string =>
  phone.replace(/\D/g, '')

export const mapCsvRowToLead = (
  row: string[],
  columnMapping: Record<number, LeadField | null>,
  defaultStageId: string,
  defaultSourceId: string | undefined,
  lookups: Lookups,
): ImportableRow => {
  const lead: Partial<ImportableRow> = {
    stage_id: defaultStageId,
    source_id: defaultSourceId,
  }

  for (const [colIndex, field] of Object.entries(columnMapping)) {
    if (!field) continue
    const value = row[Number(colIndex)]?.trim() ?? ''
    if (!value) continue

    switch (field) {
      case 'name':
        lead.name = value
        break
      case 'phone':
        lead.phone = normalizePhone(value)
        break
      case 'email':
        lead.email = value
        break
      case 'stage_id': {
        const stage = lookups.stages.find((s) => s.name.toLowerCase() === value.toLowerCase())
        if (stage) lead.stage_id = stage.id
        break
      }
      case 'source_id': {
        const source = lookups.sources.find((s) => s.name.toLowerCase() === value.toLowerCase())
        if (source) lead.source_id = source.id
        break
      }
      case 'temperature':
        lead.temperature = TEMP_MAP[value.toLowerCase()] ?? undefined
        break
      case 'deal_value':
        lead.deal_value = parseBrNumber(value)
        break
      case 'observations':
        lead.observations = value
        break
      case 'tags':
        lead.tags = value.split(',').map((t) => t.trim()).filter(Boolean)
        break
    }
  }

  return lead as ImportableRow
}

export const validateRow = (row: ImportableRow, index: number): RowResult | null => {
  if (!row.phone || row.phone.length < 8) {
    return { rowIndex: index, status: 'error', reason: 'Telefone obrigatório (min 8 dígitos)' }
  }
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    return { rowIndex: index, status: 'error', reason: `Email inválido: ${row.email}` }
  }
  return null
}

const BATCH_SIZE = 50

export const checkDuplicates = async (companyId: string, phones: string[]): Promise<Set<string>> => {
  const { data } = await veltzy()
    .from('leads')
    .select('phone')
    .eq('company_id', companyId)
    .in('phone', phones)
  return new Set((data ?? []).map((d: { phone: string }) => d.phone))
}

export const importLeads = async (
  companyId: string,
  rows: ImportableRow[],
  onProgress: (done: number, total: number) => void,
): Promise<ImportBatchResult> => {
  const allResults: RowResult[] = []
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const batchIndices = batch.map((_, idx) => i + idx)

    // Validação
    const validRows: ImportableRow[] = []
    const validIndices: number[] = []
    batch.forEach((row, idx) => {
      const err = validateRow(row, batchIndices[idx])
      if (err) {
        allResults.push(err)
        errors++
      } else {
        validRows.push(row)
        validIndices.push(batchIndices[idx])
      }
    })

    if (validRows.length === 0) {
      onProgress(Math.min(i + BATCH_SIZE, rows.length), rows.length)
      continue
    }

    // Duplicatas
    const phones = validRows.map((r) => r.phone)
    const existing = await checkDuplicates(companyId, phones)

    const toInsert: ImportableRow[] = []
    const toInsertIndices: number[] = []
    validRows.forEach((row, idx) => {
      if (existing.has(row.phone)) {
        allResults.push({ rowIndex: validIndices[idx], status: 'skipped', reason: 'Telefone já cadastrado' })
        skipped++
      } else {
        toInsert.push(row)
        toInsertIndices.push(validIndices[idx])
      }
    })

    if (toInsert.length > 0) {
      const insertData = toInsert.map((row) => ({
        company_id: companyId,
        name: row.name ?? null,
        phone: row.phone,
        email: row.email ?? null,
        source_id: row.source_id ?? null,
        stage_id: row.stage_id,
        temperature: row.temperature ?? 'cold',
        deal_value: row.deal_value ?? null,
        observations: row.observations ?? null,
        tags: row.tags ?? [],
      }))

      const { error } = await veltzy()
        .from('leads')
        .insert(insertData)

      if (error) {
        toInsertIndices.forEach((idx) => {
          allResults.push({ rowIndex: idx, status: 'error', reason: `Erro no banco: ${error.message}` })
        })
        errors += toInsertIndices.length
      } else {
        toInsertIndices.forEach((idx) => {
          allResults.push({ rowIndex: idx, status: 'success' })
        })
        inserted += toInsertIndices.length
      }
    }

    onProgress(Math.min(i + BATCH_SIZE, rows.length), rows.length)
  }

  allResults.sort((a, b) => a.rowIndex - b.rowIndex)
  return { results: allResults, inserted, skipped, errors }
}

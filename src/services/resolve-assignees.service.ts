import type { Profile } from '@/types/database'
import type { LeadField } from '@/lib/csv-parser'

// ---------------------------------------------------------------------------
// Normalização de texto (remove acentos, lowercase, trim, colapsa espaços)
// ---------------------------------------------------------------------------
const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')

// ---------------------------------------------------------------------------
// Levenshtein distance (para fuzzy matching)
// ---------------------------------------------------------------------------
const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[b.length][a.length]
}

const similarity = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export type MatchType = 'exact' | 'approximate' | 'none'

export interface AssigneeResolution {
  originalValue: string
  matchType: MatchType
  suggestedMember?: Partial<Profile>
  similarityScore?: number
  resolvedUserId: string | null
  affectedRows: number
  decision?: 'accept' | 'choose' | 'skip'
}

export type AssigneeResolutionMap = Record<string, string | null>

// ---------------------------------------------------------------------------
// Pre-flight scan: extrai valores únicos da coluna "Responsável" e resolve
// ---------------------------------------------------------------------------
export const resolveAssignees = (
  rows: string[][],
  columnMapping: Record<number, LeadField | null>,
  members: Partial<Profile>[],
): AssigneeResolution[] => {
  // Encontrar índice da coluna mapeada como assigned_to
  const assignedColIndex = Object.entries(columnMapping)
    .find(([, field]) => field === 'assigned_to')
    ?.[0]

  if (assignedColIndex === undefined) return []

  const colIdx = Number(assignedColIndex)

  // Extrair valores únicos e contar ocorrências
  const valueCounts = new Map<string, number>()
  for (const row of rows) {
    const raw = row[colIdx]?.trim() ?? ''
    if (!raw) continue
    valueCounts.set(raw, (valueCounts.get(raw) ?? 0) + 1)
  }

  if (valueCounts.size === 0) return []

  // Pré-normalizar membros
  const normalizedMembers = members.map((m) => ({
    member: m,
    normalizedName: m.name ? normalizeText(m.name) : '',
    normalizedEmail: m.email ? normalizeText(m.email) : '',
  }))

  const resolutions: AssigneeResolution[] = []

  for (const [originalValue, count] of valueCounts) {
    const normalized = normalizeText(originalValue)

    // (a) Match exato no nome normalizado
    const exactMatch = normalizedMembers.find((m) => m.normalizedName === normalized)
    if (exactMatch) {
      resolutions.push({
        originalValue,
        matchType: 'exact',
        suggestedMember: exactMatch.member,
        similarityScore: 1,
        resolvedUserId: exactMatch.member.user_id ?? null,
        affectedRows: count,
        decision: 'accept',
      })
      continue
    }

    // (b) Match por email
    const emailMatch = normalizedMembers.find((m) => m.normalizedEmail === normalized)
    if (emailMatch) {
      resolutions.push({
        originalValue,
        matchType: 'exact',
        suggestedMember: emailMatch.member,
        similarityScore: 1,
        resolvedUserId: emailMatch.member.user_id ?? null,
        affectedRows: count,
        decision: 'accept',
      })
      continue
    }

    // (c) Match fuzzy (similarity > 0.70)
    let bestMatch: { member: Partial<Profile>; score: number } | null = null
    for (const nm of normalizedMembers) {
      if (!nm.normalizedName) continue
      const score = similarity(normalized, nm.normalizedName)
      if (score > (bestMatch?.score ?? 0)) {
        bestMatch = { member: nm.member, score }
      }
    }

    if (bestMatch && bestMatch.score >= 0.70) {
      resolutions.push({
        originalValue,
        matchType: 'approximate',
        suggestedMember: bestMatch.member,
        similarityScore: bestMatch.score,
        resolvedUserId: bestMatch.member.user_id ?? null,
        affectedRows: count,
      })
    } else {
      resolutions.push({
        originalValue,
        matchType: 'none',
        suggestedMember: undefined,
        resolvedUserId: null,
        affectedRows: count,
      })
    }
  }

  return resolutions
}

// ---------------------------------------------------------------------------
// Checar se precisa confirmação (tem approximate ou none)
// ---------------------------------------------------------------------------
export const needsAssigneeConfirmation = (resolutions: AssigneeResolution[]): boolean =>
  resolutions.some((r) => r.matchType === 'approximate' || r.matchType === 'none')

// ---------------------------------------------------------------------------
// Construir mapa de resolução final a partir das decisões do usuário
// ---------------------------------------------------------------------------
export const buildResolutionMap = (resolutions: AssigneeResolution[]): AssigneeResolutionMap => {
  const map: AssigneeResolutionMap = {}
  for (const r of resolutions) {
    if (r.decision === 'accept' || r.decision === 'choose') {
      map[r.originalValue] = r.resolvedUserId
    } else {
      // skip ou sem decisão → null
      map[r.originalValue] = null
    }
  }
  return map
}

// ---------------------------------------------------------------------------
// Aplicar mapa de resolução nas rows antes do insert
// ---------------------------------------------------------------------------
export const applyAssigneeResolutions = (
  rows: string[][],
  columnMapping: Record<number, LeadField | null>,
  resolutionMap: AssigneeResolutionMap,
): void => {
  const assignedColIndex = Object.entries(columnMapping)
    .find(([, field]) => field === 'assigned_to')
    ?.[0]

  if (assignedColIndex === undefined) return

  const colIdx = Number(assignedColIndex)

  for (const row of rows) {
    const raw = row[colIdx]?.trim() ?? ''
    if (!raw) continue
    const resolved = resolutionMap[raw]
    // Substituir valor da célula pelo UUID ou marcador especial
    row[colIdx] = resolved ?? '__SKIP_ASSIGNEE__'
  }
}

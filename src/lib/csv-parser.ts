import Papa from 'papaparse'

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
  totalRows: number
  previewRows: string[][]
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const parseCsvFile = (file: File): Promise<ParsedCsv> => {
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error('Arquivo excede o limite de 10MB'))
  }

  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          reject(new Error(`Erro ao ler CSV: ${result.errors[0].message}`))
          return
        }

        const [headers, ...rows] = result.data
        if (!headers || headers.length === 0) {
          reject(new Error('Arquivo CSV vazio ou sem cabeçalho'))
          return
        }

        resolve({
          headers: headers.map((h) => h.trim()),
          rows,
          totalRows: rows.length,
          previewRows: rows.slice(0, 5),
        })
      },
      error: (err) => reject(new Error(`Erro ao ler CSV: ${err.message}`)),
    })
  })
}

const AUTO_MAP: Record<string, string> = {
  // pt-BR (formato Veltzy export)
  'nome': 'name',
  'telefone': 'phone',
  'email': 'email',
  'origem': 'source_id',
  'fase': 'stage_id',
  'temperatura': 'temperature',
  'valor': 'deal_value',
  'observacoes': 'observations',
  'observações': 'observations',
  'tags': 'tags',
  // Inglês
  'name': 'name',
  'phone': 'phone',
  'phone number': 'phone',
  'telephone': 'phone',
  'mobile': 'phone',
  'email address': 'email',
  'source': 'source_id',
  'stage': 'stage_id',
  'pipeline stage': 'stage_id',
  'temperature': 'temperature',
  'deal value': 'deal_value',
  'value': 'deal_value',
  'amount': 'deal_value',
  'notes': 'observations',
  'comments': 'observations',
  // HubSpot
  'first name': 'name',
  'contact name': 'name',
  // RD Station
  'nome completo': 'name',
  'celular': 'phone',
}

export type LeadField = 'name' | 'phone' | 'email' | 'source_id' | 'stage_id' | 'temperature' | 'deal_value' | 'observations' | 'tags'

export const LEAD_FIELD_LABELS: Record<LeadField, string> = {
  name: 'Nome',
  phone: 'Telefone',
  email: 'Email',
  source_id: 'Origem',
  stage_id: 'Fase',
  temperature: 'Temperatura',
  deal_value: 'Valor',
  observations: 'Observações',
  tags: 'Tags',
}

export const autoMapColumns = (headers: string[]): Record<number, LeadField | null> => {
  const mapping: Record<number, LeadField | null> = {}
  const usedFields = new Set<string>()

  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim()
    const field = AUTO_MAP[normalized] as LeadField | undefined
    if (field && !usedFields.has(field)) {
      mapping[index] = field
      usedFields.add(field)
    } else {
      mapping[index] = null
    }
  })

  return mapping
}

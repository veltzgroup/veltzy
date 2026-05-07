import * as XLSX from 'xlsx'
import type { LeadWithDetails } from '@/types/database'

const getLeadRows = (leads: LeadWithDetails[]) =>
  leads.map((l) => [
    l.name ?? '',
    l.phone,
    l.email ?? '',
    l.deal_value != null ? l.deal_value.toString() : '',
    l.pipelines?.name ?? '',
    l.pipeline_stages?.name ?? '',
    l.temperature,
    l.profiles?.name ?? '',
    (l.tags ?? []).join(', '),
    l.observations ?? '',
    l.lead_sources?.name ?? '',
    new Date(l.created_at).toLocaleDateString('pt-BR'),
    new Date(l.updated_at).toLocaleDateString('pt-BR'),
  ])

const EXPORT_HEADERS = ['Nome', 'Telefone', 'Email', 'Valor do Negocio', 'Pipeline', 'Etapa', 'Temperatura', 'Responsavel', 'Tags', 'Observações', 'Origem', 'Criado em', 'Atualizado em']

const TEMPLATE_HEADERS = ['Nome', 'Telefone', 'Email', 'Valor do Negocio', 'Pipeline', 'Etapa', 'Temperatura', 'Responsavel', 'Tags', 'Observações', 'Origem']

const TEMPLATE_EXAMPLE = [
  'João Silva',
  '11999887766',
  'joao@email.com',
  '1500',
  'Vendas',
  'Novo',
  'Quente',
  'Maria Souza',
  'vip, premium',
  'Lead veio do evento X',
  'WhatsApp',
]

export const downloadImportTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
  if (format === 'xlsx') {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE])
    const colWidths = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 18) }))
    ws['!cols'] = colWidths
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    XLSX.writeFile(wb, 'modelo-importacao-leads.xlsx')
  } else {
    const csvContent = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'modelo-importacao-leads.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
}

export const exportToXlsx = (leads: LeadWithDetails[], filename = 'leads.xlsx') => {
  const rows = getLeadRows(leads)
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leads')
  XLSX.writeFile(wb, filename)
}

export const exportToCsv = (leads: LeadWithDetails[], filename = 'leads.csv') => {
  const rows = getLeadRows(leads)

  const csvContent = [EXPORT_HEADERS, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const exportToPdf = async (leads: LeadWithDetails[], filename = 'leads.pdf') => {
  const jsPDFModule = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const jsPDF = jsPDFModule.default
  const autoTable = autoTableModule.default

  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(16)
  doc.text('Relatorio de Leads - Veltzy CRM', 14, 15)
  doc.setFontSize(10)
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22)
  doc.text(`Total: ${leads.length} leads`, 14, 28)

  const tableData = leads.map((l) => [
    l.name ?? l.phone,
    l.phone,
    l.email ?? '-',
    l.deal_value ? `R$ ${l.deal_value.toLocaleString('pt-BR')}` : '-',
    l.pipelines?.name ?? '-',
    l.pipeline_stages?.name ?? '-',
    l.temperature,
    l.profiles?.name ?? '-',
    (l.tags ?? []).join(', ') || '-',
    l.lead_sources?.name ?? '-',
    new Date(l.created_at).toLocaleDateString('pt-BR'),
  ])

  autoTable(doc, {
    startY: 34,
    head: [['Nome', 'Telefone', 'Email', 'Valor', 'Pipeline', 'Etapa', 'Temp.', 'Responsavel', 'Tags', 'Origem', 'Criado em']],
    body: tableData,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [34, 197, 94] },
  })

  doc.save(filename)
}

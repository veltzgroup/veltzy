import type { LeadWithDetails } from '@/types/database'

export const exportToCsv = (leads: LeadWithDetails[], filename = 'leads.csv') => {
  const headers = ['Nome', 'Telefone', 'Email', 'Origem', 'Fase', 'Temperatura', 'Score IA', 'Vendedor', 'Valor', 'Criado em']

  const rows = leads.map((l) => [
    l.name ?? '',
    l.phone,
    l.email ?? '',
    l.lead_sources?.name ?? '',
    l.pipeline_stages?.name ?? '',
    l.temperature,
    l.ai_score.toString(),
    l.profiles?.name ?? '',
    l.deal_value?.toString() ?? '',
    new Date(l.created_at).toLocaleDateString('pt-BR'),
  ])

  const csvContent = [headers, ...rows]
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
  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text('Relatorio de Leads - Veltzy CRM', 14, 15)
  doc.setFontSize(10)
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22)
  doc.text(`Total: ${leads.length} leads`, 14, 28)

  const tableData = leads.map((l) => [
    l.name ?? l.phone,
    l.phone,
    l.pipeline_stages?.name ?? '-',
    l.temperature,
    l.ai_score.toString(),
    l.deal_value ? `R$ ${l.deal_value.toLocaleString('pt-BR')}` : '-',
  ])

  ;(doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
    startY: 34,
    head: [['Nome', 'Telefone', 'Fase', 'Temp.', 'Score', 'Valor']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 197, 94] },
  })

  doc.save(filename)
}

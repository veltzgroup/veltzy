import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useLeads } from '@/hooks/use-leads'
import { exportToCsv, exportToPdf } from '@/lib/export-leads'
import type { LeadWithDetails } from '@/types/database'

const ReportsTab = () => {
  const { data: leads, isLoading } = useLeads()

  const handleCsv = () => {
    if (leads) exportToCsv(leads as LeadWithDetails[])
  }

  const handlePdf = () => {
    if (leads) exportToPdf(leads as LeadWithDetails[])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatorios</CardTitle>
        <CardDescription>Exporte dados dos seus leads</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCsv} disabled={isLoading || !leads?.length}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={handlePdf} disabled={isLoading || !leads?.length}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Exportar PDF
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {leads?.length ?? 0} leads serao exportados
        </p>
      </CardContent>
    </Card>
  )
}

export { ReportsTab }

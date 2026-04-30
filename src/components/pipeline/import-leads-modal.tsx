import { useState, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { UploadStep } from '@/components/pipeline/import-steps/upload-step'
import { MappingStep } from '@/components/pipeline/import-steps/mapping-step'
import { PreviewStep } from '@/components/pipeline/import-steps/preview-step'
import { ProgressStep } from '@/components/pipeline/import-steps/progress-step'
import { ResultStep } from '@/components/pipeline/import-steps/result-step'
import { useImportLeads, type ImportConfig } from '@/hooks/use-import-leads'
import type { ParsedCsv } from '@/lib/csv-parser'

type Step = 'upload' | 'mapping' | 'preview' | 'progress' | 'result'

const STEP_TITLES: Record<Step, string> = {
  upload: 'Importar leads via CSV',
  mapping: 'Mapear colunas',
  preview: 'Confirmar importação',
  progress: 'Importando...',
  result: 'Importação concluída',
}

interface ImportLeadsModalProps {
  open: boolean
  onClose: () => void
}

const ImportLeadsModal = ({ open, onClose }: ImportLeadsModalProps) => {
  const [step, setStep] = useState<Step>('upload')
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null)
  const [config, setConfig] = useState<ImportConfig | null>(null)
  const { execute, progress, result, isPending, reset } = useImportLeads()

  const handleClose = useCallback(() => {
    if (isPending) return
    setStep('upload')
    setParsedCsv(null)
    setConfig(null)
    reset()
    onClose()
  }, [isPending, onClose, reset])

  const handleUploadDone = (csv: ParsedCsv) => {
    setParsedCsv(csv)
    setStep('mapping')
  }

  const handleMappingDone = (importConfig: ImportConfig) => {
    setConfig(importConfig)
    setStep('preview')
  }

  const handleStartImport = async () => {
    if (!parsedCsv || !config) return
    setStep('progress')
    await execute(parsedCsv, config)
    setStep('result')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" onInteractOutside={(e) => isPending && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Selecione um arquivo CSV exportado de outro CRM ou planilha'}
            {step === 'mapping' && 'Associe as colunas do arquivo aos campos do lead'}
            {step === 'preview' && 'Verifique os dados antes de importar'}
            {step === 'progress' && 'Aguarde enquanto os leads sao importados'}
            {step === 'result' && 'Veja o resultado da importacao'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <UploadStep onNext={handleUploadDone} />
        )}

        {step === 'mapping' && parsedCsv && (
          <MappingStep
            headers={parsedCsv.headers}
            onNext={handleMappingDone}
            onBack={() => setStep('upload')}
          />
        )}

        {step === 'preview' && parsedCsv && config && (
          <PreviewStep
            parsedCsv={parsedCsv}
            config={config}
            onNext={handleStartImport}
            onBack={() => setStep('mapping')}
          />
        )}

        {step === 'progress' && (
          <ProgressStep progress={progress} />
        )}

        {step === 'result' && result && (
          <ResultStep result={result} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

export { ImportLeadsModal }

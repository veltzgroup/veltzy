import { Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { ImportProgress } from '@/hooks/use-import-leads'

interface ProgressStepProps {
  progress: ImportProgress
}

const ProgressStep = ({ progress }: ProgressStepProps) => {
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />

      <div className="w-full max-w-sm space-y-3">
        <Progress value={progress.current} max={progress.total} />
        <p className="text-sm text-center text-muted-foreground">
          {progress.phase === 'validating' && 'Validando dados...'}
          {progress.phase === 'importing' && `Importando ${progress.current} de ${progress.total} leads...`}
        </p>
        <p className="text-xs text-center text-muted-foreground">{percentage}%</p>
      </div>
    </div>
  )
}

export { ProgressStep }

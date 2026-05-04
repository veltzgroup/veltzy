import { cn } from '@/lib/utils'
import type { Pipeline } from '@/types/database'

interface PipelineSelectorProps {
  pipelines: Pipeline[]
  activePipelineId: string
  onSelect: (pipelineId: string) => void
}

const PipelineSelector = ({ pipelines, activePipelineId, onSelect }: PipelineSelectorProps) => {
  if (pipelines.length <= 1) return null

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {pipelines.map((p) => {
        const isActive = p.id === activePipelineId
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-smooth',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export { PipelineSelector }

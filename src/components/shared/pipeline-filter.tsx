import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Pipeline } from '@/types/database'

interface PipelineFilterProps {
  value: string | null
  onChange: (id: string | null) => void
  pipelines: Pipeline[]
}

const ALL_PIPELINES_VALUE = '__all__'

export const PipelineFilter = ({ value, onChange, pipelines }: PipelineFilterProps) => {
  const activePipelines = pipelines.filter((p) => p.is_active)

  if (activePipelines.length <= 1) return null

  return (
    <Select
      value={value ?? ALL_PIPELINES_VALUE}
      onValueChange={(v) => onChange(v === ALL_PIPELINES_VALUE ? null : v)}
    >
      <SelectTrigger className="w-[200px] h-9 text-sm bg-card border-border/40">
        <SelectValue placeholder="Pipeline" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_PIPELINES_VALUE}>
          Todos os pipelines
        </SelectItem>
        {activePipelines.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

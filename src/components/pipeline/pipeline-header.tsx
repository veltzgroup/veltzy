import { Search, Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { usePipelineStore } from '@/stores/pipeline.store'
import { useLeadSources } from '@/hooks/use-lead-sources'
import { useRoles } from '@/hooks/use-roles'
import type { LeadTemperature } from '@/types/database'
import { leadTemperatureConfig } from '@/lib/lead-config'

interface PipelineHeaderProps {
  onAddLead: () => void
  onManageStages: () => void
}

const PipelineHeader = ({ onAddLead, onManageStages }: PipelineHeaderProps) => {
  const { filters, setFilters } = usePipelineStore()
  const { data: sources } = useLeadSources()
  const { isAdmin, isManager } = useRoles()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold">Pipeline</h1>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="h-9 w-48 pl-8"
          />
        </div>

        <Select
          value={filters.sourceId ?? 'all'}
          onValueChange={(v) => setFilters({ sourceId: v === 'all' ? null : v })}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            {sources?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.temperature ?? 'all'}
          onValueChange={(v) => setFilters({ temperature: v === 'all' ? null : v as LeadTemperature })}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Temperatura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas temps.</SelectItem>
            {(Object.keys(leadTemperatureConfig) as LeadTemperature[]).map((t) => (
              <SelectItem key={t} value={t}>
                {leadTemperatureConfig[t].emoji} {leadTemperatureConfig[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(isAdmin || isManager) && (
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onManageStages} title="Gerenciar fases">
            <Settings2 className="h-4 w-4" />
          </Button>
        )}

        <Button size="sm" className="h-9" onClick={onAddLead}>
          <Plus className="mr-1 h-4 w-4" />
          Novo Lead
        </Button>
      </div>
    </div>
  )
}

export { PipelineHeader }

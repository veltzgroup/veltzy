import { StageManagerInline } from '@/components/admin/stage-manager-inline'
import { LeadSourcesManager } from '@/components/admin/lead-sources-manager'

const PipelineTab = () => {
  return (
    <div className="space-y-6">
      <StageManagerInline />
      <LeadSourcesManager />
    </div>
  )
}

export { PipelineTab }

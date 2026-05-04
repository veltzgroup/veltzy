import { Building2, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { logAuditEvent } from '@/lib/audit'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CompanySelector = () => {
  const { companies, activeCompanyId, switchCompany, roles } = useAuthStore()
  const isRepresentative = roles.includes('representative') &&
    !roles.includes('admin') && !roles.includes('manager')

  if (companies.length <= 1 && !isRepresentative) return null

  const handleSwitch = (companyId: string) => {
    const prev = activeCompanyId
    switchCompany(companyId)
    logAuditEvent('company_switched', {
      from_company_id: prev,
      to_company_id: companyId,
    }, companyId)
  }

  return (
    <Select value={activeCompanyId ?? ''} onValueChange={handleSwitch}>
      <SelectTrigger className="w-full gap-2">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Selecione a empresa" />
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name} ({c.role})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { CompanySelector }

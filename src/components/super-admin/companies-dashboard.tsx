import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAllCompanies, useImpersonation } from '@/hooks/use-super-admin'
import { toggleCompanyActive } from '@/services/super-admin.service'
import { useQueryClient } from '@tanstack/react-query'
import { timeAgo } from '@/lib/time'
import type { Company } from '@/types/database'

const CompaniesDashboard = () => {
  const { data: companies, isLoading } = useAllCompanies()
  const { impersonate } = useImpersonation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const filtered = companies?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase())
  )

  const handleToggle = async (c: Company) => {
    await toggleCompanyActive(c.id, !c.is_active)
    queryClient.invalidateQueries({ queryKey: ['all-companies'] })
  }

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="pb-2 text-left font-medium">Empresa</th>
              <th className="pb-2 text-left font-medium">Slug</th>
              <th className="pb-2 text-center font-medium">Status</th>
              <th className="pb-2 text-right font-medium">Criada</th>
              <th className="pb-2 text-right font-medium">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((c) => (
              <tr key={c.id} className="border-b border-border/20 hover:bg-muted/30 transition-smooth">
                <td className="py-2.5 font-medium">{c.name}</td>
                <td className="py-2.5 text-muted-foreground">{c.slug}</td>
                <td className="py-2.5 text-center">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', c.is_active ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>
                    {c.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="py-2.5 text-right text-muted-foreground">{timeAgo(c.created_at)}</td>
                <td className="py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => impersonate(c)}>
                      Impersonar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => handleToggle(c)}>
                      {c.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { CompaniesDashboard }

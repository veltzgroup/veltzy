import { useState } from 'react'
import { Plus, Trash2, MessageCircle, UserPlus, Globe, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ColorPicker } from '@/components/shared/color-picker'
import { veltzy } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { getAllLeadSources } from '@/services/lead-sources.service'

const sourceIconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  instagram: Camera,
  whatsapp: MessageCircle,
  manual: UserPlus,
}

const getSourceIcon = (slug: string) => sourceIconMap[slug] ?? Globe

const LeadSourcesManager = () => {
  const companyId = useAuthStore((s) => s.company?.id)
  const queryClient = useQueryClient()

  const { data: sources, isLoading } = useQuery({
    queryKey: ['lead-sources-all', companyId],
    queryFn: () => getAllLeadSources(companyId!),
    enabled: !!companyId,
  })

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['lead-sources'] })
    queryClient.invalidateQueries({ queryKey: ['lead-sources-all'] })
  }

  const handleAdd = async () => {
    if (!newName.trim() || !companyId) return
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { error } = await veltzy().from('lead_sources').insert({
      company_id: companyId, name: newName, slug, color: newColor, icon_name: 'Globe',
    })
    if (error) { toast.error(error.message); return }
    invalidate()
    setNewName('')
    toast.success('Origem criada!')
  }

  const toggleActive = async (id: string, active: boolean) => {
    await veltzy().from('lead_sources').update({ is_active: active }).eq('id', id)
    invalidate()
  }

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) { toast.error('Origens do sistema não podem ser removidas'); return }
    if (!confirm('Remover esta origem?')) return
    await veltzy().from('lead_sources').delete().eq('id', id)
    invalidate()
    toast.success('Origem removida!')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Origens de Lead</CardTitle>
        <CardDescription>Gerencie as origens de captura de leads</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {sources?.map((s) => {
          const Icon = getSourceIcon(s.slug)
          return (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border/30 p-3">
              <Icon className="h-4 w-4 shrink-0" style={{ color: s.color }} />
              <span className="text-sm font-medium flex-1">{s.name}</span>
              {s.is_system && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Sistema</span>}
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={s.is_active} onChange={() => toggleActive(s.id, !s.is_active)} />
                <div className="peer h-4 w-7 rounded-full bg-muted-foreground/40 after:absolute after:left-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-3" />
              </label>
              {!s.is_system && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(s.id, s.is_system)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )
        })}

        <div className="flex items-center gap-2 pt-2 border-t">
          <ColorPicker value={newColor} onChange={setNewColor} />
          <Input placeholder="Nova origem..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className="h-8 flex-1" />
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}><Plus className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { LeadSourcesManager }

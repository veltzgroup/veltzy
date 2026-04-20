import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useLeadSources } from '@/hooks/use-lead-sources'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useQueryClient } from '@tanstack/react-query'

const LeadSourcesManager = () => {
  const { data: sources, isLoading } = useLeadSources()
  const companyId = useAuthStore((s) => s.company?.id)
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6B7280')

  const handleAdd = async () => {
    if (!newName.trim() || !companyId) return
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { error } = await supabase.from('lead_sources').insert({ company_id: companyId, name: newName, slug, color: newColor, icon_name: 'Globe' })
    if (error) { toast.error(error.message); return }
    queryClient.invalidateQueries({ queryKey: ['lead-sources'] })
    setNewName('')
    toast.success('Origem criada!')
  }

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('lead_sources').update({ is_active: active }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['lead-sources'] })
  }

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) { toast.error('Origens do sistema nao podem ser removidas'); return }
    if (!confirm('Remover esta origem?')) return
    await supabase.from('lead_sources').delete().eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['lead-sources'] })
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

        {sources?.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border/30 p-3">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-sm font-medium flex-1">{s.name}</span>
            {s.is_system && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Sistema</span>}
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={s.is_active} onChange={() => toggleActive(s.id, !s.is_active)} />
              <div className="peer h-4 w-7 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-3" />
            </label>
            {!s.is_system && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(s.id, s.is_system)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2 border-t">
          <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded border-0" />
          <Input placeholder="Nova origem..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className="h-8 flex-1" />
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}><Plus className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { LeadSourcesManager }

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'
import { useThemeConfig } from '@/hooks/use-theme-config'
import { supabase, supabasePublic } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

const swatches = [
  { label: 'Veltzy', hsl: '158 64% 42%', hex: '#22a06b' },
  { label: 'Azul', hsl: '217 91% 60%', hex: '#3b82f6' },
  { label: 'Roxo', hsl: '271 81% 56%', hex: '#8b5cf6' },
  { label: 'Laranja', hsl: '25 95% 53%', hex: '#f97316' },
  { label: 'Rosa', hsl: '330 81% 60%', hex: '#ec4899' },
  { label: 'Vermelho', hsl: '0 72% 51%', hex: '#ef4444' },
]

const cardStyles = [
  { id: 'flat', label: 'Plano' },
  { id: 'elevated', label: 'Elevado' },
  { id: 'glass', label: 'Glass' },
]

const sidebarStyles = [
  { id: 'solid', label: 'Solido' },
  { id: 'glass', label: 'Glass' },
]

const ThemeCustomizer = () => {
  const company = useAuthStore((s) => s.company)
  const companyId = company?.id
  const { theme, setTheme } = useThemeConfig()
  const queryClient = useQueryClient()

  const [primaryHsl, setPrimaryHsl] = useState(company?.primary_color ?? '158 64% 42%')
  const [primaryHex, setPrimaryHex] = useState('#22a06b')
  const [cardStyle, setCardStyle] = useState('glass')
  const [sidebarStyle, setSidebarStyle] = useState('solid')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const match = swatches.find((s) => s.hsl === primaryHsl)
    if (match) setPrimaryHex(match.hex)
  }, [primaryHsl])

  const applyPreview = (hsl: string) => {
    setPrimaryHsl(hsl)
    document.documentElement.style.setProperty('--primary', hsl)
    document.documentElement.style.setProperty('--ring', hsl)
  }

  const handleSave = async () => {
    if (!companyId) return
    setSaving(true)
    try {
      await supabasePublic.from('companies').update({ primary_color: primaryHsl }).eq('id', companyId)
      await supabase.from('system_settings').upsert(
        { company_id: companyId, key: 'theme_config', value: { card_style: cardStyle, sidebar_style: sidebarStyle } },
        { onConflict: 'company_id,key' }
      )
      queryClient.invalidateQueries({ queryKey: ['company'] })
      toast.success('Tema salvo!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    applyPreview('158 64% 42%')
    setCardStyle('glass')
    setSidebarStyle('solid')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparencia</CardTitle>
        <CardDescription>Personalize o visual da sua empresa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Modo do Tema</Label>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'sand'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  'rounded-xl border-2 p-4 text-center text-sm font-medium transition-smooth',
                  theme === t ? 'border-primary bg-primary/5' : 'border-border/30 hover:border-border'
                )}
              >
                {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Areia'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Cor Primaria</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryHex}
              onChange={(e) => {
                setPrimaryHex(e.target.value)
                const match = swatches.find((s) => s.hex === e.target.value)
                if (match) applyPreview(match.hsl)
              }}
              className="h-10 w-10 cursor-pointer rounded-lg border-0"
            />
            <Input value={primaryHex} onChange={(e) => setPrimaryHex(e.target.value)} className="w-28 text-xs" />
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: `hsl(${primaryHsl})` }}
            />
          </div>
          <div className="flex gap-2">
            {swatches.map((s) => (
              <button
                key={s.hsl}
                onClick={() => { applyPreview(s.hsl); setPrimaryHex(s.hex) }}
                className={cn(
                  'h-10 w-10 rounded-lg ring-2 transition-smooth',
                  primaryHsl === s.hsl ? 'ring-foreground' : 'ring-transparent hover:ring-border'
                )}
                style={{ backgroundColor: s.hex }}
                title={s.label}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Estilo dos Cards</Label>
          <div className="flex gap-2">
            {cardStyles.map((s) => (
              <button
                key={s.id}
                onClick={() => setCardStyle(s.id)}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm transition-smooth',
                  cardStyle === s.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border/30 text-muted-foreground hover:text-foreground'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Estilo da Sidebar</Label>
          <div className="flex gap-2">
            {sidebarStyles.map((s) => (
              <button
                key={s.id}
                onClick={() => setSidebarStyle(s.id)}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm transition-smooth',
                  sidebarStyle === s.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border/30 text-muted-foreground hover:text-foreground'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restaurar Padrao
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Tema
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { ThemeCustomizer }

import { useState } from 'react'
import { AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useTeamMembers } from '@/hooks/use-team'
import type { AssigneeResolution } from '@/services/resolve-assignees.service'

interface ConfirmAssigneesStepProps {
  resolutions: AssigneeResolution[]
  onConfirm: (resolved: AssigneeResolution[]) => void
  onBack: () => void
}

type Decision = 'accept' | 'choose' | 'skip'

const ConfirmAssigneesStep = ({ resolutions, onConfirm, onBack }: ConfirmAssigneesStepProps) => {
  const { data: members } = useTeamMembers()
  const [decisions, setDecisions] = useState<Record<string, { decision: Decision; userId: string | null }>>(() => {
    const initial: Record<string, { decision: Decision; userId: string | null }> = {}
    for (const r of resolutions) {
      if (r.matchType === 'exact') {
        initial[r.originalValue] = { decision: 'accept', userId: r.resolvedUserId }
      }
    }
    return initial
  })

  const pendingItems = resolutions.filter((r) => r.matchType !== 'exact')
  const allDecided = pendingItems.every((r) => decisions[r.originalValue] !== undefined)

  const setDecision = (originalValue: string, decision: Decision, userId: string | null) => {
    setDecisions((prev) => ({ ...prev, [originalValue]: { decision, userId } }))
  }

  const handleConfirm = () => {
    const resolved = resolutions.map((r) => {
      const d = decisions[r.originalValue]
      if (!d) return { ...r, decision: 'skip' as const, resolvedUserId: null }
      return { ...r, decision: d.decision, resolvedUserId: d.userId }
    })
    onConfirm(resolved)
  }

  return (
    <div className="space-y-4 overflow-y-auto min-h-0">
      <div className="space-y-1">
        <p className="text-sm font-medium">Confirmar responsaveis</p>
        <p className="text-xs text-muted-foreground">
          Encontramos inconsistencias nos nomes de responsaveis. Confirme antes de importar.
        </p>
      </div>

      <div className="max-h-[340px] overflow-y-auto space-y-3 pr-1 scrollbar-minimal">
        {resolutions.map((r) => {
          const d = decisions[r.originalValue]
          const isExact = r.matchType === 'exact'

          if (isExact) {
            return (
              <div key={r.originalValue} className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    <span className="font-medium">{r.originalValue}</span>
                    <span className="text-muted-foreground"> → {r.suggestedMember?.name}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">{r.affectedRows} linha{r.affectedRows > 1 ? 's' : ''}</p>
                </div>
              </div>
            )
          }

          const isApprox = r.matchType === 'approximate'

          return (
            <div key={r.originalValue} className="rounded-lg border px-3 py-3 space-y-2">
              <div className="flex items-start gap-2">
                {isApprox ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">"{r.originalValue}"</span>
                    <span className="text-muted-foreground text-xs ml-1">({r.affectedRows} linha{r.affectedRows > 1 ? 's' : ''})</span>
                  </p>
                  {isApprox && r.suggestedMember && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Voce quis dizer <span className="font-medium text-foreground">{r.suggestedMember.name}</span>?
                    </p>
                  )}
                  {!isApprox && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Nenhum vendedor encontrado.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 ml-6">
                {isApprox && r.suggestedMember && (
                  <Button
                    variant={d?.decision === 'accept' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDecision(r.originalValue, 'accept', r.suggestedMember?.id ?? null)}
                  >
                    Sim, e esse
                  </Button>
                )}
                <Select
                  value={d?.decision === 'choose' ? (d.userId ?? '') : ''}
                  onValueChange={(v) => setDecision(r.originalValue, 'choose', v)}
                >
                  <SelectTrigger className={`h-7 text-xs w-auto min-w-[140px] ${d?.decision === 'choose' ? 'border-primary' : ''}`}>
                    <SelectValue placeholder="Escolher outro" />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={d?.decision === 'skip' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setDecision(r.originalValue, 'skip', null)}
                >
                  Sem responsavel
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between border-t pt-3">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={handleConfirm} disabled={!allDecided}>
          Confirmar e importar
        </Button>
      </div>
    </div>
  )
}

export { ConfirmAssigneesStep }

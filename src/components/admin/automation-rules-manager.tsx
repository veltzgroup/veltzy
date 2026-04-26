import { useState } from 'react'
import { Plus, Trash2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAutomationRules, useToggleRule, useDeleteRule } from '@/hooks/use-automation-rules'
import { AutomationRuleModal } from '@/components/admin/automation-rule-modal'
import { AutomationLogsDrawer } from '@/components/admin/automation-logs-drawer'
import type { AutomationRule } from '@/types/database'

const triggerLabels: Record<string, string> = {
  lead_created: 'Lead criado',
  lead_stage_changed: 'Fase alterada',
  lead_temperature_changed: 'Temperatura alterada',
  message_received: 'Mensagem recebida',
  no_response: 'Sem resposta',
  deal_closed: 'Negocio fechado',
  lead_lost: 'Lead perdido',
}

const actionLabels: Record<string, string> = {
  send_message: 'Enviar mensagem',
  change_stage: 'Mudar fase',
  assign_lead: 'Atribuir lead',
  add_tag: 'Adicionar tag',
  remove_tag: 'Remover tag',
  update_temperature: 'Alterar temperatura',
  send_webhook: 'Enviar webhook',
  notify_team: 'Notificar equipe',
}

const AutomationRulesManager = () => {
  const { data: rules, isLoading } = useAutomationRules()
  const toggleRule = useToggleRule()
  const deleteRule = useDeleteRule()
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Automacoes</CardTitle>
            <CardDescription>Regras automaticas para o fluxo de leads</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLogsOpen(true)}>
              <History className="mr-1 h-4 w-4" />
              Logs
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Nova Regra
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground py-4">Carregando...</p>}

        {!isLoading && rules?.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma regra criada</p>
        )}

        <div className="space-y-2">
          {rules?.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/50 transition-smooth cursor-pointer"
              onClick={() => setEditingRule(rule)}
            >
              <label className="relative inline-flex cursor-pointer items-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={rule.is_enabled}
                  onChange={() => toggleRule.mutate({ id: rule.id, enabled: !rule.is_enabled })}
                />
                <div className="peer h-5 w-9 rounded-full bg-muted-foreground/40 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
              </label>

              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', !rule.is_enabled && 'opacity-50')}>{rule.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-500">
                    {triggerLabels[rule.trigger_type] ?? rule.trigger_type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">→</span>
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-500">
                    {actionLabels[rule.action_type] ?? rule.action_type}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Remover regra "${rule.name}"?`)) deleteRule.mutate(rule.id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      <AutomationRuleModal
        rule={editingRule}
        open={!!editingRule || createOpen}
        onClose={() => { setEditingRule(null); setCreateOpen(false) }}
      />

      <AutomationLogsDrawer open={logsOpen} onClose={() => setLogsOpen(false)} />
    </Card>
  )
}

export { AutomationRulesManager }

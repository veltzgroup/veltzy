import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ConversationItem } from '@/components/inbox/conversation-item'
import { useConversationList } from '@/hooks/use-conversation-list'
import { useInboxStore } from '@/stores/inbox.store'

const ConversationList = () => {
  const { data: conversations, isLoading } = useConversationList()
  const { selectedLeadId, setSelectedLeadId, filters, setFilters } = useInboxStore()

  return (
    <div className="flex h-full flex-col border-r bg-muted/20">
      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="h-9 pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters({ status: v as typeof filters.status })}
          >
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unread">Nao lidas</SelectItem>
              <SelectItem value="replied">Respondidas</SelectItem>
              <SelectItem value="waiting_client">Aguardando cliente</SelectItem>
              <SelectItem value="resolved">Resolvidas</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.assignedTo}
            onValueChange={(v) => setFilters({ assignedTo: v })}
          >
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="mine">Meus leads</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && conversations?.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
          </div>
        )}

        {conversations?.map((lead) => (
          <ConversationItem
            key={lead.id}
            lead={lead}
            isSelected={lead.id === selectedLeadId}
            onClick={() => setSelectedLeadId(lead.id)}
          />
        ))}
      </div>
    </div>
  )
}

export { ConversationList }

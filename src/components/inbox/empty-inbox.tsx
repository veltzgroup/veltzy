import { MessageSquare } from 'lucide-react'

const EmptyInbox = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <MessageSquare className="h-8 w-8" />
      </div>
      <p className="text-sm">Selecione uma conversa para comecar</p>
    </div>
  )
}

export { EmptyInbox }

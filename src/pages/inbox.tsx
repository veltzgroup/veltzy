import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConversationList } from '@/components/inbox/conversation-list'
import { ChatWindow } from '@/components/inbox/chat-window'
import { EmptyInbox } from '@/components/inbox/empty-inbox'
import { useConversationList } from '@/hooks/use-conversation-list'
import { useInboxStore } from '@/stores/inbox.store'

const InboxPage = () => {
  const [searchParams] = useSearchParams()
  const { selectedLeadId, setSelectedLeadId } = useInboxStore()
  const { data: conversations } = useConversationList()

  useEffect(() => {
    const leadParam = searchParams.get('lead')
    if (leadParam) {
      setSelectedLeadId(leadParam)
    }
  }, [searchParams, setSelectedLeadId])

  const selectedLead = conversations?.find((l) => l.id === selectedLeadId) ?? null

  return (
    <div className="flex h-full">
      <div className="w-[340px] min-w-[300px] shrink-0">
        <ConversationList />
      </div>
      <div className="flex-1 min-w-0">
        {selectedLead ? (
          <ChatWindow lead={selectedLead} />
        ) : (
          <EmptyInbox />
        )}
      </div>
    </div>
  )
}

export default InboxPage

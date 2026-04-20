import { supabase } from '@/lib/supabase'
import type { Message, SendMessagePayload, LeadWithLastMessage } from '@/types/database'

export const getMessages = async (leadId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const sendMessage = async (companyId: string, payload: SendMessagePayload): Promise<Message> => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      lead_id: payload.leadId,
      company_id: companyId,
      content: payload.content,
      sender_type: 'human',
      message_type: payload.messageType ?? 'text',
      file_url: payload.fileUrl ?? null,
      file_name: payload.fileName ?? null,
      file_mime_type: payload.mimeType ?? null,
      source: 'manual',
      replied_message_id: payload.repliedMessageId ?? null,
    })
    .select()
    .single()
  if (error) throw error

  await supabase
    .from('leads')
    .update({ conversation_status: 'replied' })
    .eq('id', payload.leadId)

  return data
}

export const markAsRead = async (leadId: string): Promise<void> => {
  const { error } = await supabase
    .from('leads')
    .update({ conversation_status: 'read' })
    .eq('id', leadId)
  if (error) throw error
}

export const getConversationList = async (companyId: string): Promise<LeadWithLastMessage[]> => {
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      profiles:assigned_to(id, name, email),
      lead_sources:source_id(*)
    `)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
  if (error) throw error

  const leadsWithMessages = await Promise.all(
    (leads ?? []).map(async (lead) => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, sender_type, created_at, message_type')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('lead_id', lead.id)
        .eq('sender_type', 'lead')
        .eq('is_read', false)

      return {
        ...lead,
        last_message: lastMsg ?? null,
        unread_count: count ?? 0,
      } as LeadWithLastMessage
    })
  )

  return leadsWithMessages.sort((a, b) => {
    const aTime = a.last_message?.created_at ?? a.updated_at
    const bTime = b.last_message?.created_at ?? b.updated_at
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  })
}

import { supabase, supabasePublic } from '@/lib/supabase'
import type { SupportTicket, TicketStatus } from '@/types/database'

export const createTicket = async (input: {
  title: string
  description: string
  priority?: string
  error_message?: string
  page_url?: string
  user_agent?: string
}): Promise<SupportTicket> => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabasePublic.from('profiles').select('company_id').eq('user_id', user!.id).single()

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      ...input,
      company_id: profile?.company_id,
      user_id: user!.id,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export const getTickets = async (companyId?: string): Promise<SupportTicket[]> => {
  let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
  if (companyId) query = query.eq('company_id', companyId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const updateTicketStatus = async (id: string, status: TicketStatus): Promise<SupportTicket> => {
  const updates: Record<string, unknown> = { status }
  if (status === 'resolved') updates.resolved_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const getAllTickets = async (): Promise<SupportTicket[]> => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

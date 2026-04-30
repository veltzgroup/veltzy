import { useState, useRef, useCallback } from 'react'
import { SendHorizonal, Paperclip, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ReplyTemplatesPopover } from '@/components/inbox/reply-templates-popover'
import { AudioRecorder } from '@/components/inbox/audio-recorder'
import { useSendMessage, useWhatsAppConnected } from '@/hooks/use-messages'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

interface ChatInputProps {
  leadId: string
  onTyping?: () => void
}

const ChatInput = ({ leadId, onTyping }: ChatInputProps) => {
  const [content, setContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendMessage = useSendMessage()
  const { data: whatsAppConnected } = useWhatsAppConnected()
  const companyId = useAuthStore((s) => s.company?.id)

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  const handleSend = async () => {
    const text = content.trim()
    if (!text || sendMessage.isPending) return

    setContent('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    await sendMessage.mutateAsync({ leadId, content: text })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !companyId) return

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Arquivo muito grande (max 25MB)')
      return
    }

    setUploading(true)
    try {
      const path = `${companyId}/${leadId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(path, 3600)
      if (signedUrlError) throw signedUrlError
      const fileUrl = signedUrlData.signedUrl
      console.log('[chat-input] file_url gerado:', fileUrl)

      const messageType = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('audio/') ? 'audio'
        : file.type.startsWith('video/') ? 'video'
        : 'document'

      await sendMessage.mutateAsync({
        leadId,
        content: file.name,
        messageType,
        fileUrl,
        fileName: file.name,
        mimeType: file.type,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar arquivo'
      toast.error(msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="border-t bg-background p-3">
      <div className="relative flex items-end gap-2">
        {!isRecording && (
          <>
            <div className="relative">
              <ReplyTemplatesPopover onSelect={(t) => { setContent(t); textareaRef.current?.focus() }} />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileUpload}
            />
          </>
        )}

        <AudioRecorder leadId={leadId} onRecordingChange={setIsRecording} />

        {!isRecording && (
          <>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                adjustHeight()
                onTyping?.()
              }}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring input-clean"
            />

            <button
              onClick={handleSend}
              disabled={!content.trim() || sendMessage.isPending}
              title={whatsAppConnected === false ? 'WhatsApp nao conectado - mensagem sera salva como manual' : undefined}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-150 hover:bg-primary/90 disabled:cursor-not-allowed"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export { ChatInput }

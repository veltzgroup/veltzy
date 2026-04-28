import { AudioLines } from 'lucide-react'

interface AudioBubbleProps {
  fileUrl: string
  transcription: string | null
}

const AudioBubble = ({ fileUrl, transcription }: AudioBubbleProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AudioLines className="h-4 w-4 shrink-0 text-muted-foreground" />
        <audio controls src={fileUrl} className="h-8 flex-1 max-w-[240px]" />
      </div>

      <div className="border-t border-border/20 pt-1.5 relative">
        {transcription ? (
          <>
            <p className="text-sm italic opacity-80 pr-10">{transcription}</p>
            <span className="absolute bottom-0 right-0 text-[9px] text-muted-foreground/60">
              IA
            </span>
          </>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">Transcricao indisponivel</p>
        )}
      </div>
    </div>
  )
}

export { AudioBubble }

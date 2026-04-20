import { useState } from 'react'
import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react'
import type { AdContext } from '@/types/database'

interface AdContextCardProps {
  adContext: AdContext
}

const AdContextCard = ({ adContext }: AdContextCardProps) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="mx-4 mt-2 rounded-lg border border-border/50 bg-accent/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-smooth"
      >
        <Megaphone className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Lead veio de anuncio Meta Ads</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="border-t border-border/30 px-3 py-2 space-y-1 text-xs">
          {adContext.ad_title && <p><span className="text-muted-foreground">Titulo:</span> {adContext.ad_title}</p>}
          {adContext.ad_body && <p><span className="text-muted-foreground">Texto:</span> {adContext.ad_body}</p>}
          {adContext.source_url && (
            <p>
              <span className="text-muted-foreground">Link:</span>{' '}
              <a href={adContext.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {adContext.source_url}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export { AdContextCard }

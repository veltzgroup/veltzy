import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

const PALETTE = [
  '#6366f1', '#a855f7', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#14b8a6', '#06b6d4', '#3b82f6', '#64748b',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="h-4 w-4 rounded-full shrink-0 cursor-pointer ring-1 ring-border/50 transition-smooth hover:ring-border"
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-4 gap-1.5">
          {PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => { onChange(color); setOpen(false) }}
              className={cn(
                'h-6 w-6 rounded-full transition-smooth',
                value === color ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'hover:ring-2 hover:ring-border'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { ColorPicker, PALETTE }

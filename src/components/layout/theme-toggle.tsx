import { useState } from 'react'
import { Sun, Moon, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeConfig } from '@/hooks/use-theme-config'

const icons = {
  light: Sun,
  dark: Moon,
  sand: Palette,
}

const ThemeToggle = () => {
  const { theme, cycleTheme } = useThemeConfig()
  const [current, setCurrent] = useState(theme)

  const handleClick = () => {
    const next = cycleTheme()
    setCurrent(next)
  }

  const Icon = icons[current]

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} title={`Tema: ${current}`}>
      <Icon className="h-4 w-4" />
    </Button>
  )
}

export { ThemeToggle }

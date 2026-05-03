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
  const Icon = icons[theme]

  return (
    <Button variant="ghost" size="icon" onClick={() => cycleTheme()} title={`Tema: ${theme}`}>
      <Icon className="h-4 w-4" />
    </Button>
  )
}

export { ThemeToggle }

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'

type Theme = 'light' | 'dark' | 'sand'

const THEME_KEY = 'veltzy-theme'
const THEME_CHANGE_EVENT = 'veltzy-theme-change'

const applyTheme = (theme: Theme) => {
  const root = document.documentElement
  root.classList.remove('dark', 'sand')
  if (theme !== 'light') {
    root.classList.add(theme)
  }
}

function ensureContrastOnDark(hslColor: string, isDark: boolean): string {
  if (!isDark) return hslColor
  const match = hslColor.match(/(\d+)\s+(\d+)%?\s+(\d+)%?/)
  if (!match) return hslColor
  const [, h, s, l] = match.map(Number)
  if (l < 20) return `${h} ${s}% 55%`
  return hslColor
}

function deriveAccentColors(hslColor: string, isDark: boolean): { accent: string; accentForeground: string } {
  const match = hslColor.match(/(\d+)\s+(\d+)%?\s+(\d+)%?/)
  if (!match) return { accent: hslColor, accentForeground: hslColor }
  const [, h, s] = match.map(Number)
  if (isDark) {
    return {
      accent: `${h} ${Math.round(s * 0.1)}% 16%`,
      accentForeground: `${h} ${s}% 58%`,
    }
  }
  return {
    accent: `${h} ${Math.round(s * 0.6)}% 94%`,
    accentForeground: `${h} ${s}% 32%`,
  }
}

const applyCompanyColors = (primaryColor?: string, secondaryColor?: string) => {
  const root = document.documentElement
  const isDark = root.classList.contains('dark')
  if (primaryColor) {
    const adjusted = ensureContrastOnDark(primaryColor, isDark)
    root.style.setProperty('--primary', adjusted)
    root.style.setProperty('--ring', adjusted)
    root.style.setProperty('--sidebar-primary', adjusted)
    root.style.setProperty('--glow-primary', adjusted)

    const { accent, accentForeground } = deriveAccentColors(primaryColor, isDark)
    root.style.setProperty('--accent-foreground', accentForeground)
    if (!root.classList.contains('sand')) {
      root.style.setProperty('--accent', accent)
    }
  }
  if (secondaryColor) {
    root.style.setProperty('--secondary', secondaryColor)
  }
}

const readTheme = (): Theme => (localStorage.getItem(THEME_KEY) as Theme) || 'dark'

export const useThemeConfig = () => {
  const company = useAuthStore((s) => s.company)
  const [theme, setThemeState] = useState<Theme>(readTheme)

  useEffect(() => {
    const handler = () => setThemeState(readTheme())
    window.addEventListener(THEME_CHANGE_EVENT, handler)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handler)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(THEME_KEY, next)
    applyTheme(next)
    if (company) {
      applyCompanyColors(company.primary_color, company.secondary_color)
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }, [company])

  const cycleTheme = useCallback(() => {
    const current = readTheme()
    const themes: Theme[] = ['light', 'dark', 'sand']
    const next = themes[(themes.indexOf(current) + 1) % themes.length]
    setTheme(next)
    return next
  }, [setTheme])

  useEffect(() => {
    applyTheme(readTheme())
  }, [])

  useEffect(() => {
    if (company) {
      applyCompanyColors(company.primary_color, company.secondary_color)
    }
  }, [company])

  return { theme, setTheme, cycleTheme }
}

import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'

type Theme = 'light' | 'dark' | 'sand'

const THEME_KEY = 'veltzy-theme'

const applyTheme = (theme: Theme) => {
  const root = document.documentElement
  root.classList.remove('dark', 'sand')
  if (theme !== 'light') {
    root.classList.add(theme)
  }
}

const applyCompanyColors = (primaryColor?: string, secondaryColor?: string) => {
  const root = document.documentElement
  if (primaryColor) {
    root.style.setProperty('--primary', primaryColor)
    root.style.setProperty('--ring', primaryColor)
    root.style.setProperty('--sidebar-primary', primaryColor)
    root.style.setProperty('--glow-primary', primaryColor)
  }
  if (secondaryColor) {
    root.style.setProperty('--secondary', secondaryColor)
  }
}

export const useThemeConfig = () => {
  const company = useAuthStore((s) => s.company)

  const getTheme = useCallback((): Theme => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'dark'
  }, [])

  const setTheme = useCallback((theme: Theme) => {
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)
  }, [])

  const cycleTheme = useCallback(() => {
    const current = getTheme()
    const themes: Theme[] = ['light', 'dark', 'sand']
    const next = themes[(themes.indexOf(current) + 1) % themes.length]
    setTheme(next)
    return next
  }, [getTheme, setTheme])

  useEffect(() => {
    applyTheme(getTheme())
  }, [getTheme])

  useEffect(() => {
    if (company) {
      applyCompanyColors(company.primary_color, company.secondary_color)
    }
  }, [company])

  return {
    theme: getTheme(),
    setTheme,
    cycleTheme,
  }
}

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_UI_THEME,
  readPreferences,
  resolveUiTheme,
  writePreferences,
  type UiThemeMode,
} from '@/lib/app-preferences'

interface ThemeContextValue {
  uiTheme: UiThemeMode
  resolvedTheme: 'light' | 'dark'
  setUiTheme: (mode: UiThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [uiTheme, setUiThemeState] = useState<UiThemeMode>(DEFAULT_UI_THEME)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const prefs = readPreferences()
    setUiThemeState(prefs.uiTheme)
    setResolvedTheme(resolveUiTheme(prefs.uiTheme))
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }
    const resolved = resolveUiTheme(uiTheme)
    setResolvedTheme(resolved)
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
    writePreferences({ uiTheme })
  }, [mounted, uiTheme])

  useEffect(() => {
    if (!mounted || uiTheme !== 'system') {
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const resolved = resolveUiTheme('system')
      setResolvedTheme(resolved)
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mounted, uiTheme])

  const setUiTheme = useCallback((mode: UiThemeMode) => {
    setUiThemeState(mode)
  }, [])

  const value = useMemo(
    () => ({
      resolvedTheme,
      setUiTheme,
      uiTheme,
    }),
    [resolvedTheme, setUiTheme, uiTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider')
  }
  return ctx
}

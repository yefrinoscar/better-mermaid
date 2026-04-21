'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  APP_APPEARANCE_STORAGE_KEY,
  APP_STYLE_STORAGE_KEY,
  DEFAULT_APP_APPEARANCE,
  DEFAULT_APP_STYLE,
  getThemeColor,
  isAppAppearance,
  isAppStyleName,
  LEGACY_APP_STYLE_STORAGE_KEY,
  resolveAppearance,
  type AppAppearance,
  type AppStyleName,
  type ResolvedAppearance,
} from '@/lib/app-themes'

interface AppThemeContextValue {
  appearance: AppAppearance
  resolvedAppearance: ResolvedAppearance
  setAppearance: (appearance: AppAppearance) => void
  setStyleName: (styleName: AppStyleName) => void
  styleName: AppStyleName
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null)

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<AppAppearance>(DEFAULT_APP_APPEARANCE)
  const [styleName, setStyleNameState] = useState<AppStyleName>(DEFAULT_APP_STYLE)
  const [resolvedAppearance, setResolvedAppearance] =
    useState<ResolvedAppearance>('light')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const storedAppearance = window.localStorage.getItem(APP_APPEARANCE_STORAGE_KEY)
    const storedStyle =
      window.localStorage.getItem(APP_STYLE_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_APP_STYLE_STORAGE_KEY)
    const appearanceValue = storedAppearance ?? ''
    const styleValue = storedStyle ?? ''

    const nextAppearance: AppAppearance = isAppAppearance(appearanceValue)
      ? appearanceValue
      : DEFAULT_APP_APPEARANCE
    const nextStyle: AppStyleName = isAppStyleName(styleValue)
      ? styleValue
      : DEFAULT_APP_STYLE

    setAppearanceState(nextAppearance)
    setStyleNameState(nextStyle)
    applyTheme(nextAppearance, nextStyle, setResolvedAppearance)
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    applyTheme(appearance, styleName, setResolvedAppearance)

    window.localStorage.setItem(APP_APPEARANCE_STORAGE_KEY, appearance)
    window.localStorage.setItem(APP_STYLE_STORAGE_KEY, styleName)
    window.localStorage.removeItem(LEGACY_APP_STYLE_STORAGE_KEY)
  }, [appearance, isLoaded, styleName])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (appearance !== 'system') {
        return
      }

      applyTheme(appearance, styleName, setResolvedAppearance)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [appearance, styleName])

  const value = useMemo<AppThemeContextValue>(
    () => ({
      appearance,
      resolvedAppearance,
      setAppearance: setAppearanceState,
      setStyleName: setStyleNameState,
      styleName,
    }),
    [appearance, resolvedAppearance, styleName],
  )

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

export function useAppTheme() {
  const value = useContext(AppThemeContext)

  if (!value) {
    throw new Error('useAppTheme must be used inside AppThemeProvider')
  }

  return value
}

function applyTheme(
  appearance: AppAppearance,
  _styleName: AppStyleName,
  setResolvedAppearance: (appearance: ResolvedAppearance) => void,
) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolvedAppearance = resolveAppearance(appearance, prefersDark)
  const root = document.documentElement

  root.classList.remove('light', 'dark')
  root.classList.add(resolvedAppearance)
  root.dataset.themeAppearance = appearance
  root.dataset.resolvedAppearance = resolvedAppearance
  root.style.colorScheme = resolvedAppearance

  const metaThemeColor = document.querySelector('meta[name="theme-color"]')

  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', getThemeColor(resolvedAppearance, _styleName))
  }

  setResolvedAppearance(resolvedAppearance)
}

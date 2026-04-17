export type UiThemeMode = 'light' | 'dark' | 'system'

export interface AppPreferences {
  uiTheme: UiThemeMode
  /** Used for new sessions and “Use defaults” in Config. */
  defaultDiagramTheme: string
}

const PREFS_KEY = 'better-mermaid-preferences:v1'

export const DEFAULT_UI_THEME: UiThemeMode = 'dark'
/** Default Mermaid renderer theme for fresh installs / reset — change here to change app default. */
export const DEFAULT_DIAGRAM_THEME = 'claro'

const defaultPreferences: AppPreferences = {
  defaultDiagramTheme: DEFAULT_DIAGRAM_THEME,
  uiTheme: DEFAULT_UI_THEME,
}

export function readPreferences(): AppPreferences {
  if (typeof window === 'undefined') {
    return { ...defaultPreferences }
  }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) {
      return { ...defaultPreferences }
    }
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    return {
      defaultDiagramTheme:
        typeof parsed.defaultDiagramTheme === 'string' && parsed.defaultDiagramTheme.trim()
          ? parsed.defaultDiagramTheme
          : defaultPreferences.defaultDiagramTheme,
      uiTheme:
        parsed.uiTheme === 'light' || parsed.uiTheme === 'dark' || parsed.uiTheme === 'system'
          ? parsed.uiTheme
          : defaultPreferences.uiTheme,
    }
  } catch {
    return { ...defaultPreferences }
  }
}

export function writePreferences(patch: Partial<AppPreferences>) {
  if (typeof window === 'undefined') {
    return
  }
  const next = { ...readPreferences(), ...patch }
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(next))
}

export function resolveUiTheme(mode: UiThemeMode): 'light' | 'dark' {
  if (mode === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  if (mode === 'light' || mode === 'dark') {
    return mode
  }
  return 'dark'
}

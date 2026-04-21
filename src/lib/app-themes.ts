export const APP_APPEARANCES = ['system', 'light', 'dark'] as const
export const APP_STYLE_NAMES = ['neutral', 'claro'] as const

export type AppAppearance = (typeof APP_APPEARANCES)[number]
export type AppStyleName = (typeof APP_STYLE_NAMES)[number]
export type ResolvedAppearance = Exclude<AppAppearance, 'system'>

export const APP_APPEARANCE_STORAGE_KEY = 'better-mermaid:appearance'
export const APP_STYLE_STORAGE_KEY = 'better-mermaid:ui-style'
export const LEGACY_APP_STYLE_STORAGE_KEY = 'better-mermaid:ui-theme'
export const DEFAULT_APP_APPEARANCE: AppAppearance = 'system'
export const DEFAULT_APP_STYLE: AppStyleName = 'claro'

export const APP_APPEARANCE_OPTIONS = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
] as const satisfies ReadonlyArray<{ label: string; value: AppAppearance }>

export const APP_STYLE_OPTIONS = [
  { label: 'Neutral', value: 'neutral' },
  { label: 'Claro', value: 'claro' },
] as const satisfies ReadonlyArray<{ label: string; value: AppStyleName }>

export function isAppAppearance(value: string): value is AppAppearance {
  return APP_APPEARANCES.includes(value as AppAppearance)
}

export function isAppStyleName(value: string): value is AppStyleName {
  return APP_STYLE_NAMES.includes(value as AppStyleName)
}

export function resolveAppearance(
  appearance: AppAppearance,
  prefersDark: boolean,
): ResolvedAppearance {
  if (appearance === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return appearance
}

export function getThemeColor(
  resolvedAppearance: ResolvedAppearance,
  _styleName: AppStyleName,
) {
  return resolvedAppearance === 'dark' ? '#0b0d11' : '#f5f5f5'
}

export function getThemeInitializationScript() {
  const appearanceValues = APP_APPEARANCES.map((value) => `"${value}"`).join(', ')

  return `
(() => {
  const appearanceKey = '${APP_APPEARANCE_STORAGE_KEY}';
  const appearanceValues = new Set([${appearanceValues}]);
  const storedAppearance = window.localStorage.getItem(appearanceKey);
  const appearance = appearanceValues.has(storedAppearance) ? storedAppearance : '${DEFAULT_APP_APPEARANCE}';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolvedAppearance = appearance === 'system' ? (prefersDark ? 'dark' : 'light') : appearance;
  const root = document.documentElement;

  root.classList.remove('light', 'dark');
  root.classList.add(resolvedAppearance);
  root.dataset.themeAppearance = appearance;
  root.dataset.resolvedAppearance = resolvedAppearance;
  root.style.colorScheme = resolvedAppearance;
})();
`.trim()
}

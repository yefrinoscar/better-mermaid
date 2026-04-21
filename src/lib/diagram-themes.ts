import type { DiagramColors } from 'beautiful-mermaid'
import type { ResolvedAppearance } from '@/lib/app-themes'

export interface DiagramThemeDefinition {
  colors: DiagramColors
  font: string
  id: string
  label: string
}

const BUILTIN_THEME_NAMES = [
  'catppuccin-latte',
  'catppuccin-mocha',
  'dracula',
  'github-dark',
  'github-light',
  'nord',
  'nord-light',
  'one-dark',
  'solarized-dark',
  'solarized-light',
  'tokyo-night',
  'tokyo-night-light',
  'tokyo-night-storm',
  'zinc-dark',
  'zinc-light',
] as const

const CUSTOM_THEMES: Record<string, Record<ResolvedAppearance, DiagramThemeDefinition>> = {
  claro: {
    dark: {
      colors: {
        accent: '#f3efe7',
        bg: '#050505',
        border: '#d8d2c8',
        fg: '#f3efe7',
        line: '#ff8a78',
        muted: '#8f8a84',
        surface: '#121213',
      },
      font: 'Sora',
      id: 'claro',
      label: 'Claro',
    },
    light: {
      colors: {
        accent: '#ed1818',
        bg: '#ffffff',
        border: '#8f8f8f',
        fg: '#202020',
        line: '#f15151',
        muted: '#808080',
        surface: '#fcdddd',
      },
      font: 'Sora',
      id: 'claro',
      label: 'Claro',
    },
  },
}

export const DEFAULT_THEME = 'claro'
export const FALLBACK_THEME_COLORS = CUSTOM_THEMES[DEFAULT_THEME].light.colors
export const MERMAID_THEME_NAMES = [...BUILTIN_THEME_NAMES, ...Object.keys(CUSTOM_THEMES)]
export const MERMAID_THEME_OPTIONS = [...MERMAID_THEME_NAMES].sort((left, right) =>
  formatThemeName(left).localeCompare(formatThemeName(right)),
)

export function formatThemeName(theme: string) {
  return CUSTOM_THEMES[theme]?.light.label
    ? CUSTOM_THEMES[theme].light.label
    : theme
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

export function isSupportedTheme(theme: string): theme is string {
  return MERMAID_THEME_NAMES.includes(theme)
}

export function resolveThemeDefinition(
  theme: string,
  builtInThemes: Record<string, DiagramColors>,
  appearance: ResolvedAppearance,
): DiagramThemeDefinition {
  if (CUSTOM_THEMES[theme]) {
    return CUSTOM_THEMES[theme][appearance]
  }

  const resolvedTheme = getAppearanceAwareBuiltInTheme(theme, appearance, builtInThemes)
  const builtInColors =
    builtInThemes[resolvedTheme] ??
    builtInThemes[theme] ??
    builtInThemes['github-dark'] ??
    CUSTOM_THEMES[DEFAULT_THEME][appearance].colors

  return {
    colors: builtInColors,
    font: 'Sora',
    id: resolvedTheme,
    label: formatThemeName(resolvedTheme),
  }
}

export function decorateSvgForTheme(
  svg: string,
  theme: string,
  appearance: ResolvedAppearance,
  transparent: boolean,
  backgroundColor: string,
) {
  if (theme !== 'claro') {
    return svg
  }

  const svgBackground = transparent ? 'transparent' : backgroundColor
  const claroCss =
    appearance === 'dark'
      ? `
  svg {
    background: ${svgBackground};
  }

  .subgraph > rect:first-of-type,
  .cluster rect {
    fill: transparent;
    stroke: #8b847c;
    stroke-dasharray: 12 8;
    stroke-width: 1.35;
    rx: 14px;
    ry: 14px;
  }

  .subgraph > rect:nth-of-type(2) {
    fill: transparent;
    stroke: transparent;
  }

  .subgraph text,
  .cluster-label text,
  .cluster-label span {
    fill: #8f8a84 !important;
    color: #8f8a84 !important;
    font-weight: 500;
  }

  .edge {
    stroke-linecap: butt;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  marker polygon {
    stroke-linecap: butt;
    stroke-linejoin: miter;
    vector-effect: non-scaling-stroke;
    shape-rendering: geometricPrecision;
  }

  .edge-label rect,
  .edgeLabel rect {
    fill: #141416;
    stroke: #2e2e31;
    rx: 8px;
    ry: 8px;
  }

  .node rect {
    rx: 10px;
    ry: 10px;
  }

  .node rect,
  .node polygon,
  .node ellipse,
  .node circle {
    filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.28));
  }
  `.trim()
      : `
  svg {
    background: ${svgBackground};
  }

  .subgraph > rect:first-of-type,
  .cluster rect {
    fill: transparent;
    stroke: #f15151;
    stroke-dasharray: 12 8;
    stroke-width: 1.35;
    rx: 14px;
    ry: 14px;
  }

  .subgraph > rect:nth-of-type(2) {
    fill: transparent;
    stroke: transparent;
  }

  .subgraph text,
  .cluster-label text,
  .cluster-label span {
    fill: #808080 !important;
    color: #808080 !important;
    font-weight: 500;
  }

  .edge {
    stroke-linecap: butt;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  marker polygon {
    stroke-linecap: butt;
    stroke-linejoin: miter;
    vector-effect: non-scaling-stroke;
    shape-rendering: geometricPrecision;
  }

  .edge-label rect,
  .edgeLabel rect {
    fill: #ffffff;
    stroke: #f68b8b;
    rx: 8px;
    ry: 8px;
  }

  .node rect {
    rx: 10px;
    ry: 10px;
  }

  .node rect,
  .node polygon,
  .node ellipse,
  .node circle {
    filter: drop-shadow(0 6px 16px rgba(237, 24, 24, 0.08));
  }
  `.trim()

  if (svg.includes('</style>')) {
    return svg.replace('</style>', `\n${claroCss}\n</style>`)
  }

  return svg.replace('>', `><style>${claroCss}</style>`)
}

function getAppearanceAwareBuiltInTheme(
  theme: string,
  appearance: ResolvedAppearance,
  builtInThemes: Record<string, DiagramColors>,
) {
  const companionThemes: Partial<Record<string, string>> =
    appearance === 'dark'
      ? {
          'catppuccin-latte': 'catppuccin-mocha',
          'github-light': 'github-dark',
          'nord-light': 'nord',
          'solarized-light': 'solarized-dark',
          'tokyo-night-light': 'tokyo-night',
          'zinc-light': 'zinc-dark',
        }
      : {
          'catppuccin-mocha': 'catppuccin-latte',
          'github-dark': 'github-light',
          nord: 'nord-light',
          'solarized-dark': 'solarized-light',
          'tokyo-night': 'tokyo-night-light',
          'zinc-dark': 'zinc-light',
        }

  const resolvedTheme = companionThemes[theme] ?? theme

  return builtInThemes[resolvedTheme] ? resolvedTheme : theme
}

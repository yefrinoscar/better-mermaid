import type { DiagramColors } from 'beautiful-mermaid'

/**
 * Claro diagram theme — light (Figma slide) vs dark (app dark UI).
 * Nodes: use `()` for rounded rects (rx 6). Subgraph corners rounded via post-process in dashboard.
 */
export const claroMermaidThemeLight: DiagramColors = {
  accent: '#202020',
  bg: '#ffffff',
  border: '#202020',
  fg: '#202020',
  line: '#202020',
  muted: '#999999',
  surface: '#ffffff',
}

/** Dark canvas: same structure as light, inverted neutrals; accent red unchanged where needed. */
export const claroMermaidThemeDark: DiagramColors = {
  accent: '#d4d4d8',
  bg: '#141414',
  border: '#d4d4d8',
  fg: '#e4e4e7',
  line: '#d4d4d8',
  muted: '#a1a1aa',
  surface: '#141414',
}

export const claroMermaidFont = 'DM Sans'

export const claroFillsLight = {
  redTint: '#fcdcdc',
  grayChip: '#e0e0e0',
} as const

/** Dark UI: brighter reds so strokes and labels read on #141414 (Figma #ed1818 is too low-contrast here). */
export const claroFillsDark = {
  redTint: '#4a252e',
  grayChip: '#2e2e2e',
} as const

const claroRedDark = {
  stroke: '#fb7185',
  strokeStrong: '#f43f5e',
  labelOnTint: '#ffe4e6',
  labelDashed: '#fda4af',
} as const

function linkStyleLight() {
  return 'linkStyle default stroke:#202020,stroke-width:1.5px'
}

function linkStyleDark() {
  return 'linkStyle default stroke:#d4d4d8,stroke-width:1.5px'
}

export function getClaroMermaidColors(variant: 'light' | 'dark'): DiagramColors {
  return variant === 'dark' ? claroMermaidThemeDark : claroMermaidThemeLight
}

/**
 * Full `classDef` + `linkStyle` block for the active UI variant.
 * Injected at render time so Claro diagrams match light/dark app theme.
 */
export function getClaroClassDefsBlock(variant: 'light' | 'dark'): string {
  const f = variant === 'dark' ? claroFillsDark : claroFillsLight
  const bg = variant === 'dark' ? '#141414' : '#ffffff'
  const ink = variant === 'dark' ? '#e4e4e7' : '#202020'
  const muted = variant === 'dark' ? '#a1a1aa' : '#999999'
  const groupStroke = variant === 'dark' ? '#737373' : '#999999'
  const chipStroke = variant === 'dark' ? '#d4d4d8' : '#202020'
  const link = variant === 'dark' ? linkStyleDark() : linkStyleLight()

  const redSolid =
    variant === 'dark'
      ? `fill:${f.redTint},stroke:${claroRedDark.strokeStrong},stroke-width:2px,color:${claroRedDark.labelOnTint},font-size:20px`
      : `fill:${f.redTint},stroke:#ed1818,stroke-width:2px,color:#a70808,font-size:20px`
  const redDashed =
    variant === 'dark'
      ? `fill:${bg},stroke:${claroRedDark.stroke},stroke-width:2px,stroke-dasharray:8 5,stroke-dashoffset:0,color:${claroRedDark.labelDashed},font-size:20px`
      : `fill:${bg},stroke:#ed1818,stroke-width:2px,stroke-dasharray:8 5,stroke-dashoffset:0,color:#ed1818,font-size:20px`

  return `
  classDef redSolid ${redSolid};
  classDef redDashed ${redDashed};
  classDef chip fill:${f.grayChip},stroke:${chipStroke},stroke-width:2px,color:${ink},font-size:16px;
  classDef group fill:${bg},stroke:${groupStroke},stroke-width:2px,color:${muted},font-size:20px;
  classDef slideTitle fill:${bg},stroke:${bg},color:${ink},font-weight:bold,font-size:36px;
  classDef slideBullets fill:${bg},stroke:${bg},color:${ink},font-weight:500,font-size:16px;
  classDef realmHint fill:${bg},stroke:${bg},color:${muted},font-weight:bold,font-size:14px;
  classDef linkNote fill:${bg},stroke:${bg},color:${ink},font-weight:500,font-size:16px;
  ${link}
`.trim()
}

/** Remove auto-appended Claro style tail so we can re-inject the correct variant. */
export function stripClaroClassDefsTail(code: string): string {
  const idx = code.search(/\nclassDef\s+redSolid\b/)
  if (idx === -1) {
    return code.trimEnd()
  }
  return code.slice(0, idx).trimEnd()
}

/**
 * @deprecated Use getClaroClassDefsBlock('light') at runtime.
 * Kept for any external imports; presets no longer embed this.
 */
export const CLARO_CLASSDEFS = getClaroClassDefsBlock('light')

export const CLARO_LINKSTYLE = 'linkStyle default stroke:#202020,stroke-width:1.5px'

/** Legacy export name used earlier — alias to light. */
export const claroMermaidTheme = claroMermaidThemeLight

/** Source for Claro renderer: drop any stale classDef tail, inject variant-specific styles. */
export function buildClaroFlowchartSource(code: string, variant: 'light' | 'dark'): string {
  const base = stripClaroClassDefsTail(code)
  return `${base}\n\n${getClaroClassDefsBlock(variant)}`
}

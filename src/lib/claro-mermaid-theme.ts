import type { DiagramColors } from 'beautiful-mermaid'

/**
 * Palette from Figma "Claro-graphs" (slide + component nodes):
 * bg #FFFFFF, ink #202020, muted #999999, accent red #ED1818,
 * neutral surface ≈ 15% #313131 on white, red tint ≈ 15% #ED1818 on white.
 */
export const claroMermaidTheme: DiagramColors = {
  accent: '#ed1818',
  bg: '#ffffff',
  border: '#202020',
  fg: '#202020',
  line: '#999999',
  muted: '#999999',
  surface: '#ebebeb',
}

export const claroMermaidFont = 'DM Sans'

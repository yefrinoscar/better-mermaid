import type { DiagramColors } from 'beautiful-mermaid'

/**
 * Palette extracted from the Figma "Claro-graphs" slide (node 1:61).
 *
 * Box styles in the design:
 *  - Realm outer boxes: #202020 solid stroke over WHITE fill
 *  - Shell / API boxes: #ed1818 solid stroke + rgba(237,24,24,0.15) fill
 *  - Microfront boxes (MF1/2/3): #ed1818 DASHED stroke over WHITE fill
 *  - @claro/* small chips: #202020 solid stroke + rgba(49,49,49,0.15) fill
 *  - Grouping rectangle (Red Interna / Exterior): #999 solid stroke
 *
 * The base Mermaid theme here maps to the DEFAULT black-on-white node
 * (not tinted). The `classDef` helpers in CLARO_CLASSDEFS expose the
 * filled + dashed variants for authors who want to match the slide.
 */
export const claroMermaidTheme: DiagramColors = {
  accent: '#ed1818',
  bg: '#ffffff',
  border: '#202020',
  fg: '#202020',
  line: '#999999',
  muted: '#999999',
  surface: '#ffffff',
}

export const claroMermaidFont = 'DM Sans'

/**
 * Drop-in Mermaid `classDef` declarations that reproduce the four Figma
 * box variants. Append to any flowchart and tag nodes with `:::redSolid`,
 * `:::redDashed`, or `:::chip` to match the slide exactly.
 */
export const CLARO_CLASSDEFS = `
  classDef redSolid fill:#fde1e1,stroke:#ed1818,stroke-width:2px,color:#a70808;
  classDef redDashed fill:#ffffff,stroke:#ed1818,stroke-width:2px,stroke-dasharray:6 4,color:#ed1818;
  classDef chip fill:#ebebeb,stroke:#202020,stroke-width:2px,color:#202020;
  classDef group fill:#ffffff,stroke:#999999,stroke-width:2px,color:#999999;
`.trim()

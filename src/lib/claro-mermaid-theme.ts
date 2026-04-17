import type { DiagramColors } from 'beautiful-mermaid'

/**
 * Tokens from Figma MCP — Claro-graphs, slide 1:61 (`rounded-[5px]` ≈ 5px radius; Mermaid `()` → rx 6 in beautiful-mermaid).
 */
export const claroMermaidTheme: DiagramColors = {
  accent: '#202020',
  bg: '#ffffff',
  border: '#202020',
  fg: '#202020',
  line: '#202020',
  muted: '#999999',
  surface: '#ffffff',
}

export const claroMermaidFont = 'DM Sans'

/** Composited fills (15% tint on #ffffff) matching Figma rgba overlays. */
export const claroFills = {
  redTint: '#fcdcdc',
  grayChip: '#e0e0e0',
} as const

/**
 * Use `NodeId(Label)` syntax (rounded rect) — not `[]` (sharp corners).
 * `linkStyle default` sharpens connectors vs theme default 1px grays.
 */
export const CLARO_LINKSTYLE = 'linkStyle default stroke:#202020,stroke-width:1.5px'

/**
 * Mermaid `classDef` + linkStyle — append after flowcharts using `:::redSolid`, etc.
 */
export const CLARO_CLASSDEFS = `
  classDef redSolid fill:${claroFills.redTint},stroke:#ed1818,stroke-width:2px,color:#a70808,font-size:20px;
  classDef redDashed fill:#ffffff,stroke:#ed1818,stroke-width:2px,stroke-dasharray:8 5,stroke-dashoffset:0,color:#ed1818,font-size:20px;
  classDef chip fill:${claroFills.grayChip},stroke:#202020,stroke-width:2px,color:#202020,font-size:16px;
  classDef group fill:#ffffff,stroke:#999999,stroke-width:2px,color:#999999,font-size:20px;
  classDef slideTitle fill:#ffffff,stroke:#ffffff,color:#202020,font-weight:bold,font-size:36px;
  classDef slideBullets fill:#ffffff,stroke:#ffffff,color:#202020,font-weight:500,font-size:16px;
  classDef realmHint fill:#ffffff,stroke:#ffffff,color:#999999,font-weight:bold,font-size:14px;
  classDef linkNote fill:#ffffff,stroke:#ffffff,color:#202020,font-weight:500,font-size:16px;
  ${CLARO_LINKSTYLE}
`.trim()

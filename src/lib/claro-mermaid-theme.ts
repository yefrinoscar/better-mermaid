import type { DiagramColors } from 'beautiful-mermaid'

/**
 * Tokens from Figma MCP — Claro-graphs, frame "Slide 16:9 - 1" (node 1:61).
 * Refreshed from get_design_context output (asset URLs rotate; colors unchanged).
 *
 * | Element | Figma |
 * |---------|--------|
 * | Slide bg | white |
 * | Realm box | border 2px #202020 solid, fill none |
 * | Shell / API | fill rgba(237,24,24,0.15) → #fcdcdc on white, border #ed1818 solid, label gradient #a70808→#ed1818 (Mermaid: solid #a70808) |
 * | MF1/2/3 | border #ed1818 dashed, fill none, text #ed1818 20px |
 * | @claro/* | fill rgba(49,49,49,0.15) → #e0e0e0 on white, border #202020, text #202020 16px |
 * | Area frame | border #999 solid 2px, fill none; titles "Red Interna" / "Exterior" #999 20px medium |
 * | Slide title | #202020 36px bold |
 * | Top bullets (4:68) | #202020 16px medium |
 * | JWT Shell (2:31, 4:56) | #999 14px bold |
 * | Realm hints (11:129) | #999 14px bold |
 * | threescale… (19:42) | #202020 16px medium |
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

/** Composited fills (15% tint on #ffffff) matching Figma rgba overlays. */
export const claroFills = {
  redTint: '#fcdcdc',
  grayChip: '#e0e0e0',
} as const

/**
 * Mermaid `classDef` lines — paste after any flowchart using `:::redSolid`, etc.
 * Includes slide chrome (title / bullets / realm hints) from node 1:61.
 */
export const CLARO_CLASSDEFS = `
  classDef redSolid fill:${claroFills.redTint},stroke:#ed1818,stroke-width:2px,color:#a70808,font-size:20px;
  classDef redDashed fill:#ffffff,stroke:#ed1818,stroke-width:2px,stroke-dasharray:8 5,color:#ed1818,font-size:20px;
  classDef chip fill:${claroFills.grayChip},stroke:#202020,stroke-width:2px,color:#202020,font-size:16px;
  classDef group fill:#ffffff,stroke:#999999,stroke-width:2px,color:#999999,font-size:20px;
  classDef slideTitle fill:#ffffff,stroke:#ffffff,color:#202020,font-weight:bold,font-size:36px;
  classDef slideBullets fill:#ffffff,stroke:#ffffff,color:#202020,font-weight:500,font-size:16px;
  classDef realmHint fill:#ffffff,stroke:#ffffff,color:#999999,font-weight:bold,font-size:14px;
  classDef linkNote fill:#ffffff,stroke:#ffffff,color:#202020,font-weight:500,font-size:16px;
`.trim()

/**
 * Claro / Figma: ~5px corner radius. beautiful-mermaid uses rx=0 for subgraphs
 * and `[]` nodes, rx=2 for edge labels, rx=6 for `()` rounded nodes.
 * Normalize everything to rx=6 for a consistent rounded look.
 */
export function polishClaroSvgCorners(svg: string): string {
  let out = svg
  out = out.replaceAll('rx="0" ry="0"', 'rx="6" ry="6"')
  out = out.replaceAll('rx="2" ry="2"', 'rx="6" ry="6"')
  return out
}

/** @deprecated Use polishClaroSvgCorners */
export function polishClaroSubgraphCorners(svg: string): string {
  return polishClaroSvgCorners(svg)
}

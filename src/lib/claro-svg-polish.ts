/**
 * Claro / Figma: ~5–6px corner radius on all boxes (flowchart, labels, sequence lifelines, etc.).
 */
export function polishClaroSvgCorners(svg: string): string {
  let out = svg
  out = out.replaceAll('rx="0" ry="0"', 'rx="6" ry="6"')
  out = out.replaceAll('rx="2" ry="2"', 'rx="6" ry="6"')
  out = out.replaceAll('rx="4" ry="4"', 'rx="6" ry="6"')
  return out
}

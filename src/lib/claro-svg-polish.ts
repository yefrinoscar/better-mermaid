/** Normalize sharp rects to match Figma-style rounded boxes (rx ≈ 6). */
export function polishClaroSvgCorners(svg: string): string {
  let out = svg
  out = out.replaceAll('rx="0" ry="0"', 'rx="6" ry="6"')
  out = out.replaceAll('rx="2" ry="2"', 'rx="6" ry="6"')
  return out
}

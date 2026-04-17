/**
 * beautiful-mermaid draws subgraph frames with rx=0. Claro design uses rounded corners (~5px).
 */
export function polishClaroSubgraphCorners(svg: string): string {
  return svg
    .replaceAll(
      'rx="0" ry="0" fill="var(--_group-fill)" stroke="var(--_node-stroke)"',
      'rx="6" ry="6" fill="var(--_group-fill)" stroke="var(--_node-stroke)"',
    )
    .replaceAll(
      'rx="0" ry="0" fill="var(--_group-hdr)" stroke="var(--_node-stroke)"',
      'rx="6" ry="6" fill="var(--_group-hdr)" stroke="var(--_node-stroke)"',
    )
}

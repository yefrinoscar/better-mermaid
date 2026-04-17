import { CLARO_CLASSDEFS } from '@/lib/claro-mermaid-theme'

export interface DiagramPreset {
  id: string
  label: string
  kind: string
  description: string
  code: string
}

export const defaultPresetId = 'flow'

export const presets: DiagramPreset[] = [
  {
    id: 'claro-flujo-1',
    label: 'Claro — Flujo 1',
    kind: 'Flowchart',
    description:
      'Slide 1:61 del Figma Claro-graphs (MCP actualizado): título, viñetas, Red Interna + Exterior, variantes de caja y enlace threescale.',
    code: `flowchart TB
  H1["FLUJO 1: Microfront depende de la shell"]:::slideTitle
  BUL["• La URL de la Api este en el token de sesión<br/>• Toma el token del contexto (De la shell que la este ejecutando)"]:::slideBullets

  subgraph RedInterna["Red Interna"]
    direction TB
    RHINT["• realm: realm X<br/>• ClientId: shell"]:::realmHint
    RealmX["Realm X"]
    ShellX["Shell X"]:::redSolid
    APIx["API"]:::redSolid
    MF2["MF2"]:::redDashed
    MF1["MF1"]:::redDashed
    HTTPx["@claro/http"]:::chip
    AUTHx["@claro/auth"]:::chip
    RHINT ~~~ RealmX
    RealmX --> ShellX
    RealmX --> APIx
    ShellX -->|JWT Shell| MF2
    ShellX -->|JWT Shell| MF1
    APIx --> HTTPx
    HTTPx -.-> MF1
    HTTPx -.-> MF2
    MF1 --> AUTHx
  end

  subgraph Exterior["Exterior"]
    direction TB
    RealmY["Realm Y"]
    ShellY["Shell Y"]:::redSolid
    APIy["API"]:::redSolid
    MF3["MF3"]:::redDashed
    HTTPy["@claro/http"]:::chip
    RealmY --> ShellY
    RealmY --> APIy
    ShellY -->|JWT Shell| MF3
    APIy --> HTTPy
    HTTPy -.-> MF3
  end

  TS["threescale.claro.com/?type=1"]:::linkNote
  ShellX -.-> TS
  TS -.-> ShellY

  H1 --> BUL
  BUL --> RedInterna

  class RedInterna,Exterior group;

${CLARO_CLASSDEFS}
`,
  },
  {
    id: 'claro-variants',
    label: 'Claro — Box variants',
    kind: 'Flowchart',
    description:
      'Todas las variantes de caja del Figma + estilos de texto del slide (título 36px, viñetas 16px, JWT/realm 14px bold, chip 16px).',
    code: `flowchart TB
  H1["FLUJO 1: (slide title 36px bold)"]:::slideTitle
  BUL["• Bullet list 16px medium (nodo 4:68)"]:::slideBullets
  JWT["JWT Shell (14px bold, #999)"]:::realmHint

  subgraph GroupExample["Group label 20px #999 (Red Interna / Exterior)"]
    Inside["Realm default: white + #202020 2px"]
  end

  Default["Default (Realm)"]
  RedSolid["Shell / API"]:::redSolid
  RedDashed["MF dashed"]:::redDashed
  Chip["@claro/http chip"]:::chip
  Link["threescale… 16px"]:::linkNote

  H1 --> BUL --> JWT
  Default --> RedSolid --> RedDashed --> Chip --> Link --> GroupExample

  class GroupExample group;

${CLARO_CLASSDEFS}
`,
  },
  {
    id: 'flow',
    label: 'Launch Flow',
    kind: 'Flowchart',
    description: 'A product rollout flow with decision branches.',
    code: `graph TD
  Idea[Customer pain point] --> Scope{Worth building?}
  Scope -->|Yes| Draft[Shape the workflow]
  Scope -->|Not yet| Backlog[Park for later]
  Draft --> Prototype[Build prototype]
  Prototype --> Review[Review with team]
  Review --> Polish[Polish rough edges]
  Polish --> Launch[Launch the update]
`,
  },
  {
    id: 'sequence',
    label: 'Review Loop',
    kind: 'Sequence',
    description: 'A back-and-forth between author, app, and renderer.',
    code: `sequenceDiagram
  participant Writer
  participant Playground
  participant Renderer as beautiful-mermaid
  Writer->>Playground: Paste Mermaid source
  Playground->>Renderer: renderMermaidSVG(code, theme)
  Renderer-->>Playground: Beautiful SVG
  Playground-->>Writer: Preview + export buttons
`,
  },
  {
    id: 'state',
    label: 'Draft State',
    kind: 'State',
    description: 'Editing states from rough draft to exported result.',
    code: `stateDiagram-v2
  [*] --> Rough
  Rough --> Editing: tweak syntax
  Editing --> Previewing: render live
  Previewing --> Gorgeous: choose a theme
  Previewing --> Editing: fix a mistake
  Gorgeous --> Exported: copy SVG
  Exported --> [*]
`,
  },
  {
    id: 'class',
    label: 'Playground Model',
    kind: 'Class',
    description: 'A simple model of the dashboard pieces and relations.',
    code: `classDiagram
  class Playground {
    +code: string
    +theme: string
    +render()
    +downloadSvg()
  }

  class Renderer {
    +renderMermaidSVG()
    +renderMermaidASCII()
  }

  class PresetStore {
    +load()
    +select(id)
  }

  Playground --> Renderer
  Playground --> PresetStore
`,
  },
  {
    id: 'xychart',
    label: 'Glow Up Chart',
    kind: 'XY Chart',
    description: 'A chart tab for testing tooltip and theme behavior.',
    code: `xychart-beta
    title "Mermaid glow up"
    x-axis [Rough, Clear, Better, Beautiful, Shared]
    y-axis "Confidence" 0 --> 100
    bar [18, 34, 59, 84, 96]
    line [12, 29, 55, 81, 94]
`,
  },
]

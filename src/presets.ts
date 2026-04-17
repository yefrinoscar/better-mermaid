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
      'FLUJO 1 from the Claro-graphs Figma slide (node 1:61): Red Interna + Exterior groups with every box variant (default, red solid, red dashed, chip, group).',
    code: `flowchart TB
  subgraph RedInterna["Red Interna"]
    direction TB
    RealmX["Realm X"]
    ShellX["Shell X"]:::redSolid
    APIx["API"]:::redSolid
    MF2["MF2"]:::redDashed
    MF1["MF1"]:::redDashed
    HTTPx["@claro/http"]:::chip
    AUTHx["@claro/auth"]:::chip
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

  ShellX -. "threescale.claro.com/?type=1" .-> ShellY

  class RedInterna,Exterior group;

  classDef redSolid fill:#fde1e1,stroke:#ed1818,stroke-width:2px,color:#a70808;
  classDef redDashed fill:#ffffff,stroke:#ed1818,stroke-width:2px,stroke-dasharray:6 4,color:#ed1818;
  classDef chip fill:#ebebeb,stroke:#202020,stroke-width:2px,color:#202020;
  classDef group fill:#ffffff,stroke:#999999,stroke-width:2px,color:#999999;
`,
  },
  {
    id: 'claro-variants',
    label: 'Claro — Box variants',
    kind: 'Flowchart',
    description:
      'Reference sheet showing every Claro box variant side-by-side: default, red-solid, red-dashed, chip and group.',
    code: `flowchart LR
  Default["Default<br/>(Realm)"]
  RedSolid["Red solid<br/>(Shell / API)"]:::redSolid
  RedDashed["Red dashed<br/>(MF1 / MF2 / MF3)"]:::redDashed
  Chip["Chip<br/>(@claro/http)"]:::chip

  subgraph GroupExample["Group (Red Interna / Exterior)"]
    Inside["Default inside group"]
  end

  Default --> RedSolid --> RedDashed --> Chip --> GroupExample

  class GroupExample group;

  classDef redSolid fill:#fde1e1,stroke:#ed1818,stroke-width:2px,color:#a70808;
  classDef redDashed fill:#ffffff,stroke:#ed1818,stroke-width:2px,stroke-dasharray:6 4,color:#ed1818;
  classDef chip fill:#ebebeb,stroke:#202020,stroke-width:2px,color:#202020;
  classDef group fill:#ffffff,stroke:#999999,stroke-width:2px,color:#999999;
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

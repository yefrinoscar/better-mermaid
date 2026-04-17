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

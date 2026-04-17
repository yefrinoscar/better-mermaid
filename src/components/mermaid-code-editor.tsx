'use client'

import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import CodeMirror from '@uiw/react-codemirror'
import type { Extension } from '@codemirror/state'
import {
  flowchartTags,
  foldByIndent,
  journeyTags,
  mermaid,
  mermaidTags,
  pieTags,
  requirementTags,
  sequenceTags,
  ganttTags,
  mindmapTags,
} from 'codemirror-lang-mermaid'
import { Check, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

interface MermaidCodeEditorProps {
  fontSize: number
  value: string
  onChange: (value: string) => void
  uiVariant: 'light' | 'dark'
}

function buildHighlightStyle(isDark: boolean) {
  if (isDark) {
    return HighlightStyle.define([
      { tag: t.comment, color: '#78716c' },
      { tag: t.lineComment, color: '#78716c' },
      { tag: t.keyword, color: '#d6d3d1' },
      { tag: t.operator, color: '#a8a29e' },
      { tag: t.string, color: '#d4d4d4' },
      { tag: t.number, color: '#e7e5e4' },
      { tag: t.labelName, color: '#e7e5e4' },
      { tag: t.typeName, color: '#a8a29e' },
      { tag: t.variableName, color: '#f5f5f4' },
      { tag: t.className, color: '#d6d3d1' },
      { tag: mermaidTags.diagramName, color: '#fafaf9', fontWeight: '600' },
      { tag: flowchartTags.diagramName, color: '#fafaf9', fontWeight: '600' },
      { tag: flowchartTags.orientation, color: '#d6d3d1' },
      { tag: flowchartTags.nodeId, color: '#f5f5f4' },
      { tag: flowchartTags.nodeText, color: '#e7e5e4' },
      { tag: flowchartTags.nodeEdge, color: '#a8a29e' },
      { tag: flowchartTags.nodeEdgeText, color: '#d4d4d4' },
      { tag: flowchartTags.link, color: '#a8a29e' },
      { tag: flowchartTags.keyword, color: '#d6d3d1' },
      { tag: sequenceTags.diagramName, color: '#fafaf9', fontWeight: '600' },
      { tag: sequenceTags.keyword1, color: '#d6d3d1' },
      { tag: sequenceTags.keyword2, color: '#d6d3d1' },
      { tag: sequenceTags.arrow, color: '#a8a29e' },
      { tag: sequenceTags.nodeText, color: '#e7e5e4' },
      { tag: sequenceTags.messageText1, color: '#f5f5f4' },
      { tag: sequenceTags.messageText2, color: '#d4d4d4' },
      { tag: journeyTags.diagramName, color: '#fafaf9', fontWeight: '600' },
      { tag: journeyTags.keyword, color: '#d6d3d1' },
      { tag: pieTags.diagramName, color: '#fafaf9', fontWeight: '600' },
      { tag: pieTags.title, color: '#d6d3d1' },
      { tag: pieTags.titleText, color: '#d4d4d4' },
      { tag: requirementTags.diagramName, color: '#fafaf9', fontWeight: '600' },
      { tag: requirementTags.arrow, color: '#a8a29e' },
      { tag: requirementTags.keyword, color: '#d6d3d1' },
      { tag: ganttTags.diagramName, color: '#fafaf9', fontWeight: '600' },
      { tag: ganttTags.keyword, color: '#d6d3d1' },
      { tag: mindmapTags.diagramName, color: '#fafaf9', fontWeight: '600' },
      { tag: mindmapTags.lineText1, color: '#f5f5f4' },
      { tag: mindmapTags.lineText2, color: '#d4d4d4' },
      { tag: mindmapTags.lineText3, color: '#e7e5e4' },
      { tag: mindmapTags.lineText4, color: '#d6d3d1' },
      { tag: mindmapTags.lineText5, color: '#a8a29e' },
    ])
  }

  return HighlightStyle.define([
    { tag: t.comment, color: '#71717a' },
    { tag: t.lineComment, color: '#71717a' },
    { tag: t.keyword, color: '#7c3aed' },
    { tag: t.operator, color: '#52525b' },
    { tag: t.string, color: '#15803d' },
    { tag: t.number, color: '#c2410c' },
    { tag: t.labelName, color: '#3f3f46' },
    { tag: t.typeName, color: '#52525b' },
    { tag: t.variableName, color: '#18181b' },
    { tag: t.className, color: '#6d28d9' },
    { tag: mermaidTags.diagramName, color: '#18181b', fontWeight: '600' },
    { tag: flowchartTags.diagramName, color: '#18181b', fontWeight: '600' },
    { tag: flowchartTags.orientation, color: '#7c3aed' },
    { tag: flowchartTags.nodeId, color: '#18181b' },
    { tag: flowchartTags.nodeText, color: '#3f3f46' },
    { tag: flowchartTags.nodeEdge, color: '#52525b' },
    { tag: flowchartTags.nodeEdgeText, color: '#52525b' },
    { tag: flowchartTags.link, color: '#52525b' },
    { tag: flowchartTags.keyword, color: '#7c3aed' },
    { tag: sequenceTags.diagramName, color: '#18181b', fontWeight: '600' },
    { tag: sequenceTags.keyword1, color: '#7c3aed' },
    { tag: sequenceTags.keyword2, color: '#7c3aed' },
    { tag: sequenceTags.arrow, color: '#52525b' },
    { tag: sequenceTags.nodeText, color: '#3f3f46' },
    { tag: sequenceTags.messageText1, color: '#18181b' },
    { tag: sequenceTags.messageText2, color: '#52525b' },
    { tag: journeyTags.diagramName, color: '#18181b', fontWeight: '600' },
    { tag: journeyTags.keyword, color: '#7c3aed' },
    { tag: pieTags.diagramName, color: '#18181b', fontWeight: '600' },
    { tag: pieTags.title, color: '#7c3aed' },
    { tag: pieTags.titleText, color: '#52525b' },
    { tag: requirementTags.diagramName, color: '#18181b', fontWeight: '600' },
    { tag: requirementTags.arrow, color: '#52525b' },
    { tag: requirementTags.keyword, color: '#7c3aed' },
    { tag: ganttTags.diagramName, color: '#18181b', fontWeight: '600' },
    { tag: ganttTags.keyword, color: '#7c3aed' },
    { tag: mindmapTags.diagramName, color: '#18181b', fontWeight: '600' },
    { tag: mindmapTags.lineText1, color: '#18181b' },
    { tag: mindmapTags.lineText2, color: '#52525b' },
    { tag: mindmapTags.lineText3, color: '#3f3f46' },
    { tag: mindmapTags.lineText4, color: '#7c3aed' },
    { tag: mindmapTags.lineText5, color: '#71717a' },
  ])
}

const mermaidEditorThemeDark = EditorView.theme(
  {
    '&': {
      backgroundColor: '#040507',
      color: '#f3f5f7',
      height: '100%',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
      overflow: 'auto',
    },
    '.cm-content': {
      minHeight: '100%',
      padding: '0 0 0.35rem',
    },
    '.cm-line': {
      padding: '0 12px',
    },
    '.cm-gutters': {
      backgroundColor: '#040507',
      borderRight: '1px solid #11141c',
      color: '#5f6b82',
    },
    '.cm-activeLine': {
      backgroundColor: '#090c12',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#090c12',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: '#121722',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#f3f5f7',
    },
    '.cm-focused': {
      outline: 'none',
    },
  },
  { dark: true },
)

const mermaidEditorThemeLight = EditorView.theme(
  {
    '&': {
      backgroundColor: '#ffffff',
      color: '#18181b',
      height: '100%',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
      overflow: 'auto',
    },
    '.cm-content': {
      minHeight: '100%',
      padding: '0 0 0.35rem',
    },
    '.cm-line': {
      padding: '0 12px',
    },
    '.cm-gutters': {
      backgroundColor: '#fafafa',
      borderRight: '1px solid #e4e4e7',
      color: '#a1a1aa',
    },
    '.cm-activeLine': {
      backgroundColor: '#f4f4f5',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#f4f4f5',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: '#e4e4e7',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#18181b',
    },
    '.cm-focused': {
      outline: 'none',
    },
  },
  { dark: false },
)

export function MermaidCodeEditor({ fontSize, onChange, uiVariant, value }: MermaidCodeEditorProps) {
  const [isCopied, setIsCopied] = useState(false)
  const isDark = uiVariant === 'dark'

  const fontSizeTheme = useMemo<Extension>(
    () =>
      EditorView.theme({
        '.cm-content, .cm-gutter': {
          fontSize: `${fontSize}px`,
        },
      }),
    [fontSize],
  )

  const highlightStyle = useMemo(() => buildHighlightStyle(isDark), [isDark])
  const editorChrome = useMemo(() => (isDark ? mermaidEditorThemeDark : mermaidEditorThemeLight), [isDark])

  const extensions = useMemo(
    () => [mermaid(), foldByIndent(), syntaxHighlighting(highlightStyle), editorChrome, fontSizeTheme],
    [editorChrome, fontSizeTheme, highlightStyle],
  )

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setIsCopied(true)
      window.setTimeout(() => setIsCopied(false), 1200)
    } catch {
      setIsCopied(false)
    }
  }

  return (
    <div className="relative h-full">
      <CodeMirror
        basicSetup={{
          autocompletion: false,
          foldGutter: false,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          highlightSelectionMatches: false,
        }}
        className="mermaid-codemirror h-full"
        extensions={extensions}
        height="100%"
        onChange={onChange}
        theme={isDark ? 'dark' : 'light'}
        value={value}
      />

      <div className="pointer-events-none absolute right-2 top-2 z-30">
        <Button
          aria-label="Copy Mermaid code"
          className={
            isDark
              ? 'pointer-events-auto size-8 rounded-md border-border bg-black/70 p-0 text-muted-foreground shadow-sm backdrop-blur hover:bg-black/80 hover:text-foreground'
              : 'pointer-events-auto size-8 rounded-md border-border bg-white/90 p-0 text-muted-foreground shadow-sm backdrop-blur hover:bg-zinc-100 hover:text-foreground'
          }
          onClick={handleCopy}
          size="icon"
          title={isCopied ? 'Copied' : 'Copy code'}
          variant="outline"
        >
          {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
    </div>
  )
}

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
import type { ResolvedAppearance } from '@/lib/app-themes'

interface MermaidCodeEditorProps {
  appearance: ResolvedAppearance
  fontSize: number
  onChange: (value: string) => void
  value: string
}

const mermaidHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: 'var(--editor-comment)' },
  { tag: t.lineComment, color: 'var(--editor-comment)' },
  { tag: t.keyword, color: 'var(--editor-keyword)' },
  { tag: t.operator, color: 'var(--editor-operator)' },
  { tag: t.string, color: 'var(--editor-string)' },
  { tag: t.number, color: 'var(--editor-number)' },
  { tag: t.labelName, color: 'var(--editor-label)' },
  { tag: t.typeName, color: 'var(--editor-type)' },
  { tag: t.variableName, color: 'var(--editor-variable)' },
  { tag: t.className, color: 'var(--editor-keyword)' },
  { tag: mermaidTags.diagramName, color: 'var(--editor-heading)', fontWeight: '600' },
  { tag: flowchartTags.diagramName, color: 'var(--editor-heading)', fontWeight: '600' },
  { tag: flowchartTags.orientation, color: 'var(--editor-keyword)' },
  { tag: flowchartTags.nodeId, color: 'var(--editor-variable)' },
  { tag: flowchartTags.nodeText, color: 'var(--editor-label)' },
  { tag: flowchartTags.nodeEdge, color: 'var(--editor-operator)' },
  { tag: flowchartTags.nodeEdgeText, color: 'var(--editor-string)' },
  { tag: flowchartTags.link, color: 'var(--editor-operator)' },
  { tag: flowchartTags.keyword, color: 'var(--editor-keyword)' },
  { tag: sequenceTags.diagramName, color: 'var(--editor-heading)', fontWeight: '600' },
  { tag: sequenceTags.keyword1, color: 'var(--editor-keyword)' },
  { tag: sequenceTags.keyword2, color: 'var(--editor-keyword)' },
  { tag: sequenceTags.arrow, color: 'var(--editor-operator)' },
  { tag: sequenceTags.nodeText, color: 'var(--editor-label)' },
  { tag: sequenceTags.messageText1, color: 'var(--editor-variable)' },
  { tag: sequenceTags.messageText2, color: 'var(--editor-string)' },
  { tag: journeyTags.diagramName, color: 'var(--editor-heading)', fontWeight: '600' },
  { tag: journeyTags.keyword, color: 'var(--editor-keyword)' },
  { tag: pieTags.diagramName, color: 'var(--editor-heading)', fontWeight: '600' },
  { tag: pieTags.title, color: 'var(--editor-keyword)' },
  { tag: pieTags.titleText, color: 'var(--editor-string)' },
  { tag: requirementTags.diagramName, color: 'var(--editor-heading)', fontWeight: '600' },
  { tag: requirementTags.arrow, color: 'var(--editor-operator)' },
  { tag: requirementTags.keyword, color: 'var(--editor-keyword)' },
  { tag: ganttTags.diagramName, color: 'var(--editor-heading)', fontWeight: '600' },
  { tag: ganttTags.keyword, color: 'var(--editor-keyword)' },
  { tag: mindmapTags.diagramName, color: 'var(--editor-heading)', fontWeight: '600' },
  { tag: mindmapTags.lineText1, color: 'var(--editor-variable)' },
  { tag: mindmapTags.lineText2, color: 'var(--editor-string)' },
  { tag: mindmapTags.lineText3, color: 'var(--editor-label)' },
  { tag: mindmapTags.lineText4, color: 'var(--editor-keyword)' },
  { tag: mindmapTags.lineText5, color: 'var(--editor-operator)' },
])

export function MermaidCodeEditor({
  appearance,
  fontSize,
  onChange,
  value,
}: MermaidCodeEditorProps) {
  const [isCopied, setIsCopied] = useState(false)

  const mermaidEditorTheme = useMemo(
    () =>
      EditorView.theme(
        {
          '&': {
            backgroundColor: 'var(--editor-bg)',
            color: 'var(--editor-foreground)',
            height: '100%',
          },
          '.cm-scroller': {
            fontFamily: 'var(--font-mono)',
            overflow: 'auto',
          },
          '.cm-content': {
            minHeight: '100%',
            padding: '0 0 0.35rem 0 !important',
          },
          '.cm-line': {
            padding: '0 10px 0 0 !important',
          },
          '.cm-gutters': {
            backgroundColor: 'var(--editor-gutter)',
            borderRight: '1px solid var(--editor-gutter-border)',
            color: 'var(--editor-gutter-foreground)',
          },
          '.cm-lineNumbers .cm-gutterElement': {
            padding: '0 12px 0 12px !important',
          },
          '.cm-activeLine': {
            backgroundColor: 'var(--editor-active-line)',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'var(--editor-active-line)',
          },
          '.cm-selectionBackground, ::selection': {
            backgroundColor: 'var(--editor-selection)',
          },
          '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: 'var(--editor-caret)',
          },
          '.cm-focused': {
            outline: 'none',
          },
        },
        { dark: appearance === 'dark' },
      ),
    [appearance],
  )

  const fontSizeTheme = useMemo<Extension>(
    () =>
      EditorView.theme({
        '.cm-content, .cm-gutter': {
          fontSize: `${fontSize}px`,
        },
      }),
    [fontSize],
  )

  const extensions = useMemo(
    () => [mermaid(), foldByIndent(), syntaxHighlighting(mermaidHighlightStyle), mermaidEditorTheme, fontSizeTheme],
    [fontSizeTheme, mermaidEditorTheme],
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
        theme={appearance}
        value={value}
      />

      <div className="pointer-events-none absolute right-2 top-2 z-30">
        <Button
          aria-label="Copy Mermaid code"
          className="pointer-events-auto size-8 rounded-md border-border bg-[var(--editor-copy-surface)] p-0 text-muted-foreground shadow-sm backdrop-blur hover:bg-[var(--editor-copy-hover)] hover:text-foreground"
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

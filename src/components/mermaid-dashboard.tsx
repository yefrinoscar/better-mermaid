'use client'

import type { DiagramColors } from 'beautiful-mermaid'
import {
  Copy,
  Download,
  Expand,
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { presets, type DiagramPreset } from '@/presets'
import { MermaidCodeEditor } from '@/components/mermaid-code-editor'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  DEFAULT_DIAGRAM_THEME,
  readPreferences,
  writePreferences,
} from '@/lib/app-preferences'
import {
  buildClaroFlowchartSource,
  claroMermaidFont,
  getClaroMermaidColors,
} from '@/lib/claro-mermaid-theme'
import { polishClaroSvgCorners } from '@/lib/claro-svg-polish'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAppTheme } from '@/components/theme-provider'

interface GraphDocument {
  id: string
  title: string
  code: string
  sourcePresetId: string | null
}

interface AppState {
  activeGraphId: string
  codeFontSize: number
  theme: string
  /** Used by “Use defaults” and first visit when no saved theme. */
  defaultDiagramTheme: string
  transparent: boolean
  graphs: GraphDocument[]
}

interface RenderState {
  canExport: boolean
  colors: DiagramColors
  error: string
  previewNote: string
  renderTime: string
  status: 'loading' | 'good' | 'error'
  svg: string
}

interface RemoteGraph {
  id: string
  title: string
  code: string
  sourcePresetId: string | null
}

interface RemoteGraphState {
  activeGraphId: string
  codeFontSize: number
  theme: string
  transparent: boolean
  graphs: RemoteGraph[]
}

type MermaidModule = typeof import('beautiful-mermaid')

const STORAGE_KEY = 'better-mermaid-next:v3'
const DEFAULT_CODE_FONT_SIZE = 16
const DEFAULT_THEME = DEFAULT_DIAGRAM_THEME
const DEFAULT_CODE = `graph TD
  Start[Start] --> Draft[Edit Mermaid]
  Draft --> Render[Render preview]
  Render --> Share[Export SVG]
`
const THEME_NAMES = [
  'claro',
  'catppuccin-latte',
  'catppuccin-mocha',
  'dracula',
  'github-dark',
  'github-light',
  'nord',
  'nord-light',
  'one-dark',
  'solarized-dark',
  'solarized-light',
  'tokyo-night',
  'tokyo-night-light',
  'tokyo-night-storm',
  'zinc-dark',
  'zinc-light',
]
const fallbackColors: DiagramColors = {
  ...getClaroMermaidColors('dark'),
}
const themeNames = [...THEME_NAMES].sort((left, right) =>
  formatThemeName(left).localeCompare(formatThemeName(right)),
)

let mermaidModulePromise: Promise<MermaidModule> | null = null

function isFlowchartHeader(code: string): boolean {
  const first = code
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith('%%'))
  if (!first) {
    return false
  }
  return /^(graph|flowchart)\s+(TD|TB|LR|BT|RL)\b/i.test(first)
}

export function MermaidDashboard() {
  const { resolvedTheme, setUiTheme, uiTheme } = useAppTheme()
  const [state, setState] = useState<AppState>(createDefaultState)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [isRemoteReady, setIsRemoteReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [isAuthWorking, setIsAuthWorking] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [renderState, setRenderState] = useState<RenderState>({
    canExport: false,
    colors: fallbackColors,
    error: '',
    previewNote: 'Loading renderer...',
    renderTime: '--',
    status: 'loading',
    svg: '',
  })

  const previewRef = useRef<HTMLDivElement | null>(null)
  const renderCacheRef = useRef<Map<string, string>>(new Map())
  const stateRef = useRef(state)
  const renderIdRef = useRef(0)
  const copyResetRef = useRef<number | null>(null)
  const syncTimerRef = useRef<number | null>(null)
  const syncInFlightRef = useRef<Promise<void> | null>(null)
  const syncQueuedRef = useRef(false)
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null)

  const activeGraph = useMemo(() => getActiveGraph(state), [state])
  const debouncedCode = useDebouncedValue(activeGraph.code, 120)
  const claroUiVariant = resolvedTheme === 'light' ? 'light' : 'dark'
  const debouncedCodeForRender = useMemo(() => {
    if (state.theme !== 'claro' || !isFlowchartHeader(debouncedCode)) {
      return debouncedCode
    }
    return buildClaroFlowchartSource(debouncedCode, claroUiVariant)
  }, [claroUiVariant, debouncedCode, state.theme])
  const previewStyle = useMemo(
    () =>
      ({
        '--diagram-accent': renderState.colors.accent ?? renderState.colors.line ?? renderState.colors.fg,
        '--diagram-bg':
          state.theme === 'claro'
            ? resolvedTheme === 'dark'
              ? '#0c0c0c'
              : 'transparent'
            : renderState.colors.bg,
        '--diagram-ink': renderState.colors.fg,
        '--diagram-line': renderState.colors.border ?? renderState.colors.line ?? renderState.colors.fg,
        '--diagram-surface': renderState.colors.surface ?? renderState.colors.bg,
      }) as CSSProperties,
    [renderState.colors, resolvedTheme, state.theme],
  )

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null

    setState(loadSavedState())
    setIsHydrated(true)

    try {
      supabaseRef.current = createSupabaseBrowserClient()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Supabase env missing')
      setIsAuthReady(true)
      setIsRemoteReady(false)

      return () => {
        if (subscription) {
          subscription.unsubscribe()
        }
      }
    }

    const supabase = supabaseRef.current

    if (!supabase) {
      setIsAuthReady(true)
      setIsRemoteReady(false)

      return () => {
        if (subscription) {
          subscription.unsubscribe()
        }
      }
    }

    void (async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          setAuthError(error.message)
        }

        setAuthUser(user ?? null)
        setIsAuthReady(true)

        if (user) {
          const remoteState = await readRemoteState()

          if (remoteState) {
            const prefs = readPreferences()
            setState({
              ...remoteState,
              defaultDiagramTheme:
                THEME_NAMES.includes(prefs.defaultDiagramTheme) && prefs.defaultDiagramTheme
                  ? prefs.defaultDiagramTheme
                  : DEFAULT_THEME,
            })
          }
          setIsRemoteReady(true)
        } else {
          setIsRemoteReady(false)
        }
      } finally {
        setIsAuthReady(true)
      }
    })()

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
      setAuthError(null)
    })

    subscription = authSubscription

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthReady) {
      return
    }

    if (!authUser) {
      setIsRemoteReady(false)
      return
    }

    void (async () => {
      const remoteState = await readRemoteState()

      if (remoteState) {
        const prefs = readPreferences()
        setState({
          ...remoteState,
          defaultDiagramTheme:
            THEME_NAMES.includes(prefs.defaultDiagramTheme) && prefs.defaultDiagramTheme
              ? prefs.defaultDiagramTheme
              : DEFAULT_THEME,
        })
      }

      setIsRemoteReady(true)
    })()
  }, [authUser, isAuthReady])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [isHydrated, state])

  useEffect(() => {
    if (!isHydrated || !isRemoteReady || !authUser) {
      return
    }

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
    }

    syncTimerRef.current = window.setTimeout(() => {
      startRemoteSync()
    }, 220)

    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current)
      }
    }
  }, [authUser, isHydrated, isRemoteReady, state])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') {
        return
      }

      if (!authUser || !isRemoteReady) {
        return
      }

      void writeRemoteState(stateRef.current, { keepalive: true })
    }

    const handleBeforeUnload = () => {
      if (!authUser || !isRemoteReady) {
        return
      }

      void writeRemoteState(stateRef.current, { keepalive: true })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [authUser, isRemoteReady])

  function startRemoteSync() {
    if (!authUser || !isRemoteReady) {
      return
    }

    if (syncInFlightRef.current) {
      syncQueuedRef.current = true
      return
    }

    syncInFlightRef.current = (async () => {
      await writeRemoteState(stateRef.current)
    })()

    void syncInFlightRef.current.finally(() => {
      syncInFlightRef.current = null

      if (syncQueuedRef.current) {
        syncQueuedRef.current = false
        startRemoteSync()
      }
    })
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === previewRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)

      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current)
      }

      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const renderId = ++renderIdRef.current
    const startedAt = performance.now()

    setRenderState((current) => ({
      ...current,
      canExport: false,
      error: '',
      previewNote: current.svg ? current.previewNote : 'Loading renderer...',
      status: 'loading',
    }))

    void (async () => {
      try {
        const mermaid = await loadMermaidModule()

        if (renderId !== renderIdRef.current) {
          return
        }

        const colors =
          state.theme === 'claro'
            ? getClaroMermaidColors(claroUiVariant)
            : (mermaid.THEMES[state.theme] ?? mermaid.THEMES['github-dark'])
        let svg = mermaid.renderMermaidSVG(
          state.theme === 'claro' ? debouncedCodeForRender : debouncedCode,
          {
            ...colors,
            font: state.theme === 'claro' ? `${claroMermaidFont}, sans-serif` : 'Sora, sans-serif',
            interactive: true,
            layerSpacing: 40,
            nodeSpacing: 24,
            padding: 40,
            transparent: state.theme === 'claro' ? true : state.transparent,
          },
        )
        if (state.theme === 'claro' && isFlowchartHeader(debouncedCode)) {
          svg = polishClaroSvgCorners(svg)
        }

        renderCacheRef.current.set(activeGraph.id, svg)

        if (renderId !== renderIdRef.current) {
          return
        }

        setRenderState({
          canExport: true,
          colors,
          error: '',
          previewNote: buildPreviewNote(activeGraph, state.theme, state.transparent),
          renderTime: formatDuration(performance.now() - startedAt),
          status: 'good',
          svg,
        })
      } catch (error) {
        if (renderId !== renderIdRef.current) {
          return
        }

        const cachedSvg = renderCacheRef.current.get(activeGraph.id) ?? ''
        const message = error instanceof Error ? error.message : String(error)

        setRenderState((current) => ({
          ...current,
          canExport: false,
          error: message,
          previewNote: cachedSvg
            ? 'Syntax issue. Showing the last valid preview.'
            : 'Fix the Mermaid syntax to render this graph.',
          renderTime: '--',
          status: 'error',
          svg: cachedSvg,
        }))
      }
    })()
  }, [
    activeGraph.id,
    claroUiVariant,
    debouncedCode,
    debouncedCodeForRender,
    state.theme,
    state.transparent,
  ])

  async function handleCopy() {
    if (!renderState.canExport || !renderState.svg) {
      return
    }

    try {
      await navigator.clipboard.writeText(renderState.svg)
      setCopyLabel('Copied')

      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current)
      }

      copyResetRef.current = window.setTimeout(() => {
        setCopyLabel('Copy')
      }, 1200)
    } catch {
      setRenderState((current) => ({
        ...current,
        error: 'Clipboard access is blocked here.',
        status: 'error',
      }))
    }
  }

  function handleDownload() {
    if (!renderState.canExport || !renderState.svg) {
      return
    }

    const blob = new Blob([renderState.svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${slugify(activeGraph.title || activeGraph.id)}.svg`
    link.click()

    window.setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 0)
  }

  async function handleToggleFullscreen() {
    const preview = previewRef.current

    if (!preview) {
      return
    }

    if (document.fullscreenElement === preview) {
      await document.exitFullscreen()
      return
    }

    await preview.requestFullscreen()
  }

  function handleCodeChange(code: string) {
    updateGraph(activeGraph.id, { code })
  }

  function updateGraph(graphId: string, patch: Partial<GraphDocument>) {
    setState((current) => ({
      ...current,
      graphs: current.graphs.map((graph) =>
        graph.id === graphId
          ? {
              ...graph,
              ...patch,
            }
          : graph,
      ),
    }))
  }

  function addBlankGraph() {
    setState((current) => {
      const nextGraph = createGraph(`Graph ${current.graphs.length + 1}`, DEFAULT_CODE)

      return {
        ...current,
        activeGraphId: nextGraph.id,
        graphs: [...current.graphs, nextGraph],
      }
    })
  }

  function applyPresetToCurrent(preset: DiagramPreset) {
    updateGraph(activeGraph.id, {
      code: preset.code,
      sourcePresetId: preset.id,
    })
  }

  function addGraphFromPreset(preset: DiagramPreset) {
    setState((current) => {
      const nextGraph = createGraph(preset.label, preset.code, preset.id)

      return {
        ...current,
        activeGraphId: nextGraph.id,
        graphs: [...current.graphs, nextGraph],
      }
    })
  }

  function removeCurrentGraph() {
    setState((current) => {
      if (current.graphs.length <= 1) {
        return current
      }

      const remainingGraphs = current.graphs.filter((graph) => graph.id !== current.activeGraphId)

      return {
        ...current,
        activeGraphId: remainingGraphs[0].id,
        graphs: remainingGraphs,
      }
    })
  }

  function removeGraph(graphId: string) {
    setState((current) => {
      if (current.graphs.length <= 1) {
        return current
      }

      const remainingGraphs = current.graphs.filter((graph) => graph.id !== graphId)

      return {
        ...current,
        activeGraphId:
          current.activeGraphId === graphId ? remainingGraphs[0].id : current.activeGraphId,
        graphs: remainingGraphs,
      }
    })
  }

  function useDefaults() {
    const prefs = readPreferences()
    setState(createDefaultState(prefs.defaultDiagramTheme))
    setIsConfigOpen(false)
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!authEmail || !authPassword) {
      setAuthError('Email and password are required')
      setAuthNotice(null)
      return
    }

    const supabase = supabaseRef.current

    if (!supabase) {
      setAuthError('Supabase client is not ready')
      setAuthNotice(null)
      return
    }

    setIsAuthWorking(true)
    setAuthError(null)
    setAuthNotice(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })

    setIsAuthWorking(false)

    if (error) {
      setAuthError(error.message)
      return
    }

    setAuthPassword('')
    setIsAuthModalOpen(false)
  }

  async function handleSignUp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (!authEmail || !authPassword) {
      setAuthError('Email and password are required')
      setAuthNotice(null)
      return
    }

    const supabase = supabaseRef.current

    if (!supabase) {
      setAuthError('Supabase client is not ready')
      setAuthNotice(null)
      return
    }

    setIsAuthWorking(true)
    setAuthError(null)
    setAuthNotice(null)

    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    })

    setIsAuthWorking(false)

    if (error) {
      setAuthError(error.message)
      return
    }

    setAuthPassword('')
    setAuthNotice('Check your email. We sent you a confirmation link to complete registration.')
    setAuthMode('sign-in')
  }

  async function handleSignOut() {
    const supabase = supabaseRef.current

    if (!supabase) {
      return
    }

    setAuthError(null)
    setAuthNotice(null)
    await supabase.auth.signOut()
    setIsRemoteReady(false)
  }

  const statusText =
    renderState.status === 'good'
      ? 'Ready'
      : renderState.status === 'loading'
        ? 'Rendering'
        : 'Syntax issue'
  const isRemoteLoading = Boolean(authUser) && isAuthReady && !isRemoteReady
  const showInitialSkeleton = !isHydrated || !isAuthReady
  const showWorkspaceSkeleton = showInitialSkeleton || isRemoteLoading

  return (
    <>
      <div
        className={cn(
          'grid h-dvh gap-2 p-2 md:grid-cols-[13rem_minmax(0,1fr)]',
          isSidebarCollapsed && 'md:grid-cols-[0_minmax(0,1fr)]',
        )}
      >
        <aside
          className={cn(
            'hidden min-h-0 flex-col rounded-lg border border-border bg-card/90 p-2 md:flex',
            isSidebarCollapsed && 'pointer-events-none w-0 overflow-hidden border-transparent p-0 opacity-0',
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Graphs
              </p>
            </div>

            <Button
              aria-label="Collapse sidebar"
              onClick={() => setIsSidebarCollapsed(true)}
              size="icon"
              variant="ghost"
            >
              <PanelLeftClose className="size-3.5" />
            </Button>
          </div>

          <Button className="mb-2 w-full justify-start" onClick={addBlankGraph} size="sm" variant="secondary">
            <Plus className="size-3.5" />
            Add graph
          </Button>

          <div className="min-h-0 flex-1 space-y-1 overflow-auto">
            {showWorkspaceSkeleton ? (
              <GraphListSkeleton />
            ) : (
              state.graphs.map((graph) => (
              <div
                className={cn(
                  'flex items-center gap-1 rounded-md border p-1 transition-colors',
                  graph.id === activeGraph.id
                    ? 'border-primary/25 bg-primary text-primary-foreground'
                    : 'border-border bg-secondary text-foreground',
                )}
                key={graph.id}
              >
                <button
                  aria-selected={graph.id === activeGraph.id}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs"
                  onClick={() => setState((current) => ({ ...current, activeGraphId: graph.id }))}
                  role="tab"
                  title={graph.title}
                  type="button"
                >
                  <span className="truncate">{graph.title}</span>
                  <ChevronHint active={graph.id === activeGraph.id} />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label={`Open actions for ${graph.title}`}
                      className={cn(
                        'size-7 px-0',
                        graph.id === activeGraph.id
                          ? 'border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15'
                          : 'border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                      size="icon"
                      variant="ghost"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      disabled={state.graphs.length <= 1}
                      onSelect={() => removeGraph(graph.id)}
                      variant="destructive"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              ))
            )}
          </div>

          <div className="mt-2 space-y-2 border-t border-border pt-2">
            {authUser ? (
              <>
                <span className="block truncate rounded-md border border-border bg-secondary px-2 py-1.5 text-[11px] text-muted-foreground">
                  {authUser.email}
                </span>
                <Button className="w-full" onClick={handleSignOut} size="sm" variant="outline">
                  Sign out
                </Button>
              </>
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  setAuthMode('sign-in')
                  setAuthError(null)
                  setAuthNotice(null)
                  setIsAuthModalOpen(true)
                }}
                size="sm"
                variant="outline"
              >
                Login / Register
              </Button>
            )}
          </div>
        </aside>

        <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-2">
          <header className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border bg-card/90 px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                aria-label={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                onClick={() => setIsSidebarCollapsed((current) => !current)}
                size="icon"
                variant="ghost"
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="size-3.5" />
                ) : (
                  <PanelLeftClose className="size-3.5" />
                )}
              </Button>

              <Input
                className="h-8 w-36 border-border bg-secondary text-sm md:w-52"
                onChange={(event) => updateGraph(activeGraph.id, { title: event.target.value })}
                value={activeGraph.title ?? ''}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <div className="mr-0.5 hidden items-center rounded-md border border-border p-0.5 sm:flex">
                <Button
                  aria-label="Light UI"
                  className={cn('size-7 px-0', uiTheme === 'light' && 'bg-accent text-accent-foreground')}
                  onClick={() => setUiTheme('light')}
                  size="icon"
                  variant="ghost"
                >
                  <Sun className="size-3.5" />
                </Button>
                <Button
                  aria-label="Dark UI"
                  className={cn('size-7 px-0', uiTheme === 'dark' && 'bg-accent text-accent-foreground')}
                  onClick={() => setUiTheme('dark')}
                  size="icon"
                  variant="ghost"
                >
                  <Moon className="size-3.5" />
                </Button>
                <Button
                  aria-label="Match system theme"
                  className={cn('size-7 px-0', uiTheme === 'system' && 'bg-accent text-accent-foreground')}
                  onClick={() => setUiTheme('system')}
                  size="icon"
                  variant="ghost"
                >
                  <Monitor className="size-3.5" />
                </Button>
              </div>

              <Button onClick={() => setIsConfigOpen(true)} size="sm" variant="ghost">
                <Settings2 className="size-3.5" />
                Config
              </Button>

              <Button onClick={handleToggleFullscreen} size="sm" variant="ghost">
                <Expand className="size-3.5" />
                {isFullscreen ? 'Exit full' : 'Full page'}
              </Button>

              <Button disabled={!renderState.canExport} onClick={handleCopy} size="sm" variant="secondary">
                <Copy className="size-3.5" />
                {copyLabel}
              </Button>

              <Button disabled={!renderState.canExport} onClick={handleDownload} size="sm" variant="secondary">
                <Download className="size-3.5" />
                Download
              </Button>
            </div>
          </header>

          {renderState.error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
              {renderState.error}
            </div>
          ) : null}

          {!authUser && isAuthReady ? (
            <div className="rounded-lg border border-border bg-card/80 px-3 py-2 text-xs text-muted-foreground">
              You are editing locally. Sign in to sync graphs.
            </div>
          ) : null}

          <div className="grid min-h-0 gap-2 xl:grid-cols-[minmax(16rem,24%)_minmax(0,1fr)]">
            <div className="min-h-0 overflow-hidden rounded-lg border border-border bg-card/90">
              {showWorkspaceSkeleton ? (
                <CodePanelSkeleton />
              ) : (
                <MermaidCodeEditor
                  fontSize={state.codeFontSize}
                  onChange={handleCodeChange}
                  uiVariant={resolvedTheme}
                  value={activeGraph.code}
                />
              )}
            </div>

            <div
              className={cn(
                'preview-frame min-h-0 overflow-hidden rounded-lg border border-border',
                state.theme === 'claro'
                  ? resolvedTheme === 'dark'
                    ? 'bg-[#0c0c0c]'
                    : 'bg-transparent'
                  : resolvedTheme === 'light'
                    ? 'bg-[linear-gradient(180deg,#f4f4f5,#fafafa)]'
                    : 'bg-[linear-gradient(180deg,#090b0f,#07080b)]',
              )}
              ref={previewRef}
              style={previewStyle}
            >
              <div className="h-full overflow-auto p-3">
                {showWorkspaceSkeleton ? (
                  <GraphPreviewSkeleton />
                ) : renderState.svg ? (
                  <div
                    className="mermaid-diagram-svg grid min-h-full min-w-full place-items-center [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderState.svg }}
                  />
                ) : (
                  <div className="grid min-h-full min-w-full place-items-center text-sm text-muted-foreground">
                    Preview unavailable for this graph.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Dialog onOpenChange={setIsConfigOpen} open={isConfigOpen}>
        <DialogContent className="max-w-4xl border-border bg-popover p-0 text-popover-foreground">
          <div className="grid max-h-[85dvh] min-h-0 gap-0 md:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="border-b border-border p-5 md:border-b-0 md:border-r">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                  <Settings2 className="size-4" />
                  Configuration
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Keep the defaults if you want speed. Open this only when you want to tune the renderer or load example graphs.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 space-y-4">
                <div className="space-y-2 sm:hidden">
                  <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    App appearance
                  </label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) => {
                      const v = event.target.value
                      if (v === 'light' || v === 'dark' || v === 'system') {
                        setUiTheme(v)
                      }
                    }}
                    value={uiTheme}
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Graph name
                  </label>
                  <Input
                    onChange={(event) => updateGraph(activeGraph.id, { title: event.target.value })}
                    value={activeGraph.title ?? ''}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Mermaid theme
                  </label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        theme: THEME_NAMES.includes(event.target.value) ? event.target.value : DEFAULT_THEME,
                      }))
                    }
                    value={state.theme}
                  >
                    {themeNames.map((theme) => (
                      <option key={theme} value={theme}>
                        {formatThemeName(theme)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Default Mermaid theme
                  </label>
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    Used for new sessions and when you click “Use defaults” in this dialog.
                  </p>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) => {
                      const next =
                        THEME_NAMES.includes(event.target.value) ? event.target.value : DEFAULT_THEME
                      writePreferences({ defaultDiagramTheme: next })
                      setState((current) => ({
                        ...current,
                        defaultDiagramTheme: next,
                      }))
                    }}
                    value={
                      THEME_NAMES.includes(state.defaultDiagramTheme)
                        ? state.defaultDiagramTheme
                        : DEFAULT_THEME
                    }
                  >
                    {themeNames.map((theme) => (
                      <option key={theme} value={theme}>
                        {formatThemeName(theme)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Code font size
                  </label>
                  <Input
                    max={28}
                    min={12}
                    onChange={(event) => {
                      const parsed = Number(event.target.value)

                      setState((current) => ({
                        ...current,
                        codeFontSize:
                          Number.isFinite(parsed) && parsed >= 12 && parsed <= 28
                            ? parsed
                            : DEFAULT_CODE_FONT_SIZE,
                      }))
                    }}
                    type="number"
                    value={state.codeFontSize ?? DEFAULT_CODE_FONT_SIZE}
                  />
                </div>

                <label className="flex items-center gap-2 rounded-md border border-input bg-secondary px-3 py-2 text-sm">
                  <input
                    checked={state.transparent}
                    className="accent-white"
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        transparent: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  Transparent SVG export
                </label>

                <div className="space-y-2 rounded-md border border-input bg-card p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Current graph
                  </p>

                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <div className="flex justify-between gap-2">
                      <span>Status</span>
                      <span className="text-foreground">{statusText}</span>
                    </div>

                    <div className="flex justify-between gap-2">
                      <span>Lines</span>
                      <span className="text-foreground">{countLines(activeGraph.code)}</span>
                    </div>

                    <div className="flex justify-between gap-2">
                      <span>Chars</span>
                      <span className="text-foreground">{activeGraph.code.length}</span>
                    </div>

                    <div className="flex justify-between gap-2">
                      <span>Render</span>
                      <span className="text-foreground">{renderState.renderTime}</span>
                    </div>

                    <p className="pt-1 text-[11px] leading-5 text-muted-foreground">
                      {renderState.error || renderState.previewNote}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Examples</p>
                  <p className="text-xs text-muted-foreground">
                    Hidden from the main UI. Load one into the current graph or add it as a new graph.
                  </p>
                </div>

                <Button onClick={useDefaults} size="sm" variant="outline">
                  <Sparkles className="size-3.5" />
                  Use defaults
                </Button>
              </div>

              <div className="min-h-0 space-y-2 overflow-auto pr-1">
                {presets.map((preset) => (
                  <div
                    className="flex flex-col gap-3 rounded-md border border-input bg-card px-3 py-3 md:flex-row md:items-center md:justify-between"
                    key={preset.id}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{preset.label}</span>
                        <span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {preset.kind}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{preset.description}</p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Button onClick={() => applyPresetToCurrent(preset)} size="sm" variant="secondary">
                        Use current
                      </Button>
                      <Button onClick={() => addGraphFromPreset(preset)} size="sm" variant="outline">
                        Add graph
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="mt-4 border-t border-border pt-4">
                <div className="flex w-full flex-wrap justify-between gap-2">
                  <Button
                    disabled={state.graphs.length <= 1}
                    onClick={removeCurrentGraph}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Delete current graph
                  </Button>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={addBlankGraph} size="sm" variant="secondary">
                      <Plus className="size-3.5" />
                      New blank graph
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setIsAuthModalOpen(open)
          if (!open) {
            setAuthError(null)
            setAuthNotice(null)
          }
        }}
        open={isAuthModalOpen}
      >
        <DialogContent className="max-w-sm border-border bg-popover p-5 text-popover-foreground">
          <DialogHeader className="space-y-2 pb-1 text-left">
            <DialogTitle className="text-base font-semibold">{authMode === 'sign-in' ? 'Sign in' : 'Create account'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Use your email and password to sync graphs with Supabase.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={authMode === 'sign-in' ? handleSignIn : (event) => void handleSignUp(event)}
          >
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Email
              </label>
              <Input
                autoComplete="email"
                className="h-9"
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="email"
                type="email"
                value={authEmail}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Password
              </label>
              <Input
                autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'}
                className="h-9"
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="password"
                type="password"
                value={authPassword}
              />
            </div>

            {authError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive-foreground">
                {authError}
              </p>
            ) : null}

            {authNotice ? (
              <p className="rounded-md border border-border bg-secondary px-2 py-1.5 text-xs text-foreground">
                {authNotice}
              </p>
            ) : null}

            <DialogFooter className="border-t border-border pt-3">
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  disabled={isAuthWorking}
                  onClick={() => setAuthMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {authMode === 'sign-in' ? 'Need account?' : 'Have account?'}
                </Button>
                <Button disabled={isAuthWorking} size="sm" type="submit" variant="secondary">
                  {authMode === 'sign-in' ? 'Sign in' : 'Sign up'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function GraphListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 7 }).map((_, index) => (
        <div className="animate-pulse rounded-md border border-border bg-secondary px-3 py-2" key={index}>
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function CodePanelSkeleton() {
  return (
    <div className="h-full w-full bg-secondary p-3 font-mono text-[11px]">
      <div className="h-full space-y-2">
        {Array.from({ length: 16 }).map((_, index) => (
          <div className="animate-pulse" key={index}>
            <div
              className="h-3 rounded bg-muted"
              style={{ width: `${88 - (index % 5) * 11}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function GraphPreviewSkeleton() {
  return (
    <div className="grid min-h-full min-w-full place-items-stretch">
      <div className="h-full w-full space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="h-4 w-44 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div className="h-16 animate-pulse rounded border border-border bg-secondary" key={index} />
          ))}
        </div>
        <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

function ChevronHint({ active }: { active: boolean }) {
  return (
    <span className={cn('text-[10px]', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>›</span>
  )
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [delay, value])

  return debouncedValue
}

function loadMermaidModule() {
  mermaidModulePromise ??= import('beautiful-mermaid')

  return mermaidModulePromise
}

function getActiveGraph(state: AppState) {
  return state.graphs.find((graph) => graph.id === state.activeGraphId) ?? state.graphs[0]
}

function loadSavedState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return createDefaultState()
    }

    const parsed = JSON.parse(raw) as Partial<AppState> & {
      documents?: Record<string, string>
      activeTabId?: string
    }

    if (Array.isArray(parsed.graphs) && parsed.graphs.length > 0) {
      const graphs = parsed.graphs
        .map((graph, index) => {
          if (!graph || typeof graph !== 'object') {
            return null
          }

          const title = typeof graph.title === 'string' && graph.title.trim() ? graph.title : `Graph ${index + 1}`
          const code = typeof graph.code === 'string' && graph.code.trim() ? graph.code : DEFAULT_CODE

          return {
            code,
            id: typeof graph.id === 'string' && graph.id ? graph.id : createGraphId(),
            sourcePresetId:
              typeof graph.sourcePresetId === 'string' && graph.sourcePresetId ? graph.sourcePresetId : null,
            title,
          } satisfies GraphDocument
        })
        .filter((graph): graph is GraphDocument => graph !== null)

      if (graphs.length > 0) {
        const prefs = readPreferences()
        const savedDefault =
          typeof (parsed as Partial<AppState>).defaultDiagramTheme === 'string' &&
          THEME_NAMES.includes((parsed as Partial<AppState>).defaultDiagramTheme as string)
            ? ((parsed as Partial<AppState>).defaultDiagramTheme as string)
            : THEME_NAMES.includes(prefs.defaultDiagramTheme)
              ? prefs.defaultDiagramTheme
              : DEFAULT_THEME
        return {
          activeGraphId: graphs.some((graph) => graph.id === parsed.activeGraphId)
            ? (parsed.activeGraphId as string)
            : graphs[0].id,
          codeFontSize:
            typeof parsed.codeFontSize === 'number' && parsed.codeFontSize >= 12 && parsed.codeFontSize <= 28
              ? parsed.codeFontSize
              : DEFAULT_CODE_FONT_SIZE,
          defaultDiagramTheme: savedDefault,
          graphs,
          theme:
            typeof parsed.theme === 'string' && THEME_NAMES.includes(parsed.theme)
              ? parsed.theme
              : DEFAULT_THEME,
          transparent: Boolean(parsed.transparent),
        }
      }
    }

    if (parsed.documents && typeof parsed.documents === 'object') {
      const migratedGraphs = Object.values(parsed.documents)
        .filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
        .map((code, index) => createGraph(`Graph ${index + 1}`, code))

      if (migratedGraphs.length > 0) {
        const prefs = readPreferences()
        return {
          activeGraphId: migratedGraphs[0].id,
          codeFontSize:
            typeof parsed.codeFontSize === 'number' && parsed.codeFontSize >= 12 && parsed.codeFontSize <= 28
              ? parsed.codeFontSize
              : DEFAULT_CODE_FONT_SIZE,
          defaultDiagramTheme: THEME_NAMES.includes(prefs.defaultDiagramTheme)
            ? prefs.defaultDiagramTheme
            : DEFAULT_THEME,
          graphs: migratedGraphs,
          theme:
            typeof parsed.theme === 'string' && THEME_NAMES.includes(parsed.theme)
              ? parsed.theme
              : DEFAULT_THEME,
          transparent: Boolean(parsed.transparent),
        }
      }
    }

    return createDefaultState()
  } catch {
    return createDefaultState()
  }
}

function createDefaultState(diagramTheme: string = readPreferences().defaultDiagramTheme): AppState {
  const graph = createGraph('Graph 1', presets[0]?.code ?? DEFAULT_CODE, presets[0]?.id ?? null)
  const theme = THEME_NAMES.includes(diagramTheme) ? diagramTheme : DEFAULT_THEME

  return {
    activeGraphId: graph.id,
    codeFontSize: DEFAULT_CODE_FONT_SIZE,
    defaultDiagramTheme: theme,
    graphs: [graph],
    theme,
    transparent: false,
  }
}

function createGraph(title: string, code: string, sourcePresetId: string | null = null): GraphDocument {
  return {
    code,
    id: createGraphId(),
    sourcePresetId,
    title,
  }
}

function createGraphId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `graph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function countLines(code: string) {
  return code.length === 0 ? 0 : code.split(/\r?\n/).length
}

function buildPreviewNote(graph: GraphDocument, theme: string, transparent: boolean) {
  return `${graph.title} rendered with ${formatThemeName(theme)}${transparent ? ' and transparent export on' : ''}.`
}

function formatDuration(duration: number) {
  if (duration < 1) {
    return '<1 ms'
  }

  if (duration < 10) {
    return `${duration.toFixed(1)} ms`
  }

  return `${Math.round(duration)} ms`
}

function formatThemeName(theme: string) {
  return theme
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'graph'
}

async function readRemoteState(): Promise<AppState | null> {
  try {
    const response = await fetch('/api/graphs', {
      method: 'GET',
    })

    if (response.status === 401) {
      return null
    }

    if (!response.ok) {
      return null
    }

    const body = (await response.json()) as { state?: RemoteGraphState | null }

    if (!body.state || !isRemoteState(body.state)) {
      return null
    }

    const prefs = readPreferences()
    return {
      activeGraphId: body.state.activeGraphId,
      codeFontSize: clampCodeFontSize(body.state.codeFontSize),
      defaultDiagramTheme: THEME_NAMES.includes(prefs.defaultDiagramTheme)
        ? prefs.defaultDiagramTheme
        : DEFAULT_THEME,
      graphs: body.state.graphs,
      theme: THEME_NAMES.includes(body.state.theme) ? body.state.theme : DEFAULT_THEME,
      transparent: body.state.transparent,
    }
  } catch {
    return null
  }
}

async function writeRemoteState(state: AppState, options?: { keepalive?: boolean }) {
  try {
    const { defaultDiagramTheme: _omit, ...apiPayload } = state
    const response = await fetch('/api/graphs', {
      body: JSON.stringify(apiPayload),
      headers: {
        'content-type': 'application/json',
      },
      keepalive: Boolean(options?.keepalive),
      method: 'POST',
    })

    if (response.status === 401) {
      return
    }
  } catch {
    // ignore network errors for local-first experience
  }
}

function isRemoteState(value: unknown): value is RemoteGraphState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Partial<RemoteGraphState>

  if (typeof payload.activeGraphId !== 'string') {
    return false
  }

  if (typeof payload.codeFontSize !== 'number') {
    return false
  }

  if (typeof payload.theme !== 'string') {
    return false
  }

  if (typeof payload.transparent !== 'boolean') {
    return false
  }

  if (!Array.isArray(payload.graphs)) {
    return false
  }

  return payload.graphs.every(
    (graph) =>
      graph &&
      typeof graph.id === 'string' &&
      typeof graph.title === 'string' &&
      typeof graph.code === 'string' &&
      (typeof graph.sourcePresetId === 'string' || graph.sourcePresetId === null),
  )
}

function clampCodeFontSize(size: number) {
  if (!Number.isFinite(size)) {
    return DEFAULT_CODE_FONT_SIZE
  }

  if (size < 12) {
    return 12
  }

  if (size > 28) {
    return 28
  }

  return Math.round(size)
}

'use client'

import type { DiagramColors } from 'beautiful-mermaid'
import {
  Download,
  ExternalLink,
  Expand,
  Minus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import type { User } from '@supabase/supabase-js'
import {
  useAppTheme,
} from '@/components/app-theme-provider'
import { AppThemeToggle } from '@/components/app-theme-toggle'
import { defaultPresetId, presets, type DiagramPreset } from '@/presets'
import { MermaidCodeEditor } from '@/components/mermaid-code-editor'
import { Button } from '@/components/ui/button'
import {
  decorateSvgForTheme,
  DEFAULT_THEME,
  FALLBACK_THEME_COLORS,
  formatThemeName,
  isSupportedTheme,
  MERMAID_THEME_OPTIONS,
  resolveThemeDefinition,
  type DiagramThemeDefinition,
} from '@/lib/diagram-themes'
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
import type { ResolvedAppearance } from '@/lib/app-themes'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

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

interface PreviewViewport {
  scale: number
  x: number
  y: number
}

interface SvgViewBox {
  height: number
  minX: number
  minY: number
  width: number
}

type MermaidModule = typeof import('beautiful-mermaid')
type NativeMermaidModule = typeof import('mermaid')

const STORAGE_KEY = 'better-mermaid-next:v3'
const DEFAULT_CODE_FONT_SIZE = 16
const DEFAULT_PREVIEW_VIEWPORT: PreviewViewport = {
  scale: 1,
  x: 0,
  y: 0,
}
const MIN_PREVIEW_SCALE = 0.5
const MAX_PREVIEW_SCALE = 3
const PREVIEW_ZOOM_STEP = 0.2
const DEFAULT_CODE = `graph TD
  Start[Start] --> Draft[Edit Mermaid]
  Draft --> Render[Render preview]
  Render --> Share[Export SVG]
`
const fallbackColors: DiagramColors = FALLBACK_THEME_COLORS

let mermaidModulePromise: Promise<MermaidModule> | null = null
let nativeMermaidModulePromise: Promise<NativeMermaidModule> | null = null
let nativeMermaidRenderCount = 0

export function MermaidDashboard() {
  const { resolvedAppearance } = useAppTheme()
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [renderState, setRenderState] = useState<RenderState>({
    canExport: false,
    colors: fallbackColors,
    error: '',
    previewNote: 'Loading renderer...',
    renderTime: '--',
    status: 'loading',
    svg: '',
  })

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
  const previewStyle = useMemo(
    () =>
      ({
        '--diagram-accent': renderState.colors.accent ?? renderState.colors.line ?? renderState.colors.fg,
        '--diagram-bg': renderState.colors.bg,
        '--diagram-ink': renderState.colors.fg,
        '--diagram-line': renderState.colors.border ?? renderState.colors.line ?? renderState.colors.fg,
        '--diagram-surface': renderState.colors.surface ?? renderState.colors.bg,
        background: state.transparent ? 'transparent' : renderState.colors.bg,
      }) as CSSProperties,
    [renderState.colors, state.transparent],
  )

  async function renderSvgWithCurrentTheme(transparent: boolean) {
    return renderSvgForCode(activeGraph.code, state.theme, resolvedAppearance, transparent)
  }

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
            setState(remoteState)
          }
          setIsRemoteReady(true)
        } else {
          setIsRemoteReady(false)
        }
      } catch (error) {
        setAuthUser(null)
        setIsRemoteReady(false)
        setAuthError(error instanceof Error ? error.message : 'Unable to reach Supabase')
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
        setState(remoteState)
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
    return () => {
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
        if (renderId !== renderIdRef.current) {
          return
        }

        const { svg: decoratedSvg, themeDefinition } = await renderSvgForCode(
          debouncedCode,
          state.theme,
          resolvedAppearance,
          true,
        )

        renderCacheRef.current.set(activeGraph.id, decoratedSvg)

        if (renderId !== renderIdRef.current) {
          return
        }

        setRenderState({
          canExport: true,
          colors: themeDefinition.colors,
          error: '',
          previewNote: buildPreviewNote(activeGraph, state.theme, state.transparent),
          renderTime: formatDuration(performance.now() - startedAt),
          status: 'good',
          svg: decoratedSvg,
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
  }, [activeGraph.id, debouncedCode, resolvedAppearance, state.theme])

  function handleDownload() {
    if (!renderState.canExport || !renderState.svg) {
      return
    }
    void (async () => {
      try {
        const { svg } = await renderSvgWithCurrentTheme(state.transparent)
        const pngBlob = await rasterizeSvgToPngBlob(svg)

        downloadBlob(pngBlob, `${slugify(activeGraph.title || activeGraph.id)}.png`)
      } catch (error) {
        setRenderState((current) => ({
          ...current,
          error: getPngExportErrorMessage(error),
          status: 'error',
        }))
      }
    })()
  }

  function handleOpenPng() {
    if (!renderState.canExport || !renderState.svg) {
      return
    }

    void (async () => {
      try {
        const { svg } = await renderSvgWithCurrentTheme(state.transparent)
        const pngUrl = await rasterizeSvgToPng(svg)
        const openedWindow = window.open(pngUrl, '_blank', 'noopener,noreferrer')

        if (!openedWindow) {
          throw new Error('popup-blocked')
        }

        window.setTimeout(() => {
          URL.revokeObjectURL(pngUrl)
        }, 30000)
      } catch (error) {
        setRenderState((current) => ({
          ...current,
          error: getOpenPngErrorMessage(error),
          status: 'error',
        }))
      }
    })()
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
    setState(createDefaultState())
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

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      })

      if (error) {
        setAuthError(error.message)
        return
      }

      setAuthPassword('')
      setIsAuthModalOpen(false)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in')
    } finally {
      setIsAuthWorking(false)
    }
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

    try {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      })

      if (error) {
        setAuthError(error.message)
        return
      }

      setAuthPassword('')
      setAuthNotice('Check your email. We sent you a confirmation link to complete registration.')
      setAuthMode('sign-in')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign up')
    } finally {
      setIsAuthWorking(false)
    }
  }

  async function handleSignOut() {
    const supabase = supabaseRef.current

    if (!supabase) {
      return
    }

    setAuthError(null)
    setAuthNotice(null)

    try {
      await supabase.auth.signOut()
      setIsRemoteReady(false)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign out')
    }
  }

  function openAuthDialog(mode: 'sign-in' | 'sign-up') {
    setAuthMode(mode)
    setAuthError(null)
    setAuthNotice(null)
    setIsAuthModalOpen(true)
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
            'hidden min-h-0 flex-col rounded-[10px] border border-border bg-card/90 p-2 md:flex',
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
                  'flex items-center gap-1 rounded-[10px] border p-1 transition-colors',
                  graph.id === activeGraph.id
                    ? 'border-primary/20 bg-primary text-primary-foreground'
                    : 'border-border bg-secondary text-foreground',
                )}
                key={graph.id}
              >
                <button
                  aria-selected={graph.id === activeGraph.id}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[10px] px-2 py-1.5 text-left text-xs"
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
                          ? 'border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20'
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
              <>
                <div
                  className="rounded-[14px] border px-3 py-3"
                  style={{
                    background: 'var(--sync-notice-bg)',
                    borderColor: 'var(--sync-notice-border)',
                    boxShadow: 'var(--sync-notice-shadow)',
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex flex-col gap-2">
                      <Button
                        className="h-9 w-full rounded-[10px] text-[12px] font-semibold"
                        onClick={() => openAuthDialog('sign-up')}
                        size="sm"
                        variant="default"
                      >
                        Sign up
                      </Button>

                      <Button
                        className="h-9 w-full rounded-[10px] border [border-color:var(--sync-notice-button-border)] [background:var(--sync-notice-button-bg)] [color:var(--sync-notice-button-fg)] hover:[background:var(--sync-notice-button-hover)]"
                        onClick={() => openAuthDialog('sign-in')}
                        size="sm"
                        variant="outline"
                      >
                        Log in
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>

        <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-2">
          <header className="flex min-h-11 items-center justify-between gap-2 rounded-[10px] border border-border bg-card/90 px-2 py-1.5">
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
              <AppThemeToggle />

              <Button onClick={() => setIsConfigOpen(true)} size="sm" variant="ghost">
                <Settings2 className="size-3.5" />
                Config
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={!renderState.canExport} size="sm" variant="secondary">
                    <Download className="size-3.5" />
                    PNG
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onSelect={() => void handleOpenPng()}>
                    <ExternalLink className="size-3.5" />
                    Open PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void handleDownload()}>
                    <Download className="size-3.5" />
                    Download PNG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {renderState.error ? (
            <div className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
              {renderState.error}
            </div>
          ) : null}

          <div className="grid min-h-0 gap-2 xl:grid-cols-[minmax(16rem,24%)_minmax(0,1fr)]">
            <div className="min-h-0 overflow-hidden rounded-[10px] border border-border bg-card/90">
              {showWorkspaceSkeleton ? (
                <CodePanelSkeleton />
              ) : (
                <MermaidCodeEditor
                  appearance={resolvedAppearance}
                  fontSize={state.codeFontSize}
                  onChange={handleCodeChange}
                  value={activeGraph.code}
                />
              )}
            </div>

            <PreviewPane
              previewStyle={previewStyle}
              showWorkspaceSkeleton={showWorkspaceSkeleton}
              svg={renderState.svg}
            />
          </div>
        </section>
      </div>

      <Dialog onOpenChange={setIsConfigOpen} open={isConfigOpen}>
        <DialogContent className="max-h-[88dvh] max-w-[1120px] overflow-hidden border-border bg-popover p-0 text-popover-foreground">
          <div className="grid max-h-[88dvh] min-h-0 gap-0 overflow-y-auto lg:grid-cols-[20rem_minmax(0,1fr)] lg:overflow-hidden">
            <div className="border-b border-border bg-muted/20 p-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                  <Settings2 className="size-4" />
                  Configuration
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Tune the app theme and the Mermaid renderer. Graph naming stays in the main header.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-5">
                <section className="space-y-3 rounded-[14px] border border-border bg-card px-4 py-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Interface
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Controls only the app chrome.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Theme
                    </label>
                    <AppThemeToggle className="w-full justify-between" />
                  </div>
                </section>

                <section className="space-y-4 rounded-[14px] border border-border bg-card px-4 py-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Diagram
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Style and export settings for the rendered graph.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Diagram style
                    </label>
                    <select
                      className="flex h-9 w-full rounded-[10px] border border-input bg-secondary px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          theme: isSupportedTheme(event.target.value) ? event.target.value : DEFAULT_THEME,
                        }))
                      }
                      value={state.theme}
                    >
                      {MERMAID_THEME_OPTIONS.map((theme) => (
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

                  <label className="flex items-center gap-2 rounded-[10px] border border-input bg-secondary px-3 py-2 text-sm">
                    <input
                      checked={state.transparent}
                      className="accent-primary"
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
                </section>

              </div>
            </div>

            <div className="flex min-h-0 flex-col p-5 lg:overflow-y-auto">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Examples</p>
                  <p className="text-xs text-muted-foreground">
                    Load a preset into the active graph or create a new one from it.
                  </p>
                </div>

                <Button onClick={useDefaults} size="sm" variant="outline">
                  <Sparkles className="size-3.5" />
                  Reset settings
                </Button>
              </div>

              <div className="min-h-0 space-y-2 overflow-auto pr-1">
                {presets.map((preset) => (
                  <div
                    className="flex flex-col gap-3 rounded-[14px] border border-input bg-card px-4 py-3 xl:flex-row xl:items-center xl:justify-between"
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
                        Replace current
                      </Button>
                      <Button onClick={() => addGraphFromPreset(preset)} size="sm" variant="outline">
                        Add as new
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
        <div className="animate-pulse rounded-[10px] border border-border bg-secondary px-3 py-2" key={index}>
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function CodePanelSkeleton() {
  return (
    <div className="h-full w-full bg-[var(--editor-bg)] p-3 font-mono text-[11px]">
      <div className="h-full space-y-2">
        {Array.from({ length: 16 }).map((_, index) => (
          <div className="animate-pulse" key={index}>
            <div
              className="h-3 rounded bg-[var(--preview-skeleton-muted)]"
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
      <div className="h-full w-full space-y-3 rounded-[10px] border border-border/70 bg-[var(--preview-skeleton-surface)] p-4">
        <div className="h-4 w-44 animate-pulse rounded bg-[var(--preview-skeleton-muted)]" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              className="h-16 animate-pulse rounded border border-border/60 bg-[var(--preview-skeleton-muted)]"
              key={index}
            />
          ))}
        </div>
        <div className="h-3 w-3/5 animate-pulse rounded bg-[var(--preview-skeleton-muted)]" />
      </div>
    </div>
  )
}

const StaticPreviewSvg = memo(function StaticPreviewSvg({
  containerRef,
  svg,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  svg: string
}) {
  return (
    <div
      className="h-full w-full [&_svg]:pointer-events-none [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
      ref={containerRef}
    />
  )
})

function PreviewPane({
  previewStyle,
  showWorkspaceSkeleton,
  svg,
}: {
  previewStyle: CSSProperties
  showWorkspaceSkeleton: boolean
  svg: string
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>(DEFAULT_PREVIEW_VIEWPORT)
  const previewContentRef = useRef<HTMLDivElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const previewDragRef = useRef<{
    originX: number
    originY: number
    pointerId: number
    startX: number
    startY: number
  } | null>(null)
  const previewSvgViewBox = useMemo(() => (svg ? getSvgViewBox(svg) : null), [svg])

  useEffect(() => {
    setPreviewViewport(DEFAULT_PREVIEW_VIEWPORT)
  }, [svg])

  useEffect(() => {
    const container = previewContentRef.current

    if (!container) {
      return
    }

    if (!svg) {
      return
    }

    const svgElement = container.querySelector('svg')

    if (!svgElement) {
      return
    }

    svgElement.setAttribute('height', '100%')
    svgElement.setAttribute('width', '100%')
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  }, [svg])

  useEffect(() => {
    const container = previewContentRef.current
    const svgElement = container?.querySelector('svg')

    if (!svgElement || !previewSvgViewBox) {
      return
    }

    svgElement.setAttribute('viewBox', buildPreviewViewBox(previewSvgViewBox, previewViewport))
  }, [previewSvgViewBox, previewViewport])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === previewRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

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

  function resetPreviewViewport() {
    setPreviewViewport(DEFAULT_PREVIEW_VIEWPORT)
  }

  function setPreviewScale(nextScale: number, clientX?: number, clientY?: number) {
    const preview = previewRef.current

    setPreviewViewport((current) => {
      const scale = clampPreviewScale(nextScale)

      if (!preview || clientX === undefined || clientY === undefined || scale === current.scale) {
        return {
          ...current,
          scale,
        }
      }

      const bounds = preview.getBoundingClientRect()
      const pointerX = clientX - bounds.left - bounds.width / 2
      const pointerY = clientY - bounds.top - bounds.height / 2
      const ratio = scale / current.scale

      return {
        scale,
        x: pointerX - (pointerX - current.x) * ratio,
        y: pointerY - (pointerY - current.y) * ratio,
      }
    })
  }

  function handlePreviewPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!svg || event.button !== 0) {
      return
    }

    previewDragRef.current = {
      originX: previewViewport.x,
      originY: previewViewport.y,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePreviewPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = previewDragRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    setPreviewViewport((current) => ({
      ...current,
      x: dragState.originX + event.clientX - dragState.startX,
      y: dragState.originY + event.clientY - dragState.startY,
    }))
  }

  function handlePreviewPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (previewDragRef.current?.pointerId !== event.pointerId) {
      return
    }

    previewDragRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handlePreviewWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!svg) {
      return
    }

    event.preventDefault()

    const direction = event.deltaY < 0 ? 1 : -1
    setPreviewScale(previewViewport.scale + direction * PREVIEW_ZOOM_STEP, event.clientX, event.clientY)
  }

  return (
    <div className="preview-frame relative min-h-0 overflow-hidden rounded-[10px] border border-border" ref={previewRef} style={previewStyle}>
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-[10px] border border-border/70 bg-card/92 p-1 text-[11px] shadow-sm backdrop-blur">
          <Button
            aria-label="Zoom out"
            className="size-7 rounded-[8px] px-0"
            onClick={() => setPreviewScale(previewViewport.scale - PREVIEW_ZOOM_STEP)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Minus className="size-3.5" />
          </Button>
          <button
            className="min-w-12 rounded-[8px] px-1.5 py-1 text-center text-[11px] font-medium text-foreground/80"
            onClick={resetPreviewViewport}
            type="button"
          >
            {Math.round(previewViewport.scale * 100)}%
          </button>
          <Button
            aria-label="Zoom in"
            className="size-7 rounded-[8px] px-0"
            onClick={() => setPreviewScale(previewViewport.scale + PREVIEW_ZOOM_STEP)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Plus className="size-3.5" />
          </Button>
          <Button
            aria-label="Reset zoom and pan"
            className="size-7 rounded-[8px] px-0"
            onClick={resetPreviewViewport}
            size="icon"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>

        <Button
          className="pointer-events-auto h-8 rounded-[10px] border-border/70 bg-card/92 shadow-sm backdrop-blur"
          onClick={handleToggleFullscreen}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Expand className="size-3.5" />
          {isFullscreen ? 'Exit full' : 'Full page'}
        </Button>
      </div>

      <div
        className={cn('h-full min-h-0 overflow-hidden p-3 pt-14', svg && 'cursor-grab touch-none active:cursor-grabbing')}
        onPointerCancel={handlePreviewPointerEnd}
        onPointerDown={handlePreviewPointerDown}
        onPointerMove={handlePreviewPointerMove}
        onPointerUp={handlePreviewPointerEnd}
        onWheel={handlePreviewWheel}
      >
        {showWorkspaceSkeleton ? (
          <GraphPreviewSkeleton />
        ) : svg ? (
          <div className="h-full min-h-0 w-full overflow-hidden rounded-[8px]">
            <StaticPreviewSvg
              containerRef={previewContentRef}
              svg={svg}
            />
          </div>
        ) : (
          <div className="grid min-h-full min-w-full place-items-center text-sm text-muted-foreground">
            Preview unavailable for this graph.
          </div>
        )}
      </div>

      {svg ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-[10px] border border-border/60 bg-card/88 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          Drag to move. Scroll to zoom.
        </div>
      ) : null}
    </div>
  )
}

function ChevronHint({ active }: { active: boolean }) {
  return (
    <span
      className={cn('text-[10px]', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}
    >
      ›
    </span>
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

function loadNativeMermaidModule() {
  nativeMermaidModulePromise ??= import('mermaid')

  return nativeMermaidModulePromise
}

async function renderSvgForCode(
  code: string,
  theme: string,
  appearance: ResolvedAppearance,
  transparent: boolean,
) {
  const mermaid = await loadMermaidModule()
  const themeDefinition = resolveThemeDefinition(theme, mermaid.THEMES, appearance)
  const svg = await renderSvgWithPreferredEngine(code, themeDefinition, transparent)

  return {
    colors: themeDefinition.colors,
    svg: decorateSvgForTheme(svg, themeDefinition.id, appearance, transparent, themeDefinition.colors.bg),
    themeDefinition,
  }
}

async function renderSvgWithPreferredEngine(
  code: string,
  themeDefinition: DiagramThemeDefinition,
  transparent: boolean,
) {
  if (shouldUseNativeMermaidRenderer(code)) {
    try {
      return await renderWithNativeMermaid(code, themeDefinition, transparent)
    } catch {
      // Fall back to beautiful-mermaid when native Mermaid rejects the graph.
    }
  }

  const mermaid = await loadMermaidModule()

  return mermaid.renderMermaidSVG(code, {
    ...themeDefinition.colors,
    font: themeDefinition.font,
    interactive: true,
    layerSpacing: 40,
    nodeSpacing: 24,
    padding: 40,
    transparent,
  })
}

function shouldUseNativeMermaidRenderer(code: string) {
  return (
    /^\s*(?:graph|flowchart)\s+(?:TB|TD|LR|BT|RL)\b/i.test(code) &&
    /\bsubgraph\b/i.test(code) &&
    /^\s*direction\s+(?:TB|TD|LR|BT|RL)\b/im.test(code)
  )
}

async function renderWithNativeMermaid(
  code: string,
  themeDefinition: DiagramThemeDefinition,
  transparent: boolean,
) {
  const nativeMermaidModule = await loadNativeMermaidModule()
  const nativeMermaid = nativeMermaidModule.default

  nativeMermaid.initialize({
    fontFamily: themeDefinition.font,
    htmlLabels: false,
    flowchart: {
      htmlLabels: false,
      useMaxWidth: false,
    },
    securityLevel: 'loose',
    startOnLoad: false,
    theme: 'base',
    themeVariables: buildNativeThemeVariables(themeDefinition, transparent),
  })

  const { svg } = await nativeMermaid.render(`better-mermaid-native-${nativeMermaidRenderCount++}`, code)

  return svg
}

function buildNativeThemeVariables(themeDefinition: DiagramThemeDefinition, transparent: boolean) {
  const colors = themeDefinition.colors
  const background = transparent ? 'transparent' : colors.bg
  const lineColor = colors.line ?? colors.border ?? colors.fg
  const surfaceColor = colors.surface ?? colors.bg

  return {
    background,
    clusterBkg: 'transparent',
    clusterBorder: lineColor,
    defaultLinkColor: lineColor,
    edgeLabelBackground: colors.bg,
    fontFamily: themeDefinition.font,
    lineColor,
    mainBkg: surfaceColor,
    nodeBorder: colors.border ?? lineColor,
    primaryBorderColor: colors.border ?? lineColor,
    primaryColor: surfaceColor,
    primaryTextColor: colors.fg,
    secondaryColor: surfaceColor,
    tertiaryColor: colors.bg,
    textColor: colors.fg,
  }
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
        return {
          activeGraphId: graphs.some((graph) => graph.id === parsed.activeGraphId)
            ? (parsed.activeGraphId as string)
            : graphs[0].id,
          codeFontSize:
            typeof parsed.codeFontSize === 'number' && parsed.codeFontSize >= 12 && parsed.codeFontSize <= 28
              ? parsed.codeFontSize
              : DEFAULT_CODE_FONT_SIZE,
          graphs,
          theme:
            typeof parsed.theme === 'string' && isSupportedTheme(parsed.theme)
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
        return {
          activeGraphId: migratedGraphs[0].id,
          codeFontSize:
            typeof parsed.codeFontSize === 'number' && parsed.codeFontSize >= 12 && parsed.codeFontSize <= 28
              ? parsed.codeFontSize
              : DEFAULT_CODE_FONT_SIZE,
          graphs: migratedGraphs,
          theme:
            typeof parsed.theme === 'string' && isSupportedTheme(parsed.theme)
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

function createDefaultState(): AppState {
  const initialPreset = presets.find((preset) => preset.id === defaultPresetId) ?? presets[0]
  const graph = createGraph('Graph 1', initialPreset?.code ?? DEFAULT_CODE, initialPreset?.id ?? null)

  return {
    activeGraphId: graph.id,
    codeFontSize: DEFAULT_CODE_FONT_SIZE,
    graphs: [graph],
    theme: DEFAULT_THEME,
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
  return `${graph.title} rendered with ${formatThemeName(theme)} style${transparent ? ' and transparent export on' : ''}.`
}

async function rasterizeSvgToPng(svg: string) {
  const pngBlob = await rasterizeSvgToPngBlob(svg)

  return URL.createObjectURL(pngBlob)
}

async function rasterizeSvgToPngBlob(svg: string) {
  const preparedSvg = prepareSvgForRasterization(svg)
  const dimensions = getSvgDimensions(svg)
  const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1))
  const canvas = document.createElement('canvas')

  canvas.width = Math.max(1, Math.round(dimensions.width * scale))
  canvas.height = Math.max(1, Math.round(dimensions.height * scale))

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas context unavailable')
  }

  context.setTransform(scale, 0, 0, scale, 0, 0)

  try {
    const image = await loadSvgRasterImage(preparedSvg)

    context.clearRect(0, 0, dimensions.width, dimensions.height)
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height)

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })

    if (!pngBlob) {
      throw new Error('PNG blob unavailable')
    }

    return pngBlob
  } catch (error) {
    throw normalizeRasterizeError(error)
  }
}

function getOpenPngErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === 'popup-blocked') {
    return 'This browser blocked opening the PNG in a new tab.'
  }

  return 'PNG open failed in this browser.'
}

function getPngExportErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'popup-blocked') {
      return 'This browser blocked the PNG download.'
    }

    if (error.message === 'Image load failed' || error.message === 'createImageBitmap failed') {
      return 'PNG export failed because the browser could not rasterize this SVG.'
    }
  }

  return 'PNG export failed in this browser.'
}

async function loadSvgRasterImage(svg: string) {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })

  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(svgBlob)
    } catch {
      // Fall back to HTMLImageElement for browsers with partial createImageBitmap support.
    }
  }

  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    return await loadImage(svgUrl)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.crossOrigin = 'anonymous'
    image.decoding = 'sync'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image load failed'))
    image.src = src
  })
}

function prepareSvgForRasterization(svg: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(svg, 'image/svg+xml')
  const root = document.documentElement

  if (root.nodeName.toLowerCase() !== 'svg') {
    return svg
  }

  if (!root.hasAttribute('xmlns')) {
    root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }

  if (!root.hasAttribute('xmlns:xlink')) {
    root.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  }

  root.querySelectorAll('script, foreignObject').forEach((node) => {
    node.remove()
  })

  const safeSansFont = '"Segoe UI", Arial, Helvetica, sans-serif'
  const styleNodes = root.querySelectorAll('style')

  styleNodes.forEach((styleNode) => {
    styleNode.textContent = (styleNode.textContent ?? '')
      .replace(/\bSora\b/g, safeSansFont)
      .replace(/\bfont-family:\s*trebuchet ms,?[^;}]*/gi, `font-family:${safeSansFont}`)
  })

  root.querySelectorAll<SVGElement>('[font-family]').forEach((element) => {
    element.setAttribute('font-family', safeSansFont)
  })

  return new XMLSerializer().serializeToString(root)
}

function normalizeRasterizeError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error(typeof error === 'string' ? error : 'Unknown rasterization error')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 30000)
}

function getSvgDimensions(svg: string) {
  const { height, width } = getSvgViewBox(svg)

  return { height, width }
}

function getSvgViewBox(svg: string): SvgViewBox {
  const widthMatch = svg.match(/\bwidth="([\d.]+)(px)?"/i)
  const heightMatch = svg.match(/\bheight="([\d.]+)(px)?"/i)
  const viewBoxMatch = svg.match(/\bviewBox="([^"]+)"/i)

  if (viewBoxMatch) {
    const parts = viewBoxMatch[1]
      .trim()
      .split(/[\s,]+/)
      .map((value) => Number(value))

    if (
      parts.length === 4 &&
      Number.isFinite(parts[0]) &&
      Number.isFinite(parts[1]) &&
      Number.isFinite(parts[2]) &&
      Number.isFinite(parts[3])
    ) {
      return {
        height: parts[3],
        minX: parts[0],
        minY: parts[1],
        width: parts[2],
      }
    }
  }

  const width = widthMatch ? Number(widthMatch[1]) : NaN
  const height = heightMatch ? Number(heightMatch[1]) : NaN

  if (Number.isFinite(width) && Number.isFinite(height)) {
    return {
      height,
      minX: 0,
      minY: 0,
      width,
    }
  }

  return {
    height: 1080,
    minX: 0,
    minY: 0,
    width: 1920,
  }
}

function buildPreviewViewBox(baseViewBox: SvgViewBox, viewport: PreviewViewport) {
  const visibleWidth = baseViewBox.width / viewport.scale
  const visibleHeight = baseViewBox.height / viewport.scale
  const minX = baseViewBox.minX + (baseViewBox.width - visibleWidth) / 2 - viewport.x * (visibleWidth / baseViewBox.width)
  const minY = baseViewBox.minY + (baseViewBox.height - visibleHeight) / 2 - viewport.y * (visibleHeight / baseViewBox.height)
  return `${minX} ${minY} ${visibleWidth} ${visibleHeight}`
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

    return {
      activeGraphId: body.state.activeGraphId,
      codeFontSize: clampCodeFontSize(body.state.codeFontSize),
      graphs: body.state.graphs,
      theme: isSupportedTheme(body.state.theme) ? body.state.theme : DEFAULT_THEME,
      transparent: body.state.transparent,
    }
  } catch {
    return null
  }
}

async function writeRemoteState(state: AppState, options?: { keepalive?: boolean }) {
  try {
    const response = await fetch('/api/graphs', {
      body: JSON.stringify(state),
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

function clampPreviewScale(scale: number) {
  return clampNumber(scale, MIN_PREVIEW_SCALE, MAX_PREVIEW_SCALE)
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  if (value < min) {
    return min
  }

  if (value > max) {
    return max
  }

  return value
}

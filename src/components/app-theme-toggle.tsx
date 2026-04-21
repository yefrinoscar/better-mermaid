'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useAppTheme } from '@/components/app-theme-provider'
import { cn } from '@/lib/utils'
import type { AppAppearance } from '@/lib/app-themes'

const APPEARANCE_OPTIONS: Array<{
  icon: typeof Monitor
  label: string
  value: AppAppearance
}> = [
  { icon: Monitor, label: 'System', value: 'system' },
  { icon: Sun, label: 'Light', value: 'light' },
  { icon: Moon, label: 'Dark', value: 'dark' },
]

export function AppThemeToggle({ className }: { className?: string }) {
  const { appearance, setAppearance } = useAppTheme()

  return (
    <div
      aria-label="Theme"
      className={cn(
        'inline-flex w-fit max-w-full items-center gap-1 rounded-lg border border-border bg-secondary/85 p-1 text-foreground shadow-sm',
        className,
      )}
      role="group"
    >
      {APPEARANCE_OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = appearance === option.value

        return (
          <button
            aria-pressed={isActive}
            aria-label={option.label}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
            )}
            key={option.value}
            onClick={() => setAppearance(option.value)}
            title={option.label}
            type="button"
          >
            <Icon className="size-3.5" />
            <span className="sr-only">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    defaultVariants: {
      size: 'default',
      variant: 'secondary',
    },
    variants: {
      size: {
        default: 'h-8 px-3',
        icon: 'size-8',
        sm: 'h-7 px-2.5',
      },
      variant: {
        default: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90',
        ghost: 'border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        outline: 'border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        secondary: 'border-border bg-secondary text-foreground hover:bg-accent hover:text-accent-foreground',
      },
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, size, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ className, size, variant }))} {...props} />
}

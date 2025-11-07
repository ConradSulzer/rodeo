import * as React from 'react'
import { cn } from '../../lib/utils'

export type PillProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'solid' | 'muted' | 'dashed'
  size?: 'sm' | 'md'
  bgClassName?: string
  textClassName?: string
}

const variantClasses: Record<NonNullable<PillProps['variant']>, string> = {
  solid: 'border',
  muted: 'border border-(--ro-bg-muted)',
  dashed: 'border border-dashed border-[var(--ro-border)]'
}

const sizeClasses: Record<NonNullable<PillProps['size']>, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-3 py-1'
}

export const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  (
    {
      className,
      variant = 'solid',
      size = 'sm',
      bgClassName = 'ro-bg-muted',
      textClassName = 'ro-text-main',
      ...props
    },
    ref
  ) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-mono uppercase tracking-[0.3em] transition-colors',
        variantClasses[variant],
        bgClassName,
        textClassName,
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
)

Pill.displayName = 'Pill'

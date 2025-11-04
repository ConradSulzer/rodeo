import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const baseStyles =
  'inline-flex items-center justify-center rounded-md border font-mono text-xs uppercase tracking-[0.3em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ro-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ro-bg-main)]'

const variantStyles: Record<'primary' | 'ghost', string> = {
  primary:
    'border-[var(--ro-border)] bg-[var(--ro-bg-middle)] text-[var(--ro-text-dark)] hover:bg-[var(--ro-bg-muted)]',
  ghost:
    'border-[var(--ro-border)] bg-transparent text-[var(--ro-text-main)] hover:bg-[var(--ro-bg-muted)]'
}

const sizeStyles: Record<'md' | 'lg', string> = {
  md: 'min-w-[10rem] px-5 py-3',
  lg: 'min-w-[12rem] px-6 py-3'
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    />
  )
)

Button.displayName = 'Button'

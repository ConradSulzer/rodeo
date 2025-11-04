/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border',
    'font-mono text-sm tracking-[0.3em] transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ro-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ro-bg-main)]',
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'border ro-border ro-bg-dim ro-text-main',
          'hover:opacity-75 cursor-pointer'
        ].join(' '),
        destructive: [
          'border border-transparent ro-bg-error ro-text-error',
          'hover:opacity-75 cursor-pointer'
        ].join(' '),
        positive: [
          'border border-transparent ro-bg-success ro-text-success',
          'hover:opacity-75 cursor-pointer'
        ].join(' '),
        outline: [
          'border ro-border bg-transparent ro-text-main ro-hover-bg-muted',
          'hover:opacity-75 cursor-pointer'
        ].join(' '),
        info: [
          'border border-transparent ro-bg-info ro-text-info',
          'hover:opacity-75 cursor-pointer'
        ].join(' '),
        ghost: [
          'border border-transparent bg-transparent ro-text-main ro-hover-bg-muted',
          'hover:opacity-75 cursor-pointer'
        ].join(' '),
        link: [
          'border border-transparent bg-transparent ro-text-main underline underline-offset-4',
          'hover:opacity-75 cursor-pointer'
        ].join(' ')
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8 text-sm',
        icon: 'h-10 w-10 p-0 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
)

Button.displayName = 'Button'

export { Button, buttonVariants }

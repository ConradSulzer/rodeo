import * as React from 'react'
import { cn } from '../../lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border ro-border ro-bg-input px-3 py-2 text-sm ro-text-main placeholder:ro-text-muted outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm backdrop-blur-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }

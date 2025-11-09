import * as React from 'react'
import { HiMiniMagnifyingGlass } from 'react-icons/hi2'
import { cn } from '../../lib/utils'
import { Input } from './input'

const SearchInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <HiMiniMagnifyingGlass className="absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 ro-text-muted" />
        <Input
          type="search"
          className={cn('h-10 pl-10 pr-3 text-base ro-bg-dim md:text-sm', className)}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
SearchInput.displayName = 'Search Input'

export { SearchInput }

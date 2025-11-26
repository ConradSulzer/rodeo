import * as React from 'react'
import { HiMiniMagnifyingGlass, HiMiniXMark } from 'react-icons/hi2'
import { cn } from '../../lib/utils'
import { Input } from './input'

type SearchInputProps = React.ComponentProps<'input'> & {
  onClear?: () => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    const showClear = typeof onClear === 'function' && Boolean(value)

    return (
      <div className="relative">
        <HiMiniMagnifyingGlass className="absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 ro-text-muted" />
        <Input
          type="text"
          className={cn('h-10 pl-10 pr-10 text-base ro-bg-dim md:text-sm', className)}
          ref={ref}
          value={value}
          {...props}
        />
        {showClear ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-sm ro-text-muted hover:ro-text-main hover:ro-bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-foreground"
            onClick={onClear}
          >
            <HiMiniXMark className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    )
  }
)
SearchInput.displayName = 'Search Input'

export { SearchInput }

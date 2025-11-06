import type { ReactNode } from 'react'
import { Button } from './ui/button'
import { SearchInput } from './ui/search_input'

type ManageSectionShellProps = {
  title: string
  description?: string
  children: ReactNode
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  onAdd?: () => void
  addLabel?: string
  refreshing?: boolean
  actions?: ReactNode
}

export function ManageSectionShell({
  title,
  description,
  children,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onAdd,
  addLabel = 'Add Item',
  refreshing = false,
  actions
}: ManageSectionShellProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-mono text-[16px] font-semibold uppercase tracking-[2px]">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm ro-text-dim">{description}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {refreshing ? (
            <span className="text-xs uppercase tracking-[0.3em] ro-text-muted">Refreshing...</span>
          ) : null}
          {onAdd ? (
            <Button type="button" variant="positive" size="sm" onClick={onAdd}>
              {addLabel}
            </Button>
          ) : null}
        </div>
      </header>
      <SearchInput
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        aria-label={searchPlaceholder ?? 'Search'}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </section>
  )
}

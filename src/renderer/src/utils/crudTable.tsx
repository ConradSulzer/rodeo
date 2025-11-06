import type { ReactNode } from 'react'
import { SortableHeaderCell, type SortDirection } from '../components/ui/table'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

export type CrudTableColumn<T extends Record<string, unknown>, ExtraKeys extends string = never> = {
  key: keyof T | ExtraKeys
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
}

export type CrudTableSort<T extends Record<string, unknown>> = {
  key: keyof T & string
  direction: SortDirection
}

type RenderManageTableHeaderArgs<
  T extends Record<string, unknown>,
  ExtraKeys extends string = never
> = {
  columns: ReadonlyArray<CrudTableColumn<T, ExtraKeys>>
  sort: CrudTableSort<T>
  toggleSort: (key: keyof T & string) => void
}

export function renderCrudTableHeader<
  T extends Record<string, unknown>,
  ExtraKeys extends string = never
>({ columns, sort, toggleSort }: RenderManageTableHeaderArgs<T, ExtraKeys>): ReactNode[] {
  return columns.map((column) => {
    const key = column.key
    if (column.sortable) {
      const sortableKey = key as keyof T & string
      return (
        <SortableHeaderCell
          key={String(key)}
          align={column.align}
          onSort={() => toggleSort(sortableKey)}
          active={sort.key === sortableKey}
          direction={sort.direction}
        >
          {column.label}
        </SortableHeaderCell>
      )
    }

    return (
      <SortableHeaderCell key={String(key)} align={column.align}>
        {column.label}
      </SortableHeaderCell>
    )
  })
}

export type CrudTableAction = {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
  ariaLabel?: string
}

type CrudTableActionsProps = {
  actions: CrudTableAction[]
  className?: string
}

export function CrudTableActions({ actions, className = '' }: CrudTableActionsProps) {
  if (!actions.length) return null

  return (
    <div className={cn('flex items-center justify-end gap-2', className)}>
      {actions.map((action) => {
        const { tone = 'default', icon, onClick, disabled, ariaLabel, label } = action
        return (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', tone === 'danger' ? 'ro-text-error' : 'hover:ro-text-main')}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel ?? label}
          >
            {icon}
          </Button>
        )
      })}
    </div>
  )
}

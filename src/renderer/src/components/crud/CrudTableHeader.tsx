import type { ReactNode } from 'react'
import { SortableHeaderCell, type SortDirection } from '../ui/table'

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

type RenderCrudTableHeaderArgs<
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
>({ columns, sort, toggleSort }: RenderCrudTableHeaderArgs<T, ExtraKeys>): ReactNode[] {
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

import * as React from 'react'
import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'
import { FiArrowDown, FiArrowUp } from 'react-icons/fi'
import { cn } from '../../lib/utils'

export type SortDirection = 'asc' | 'desc'

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode
  containerClassName?: string
}

export function Table({ className = '', containerClassName = '', children, ...props }: TableProps) {
  return (
    <div
      className={cn(
        'custom-scrollbar relative max-h-full overflow-auto rounded-md border ro-border ro-bg-dim',
        containerClassName
      )}
    >
      <table
        className={[
          'ro-table ro-table-striped relative min-w-full table-fixed border-separate border-spacing-0 text-sm',
          className
        ].join(' ')}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

type TableHeaderProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode
}

export function TableHeader({ className = '', children, ...props }: TableHeaderProps) {
  return (
    <thead
      className={['sticky top-0 z-20 font-semibold uppercase tracking-[0.15em]', className].join(
        ' '
      )}
      {...props}
    >
      {children}
    </thead>
  )
}

type TableBodyProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode
}

export function TableBody({ className = '', children, ...props }: TableBodyProps) {
  return (
    <tbody className={['divide-y ro-dim-border', className].join(' ')} {...props}>
      {children}
    </tbody>
  )
}

type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className = '', children, ...props }, ref) => (
    <tr
      ref={ref}
      className={['transition-colors hover:ro-bg-muted/70', className].join(' ')}
      {...props}
    >
      {children}
    </tr>
  )
)

TableRow.displayName = 'TableRow'

type TableHeaderCellProps = HTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode
}

export function TableHeaderCell({ className = '', children, ...props }: TableHeaderCellProps) {
  return (
    <th
      className={cn(
        'sticky top-0 z-30 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] ro-text-dim ro-bg-dim',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

type SortableHeaderCellProps = Omit<TableHeaderCellProps, 'onClick'> & {
  align?: 'left' | 'center' | 'right'
  active?: boolean
  direction?: SortDirection
  onSort?: () => void
}

export function SortableHeaderCell({
  align = 'left',
  active = false,
  direction = 'asc',
  onSort,
  className = '',
  children,
  ...props
}: SortableHeaderCellProps) {
  const interactive = typeof onSort === 'function'

  const alignmentClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  const justifyClass =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'

  const handleClick = () => {
    if (interactive && onSort) {
      onSort()
    }
  }

  const arrow =
    interactive && active ? (
      direction === 'asc' ? (
        <FiArrowUp className="h-3 w-3" />
      ) : (
        <FiArrowDown className="h-3 w-3" />
      )
    ) : null

  return (
    <th
      className={cn(
        'sticky top-0 z-30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ro-bg-dim ro-text-dim',
        alignmentClass,
        interactive ? 'cursor-pointer select-none hover:ro-text-main' : '',
        active ? 'ro-text-main' : '',
        className
      )}
      {...props}
    >
      {interactive ? (
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'flex w-full space-x-2 items-center gap-1 bg-transparent p-0 text-inherit uppercase tracking-[inherit] cursor-pointer',
            justifyClass,
            alignmentClass,
            'focus:outline-none'
          )}
        >
          <span>{children}</span>
          {arrow}
        </button>
      ) : (
        <span
          className={cn(
            'inline-flex w-full items-center gap-1',
            justifyClass,
            alignmentClass,
            active ? 'ro-text-main' : ''
          )}
        >
          <span className="flex-1">{children}</span>
          {arrow}
        </span>
      )}
    </th>
  )
}

type TableCellProps = HTMLAttributes<HTMLTableCellElement> & {
  align?: 'left' | 'center' | 'right'
  children: ReactNode
}

export function TableCell({ align = 'left', className = '', children, ...props }: TableCellProps) {
  return (
    <td
      className={[
        'px-4 py-2.5 align-middle text-sm ro-text-main',
        align === 'center' ? 'text-center' : '',
        align === 'right' ? 'text-right' : '',
        className
      ].join(' ')}
      {...props}
    >
      {children}
    </td>
  )
}

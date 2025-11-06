import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode
  containerClassName?: string
}

export function Table({ className = '', containerClassName = '', children, ...props }: TableProps) {
  return (
    <div
      className={[
        'custom-scrollbar relative max-h-full overflow-auto rounded-md border ro-border ro-bg-dim',
        containerClassName
      ].join(' ')}
    >
      <table
        className={[
          'relative min-w-full table-fixed border-separate border-spacing-0 text-sm',
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

export function TableRow({ className = '', children, ...props }: TableRowProps) {
  return (
    <tr className={['transition-colors hover:ro-bg-muted/70', className].join(' ')} {...props}>
      {children}
    </tr>
  )
}

type TableHeaderCellProps = HTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode
}

export function TableHeaderCell({ className = '', children, ...props }: TableHeaderCellProps) {
  return (
    <th
      className={[
        'sticky top-0 z-30 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] ro-text-dim ro-bg-dim',
        className
      ].join(' ')}
      {...props}
    >
      {children}
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
        'px-4 py-2.5 align-middle text-sm ro-text-main first:rounded-l-xl last:rounded-r-xl',
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

import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

export type FieldProps = {
  label?: ReactNode
  description?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}

export function Field({ label, description, error, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2 text-left', className)}>
      {label}
      {children}
      {description ? <p className="text-xs ro-text-muted">{description}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  )
}

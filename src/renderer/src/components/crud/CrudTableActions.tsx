import type { ReactNode } from 'react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

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

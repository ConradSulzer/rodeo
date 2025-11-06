import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import type { ComponentProps } from 'react'
import { FiCalendar } from 'react-icons/fi'
import { cn } from '../../lib/utils'

export type DateInputProps = ComponentProps<'input'> & {
  placeholder?: string
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, placeholder = 'Select date', disabled, value, onChange, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null)

    const displayValue = useMemo(() => {
      if (!value) return placeholder
      const parsed = parseLocalDate(value as string)
      if (!parsed) return value as string
      const formatter = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      })
      return formatter.format(parsed)
    }, [value, placeholder])

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    const openPicker = () => {
      if (disabled) return

      const input = inputRef.current

      if (!input) return

      if (typeof input.showPicker === 'function') {
        input.showPicker()
      } else {
        input.focus()
        input.click()
      }
    }

    const handleClick = () => {
      openPicker()
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openPicker()
      }
    }

    return (
      <div className="relative">
        <input
          ref={(node) => {
            inputRef.current = node
          }}
          type="date"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'flex h-10 cursor-pointer items-center justify-between rounded-md border ro-border bg-transparent px-3 py-2 text-sm font-mono tracking-[0.15em] transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ro-border-light) focus-visible:ring-offset-2',
            'hover:ro-bg-muted',
            className
          )}
        >
          <span className={cn('flex items-center gap-2 ro-text-main', !value && 'ro-text-muted')}>
            <FiCalendar className="text-base" />
            {displayValue}
          </span>
        </button>
      </div>
    )
  }
)

DateInput.displayName = 'DateInput'

function parseLocalDate(input: string) {
  const [year, month, day] = input.split('-').map((part) => Number.parseInt(part, 10))
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }
  return new Date(year, month - 1, day)
}

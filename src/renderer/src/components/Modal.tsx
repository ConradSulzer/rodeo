import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/utils'
import { twMerge } from 'tailwind-merge'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  contentClassName?: string
  bodyClassName?: string
}

const modalRootId = 'rodeo-modal-root'

function ensureModalRoot(): HTMLElement {
  let root = document.getElementById(modalRootId)
  if (!root) {
    root = document.createElement('div')
    root.setAttribute('id', modalRootId)
    document.body.appendChild(root)
  }
  return root
}

export function Modal({
  open,
  onClose,
  title,
  children,
  contentClassName,
  bodyClassName
}: ModalProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className={twMerge(
          cn(
            'flex w-[600px] flex-col overflow-hidden rounded-md border ro-border ro-bg-modal shadow-[0_24px_60px_rgba(0,0,0,0.35)]',
            contentClassName
          )
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {title ? (
          <header className="border-b ro-border px-6 py-4">
            <h2 className="text-lg font-semibold uppercase tracking-[0.25em]">{title}</h2>
          </header>
        ) : null}
        <div className={twMerge('flex-1 overflow-y-auto px-6 py-5', bodyClassName)}>{children}</div>
      </div>
    </div>,
    ensureModalRoot()
  )
}

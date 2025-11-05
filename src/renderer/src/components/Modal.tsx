import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
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

export function Modal({ open, onClose, title, children }: ModalProps) {
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
        className="w-full max-w-lg rounded-2xl border ro-border ro-bg-main shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {title ? (
          <header className="border-b ro-dim-border px-6 py-4">
            <h2 className="text-lg font-semibold uppercase tracking-[0.25em]">{title}</h2>
          </header>
        ) : null}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    ensureModalRoot()
  )
}

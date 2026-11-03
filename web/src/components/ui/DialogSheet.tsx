import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
export function DialogSheet({
  title,
  onClose,
  children,
  className = '',
  dismissible = true,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
  dismissible?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    uid = useId()
  // Capture before a child's autoFocus runs during commit.
  const [previous] = useState(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )
  useLayoutEffect(() => {
    const node = dialog.current
    node?.showModal()
    return () => {
      node?.close()
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [previous])
  return createPortal(
    <dialog
      ref={dialog}
      className={`orbit-sheet ${className}`}
      aria-labelledby={uid}
      onCancel={(e) => {
        e.preventDefault()
        if (dismissible) onClose()
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        const r = e.currentTarget.getBoundingClientRect()
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          if (dismissible) onClose()
      }}
    >
      <header className="orbit-sheet-heading">
        <h2 id={uid}>{title}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label={`Close ${title.toLowerCase()}`}
          disabled={!dismissible}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>,
    document.body,
  )
}

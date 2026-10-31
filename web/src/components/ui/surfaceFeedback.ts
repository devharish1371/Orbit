import type { PointerEvent } from 'react'

/** Position the short press highlight at the actual point of contact. */
export function surfaceFeedback(event: PointerEvent<HTMLElement>) {
  const control = (event.target as HTMLElement).closest<HTMLElement>(
    'button:not(:disabled), a[href]',
  )
  if (!control || !event.currentTarget.contains(control)) return
  const box = control.getBoundingClientRect()
  control.style.setProperty('--touch-x', `${event.clientX - box.left}px`)
  control.style.setProperty('--touch-y', `${event.clientY - box.top}px`)
}

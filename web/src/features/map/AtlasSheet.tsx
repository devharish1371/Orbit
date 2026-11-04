import { useId, useRef, type ReactNode } from 'react'
import { ChevronUp } from 'lucide-react'

/** Only the handle owns a drag; sheet scrolling and map gestures stay independent. */
export function AtlasSheet({
  expanded,
  onExpand,
  summary,
  children,
}: {
  expanded: boolean
  onExpand: (expanded: boolean) => void
  summary: ReactNode
  children: ReactNode
}) {
  const id = useId()
  const gesture = useRef<{ y: number; pointer: number } | null>(null)
  const dragged = useRef(false)
  return (
    <section
      className="atlas-sheet"
      data-expanded={expanded}
      aria-label="Map details"
    >
      <button
        className="atlas-sheet-handle"
        aria-label={expanded ? 'Collapse map details' : 'Expand map details'}
        aria-expanded={expanded}
        aria-controls={id}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return
          gesture.current = { y: event.clientY, pointer: event.pointerId }
          dragged.current = false
          event.currentTarget.setPointerCapture?.(event.pointerId)
        }}
        onPointerUp={(event) => {
          const start = gesture.current
          gesture.current = null
          if (!start || start.pointer !== event.pointerId) return
          const delta = event.clientY - start.y
          if (Math.abs(delta) < 28) return
          dragged.current = true
          onExpand(delta < 0)
        }}
        onPointerCancel={() => {
          gesture.current = null
          dragged.current = false
        }}
        onClick={() => {
          if (dragged.current) {
            dragged.current = false
            return
          }
          onExpand(!expanded)
        }}
      >
        <span aria-hidden="true" />
        <ChevronUp size={16} aria-hidden="true" />
      </button>
      <div className="atlas-sheet-summary">{summary}</div>
      <div id={id} className="atlas-sheet-scroll" hidden={!expanded}>
        {children}
      </div>
    </section>
  )
}

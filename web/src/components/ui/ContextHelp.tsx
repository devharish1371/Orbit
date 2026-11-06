import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
/** Optional guidance stays beside its subject, without becoming a permanent footer. */
export function ContextHelp({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <details className="context-help">
      <summary aria-label={label} title={label}>
        <Info size={17} aria-hidden="true" />
      </summary>
      <div className="context-help-body">{children}</div>
    </details>
  )
}

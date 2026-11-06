import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
export function SettingsGroup({
  title,
  icon,
  children,
  open = false,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  open?: boolean
}) {
  return (
    <details className="settings-group" open={open}>
      <summary>
        <span className="settings-group-icon" aria-hidden="true">
          {icon}
        </span>
        <span>{title}</span>
        <ChevronDown size={17} aria-hidden="true" />
      </summary>
      <div className="settings-group-body">{children}</div>
    </details>
  )
}

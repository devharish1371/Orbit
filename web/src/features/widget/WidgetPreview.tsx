import { LockKeyhole, CalendarDays } from 'lucide-react'
import type { WidgetKind } from '@/native/surface'
export function EntranceSeal({ locked = false }: { locked?: boolean }) {
  return (
    <svg
      className="entrance-seal"
      viewBox="0 0 200 145"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1">
        <ellipse
          cx="100"
          cy="72.5"
          rx="87"
          ry="32"
          transform="rotate(-24 100 72.5)"
        />
        <ellipse
          cx="100"
          cy="72.5"
          rx="87"
          ry="32"
          transform="rotate(24 100 72.5)"
          opacity=".35"
        />
      </g>
      <circle cx="27" cy="105.5" r="7" fill="var(--primary)" />
      <circle cx="173" cy="39.5" r="7" fill="var(--secondary)" />
      {locked && (
        <g stroke="var(--text)" strokeWidth="1.6">
          <rect x="91" y="71.5" width="18" height="15" rx="4" />
          <path d="M94 71.5v-6a6 6 0 0 1 12 0v6" />
        </g>
      )}
    </svg>
  )
}
export function WidgetPreview({
  kind,
  covered,
  title,
  date,
  src,
}: {
  kind: WidgetKind
  covered: boolean
  title?: string
  date?: string
  src?: string
}) {
  const hidden = covered || kind === 'private'
  return (
    <div
      className={`widget-preview ${hidden ? 'is-private' : kind === 'photo' ? 'is-photo' : 'is-plan'}`}
      role="img"
      aria-label={
        hidden
          ? 'Private Orbit widget'
          : kind === 'photo'
            ? 'Chosen photo widget'
            : `Plan widget: ${title ?? 'Plan'}`
      }
    >
      {hidden ? (
        <>
          <EntranceSeal locked={covered} />
          <strong>Orbit</strong>
          <span>
            <LockKeyhole size={12} aria-hidden="true" />
            Open Orbit
          </span>
        </>
      ) : kind === 'photo' ? (
        <>
          {src ? <img src={src} alt="" /> : <EntranceSeal />}
          <span>Kept photo</span>
        </>
      ) : (
        <>
          <EntranceSeal />
          <CalendarDays size={26} aria-hidden="true" />
          <strong>{title ?? 'Your plan'}</strong>
          {date && <span>{date}</span>}
        </>
      )}
    </div>
  )
}

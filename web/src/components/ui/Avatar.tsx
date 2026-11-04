import { useContext, type ReactNode } from 'react'
import { usePrivateMedia } from '@/hooks/usePrivateMedia'
import { PortraitContext } from '@/app/PortraitContext'
import { SharedImage } from './SharedImage'
function Photo({ path }: { path: string }) {
  const query = usePrivateMedia(path)
  return query.data ? (
    <img
      key={query.data}
      src={query.data}
      alt=""
      decoding="async"
      loading="lazy"
      onError={(event) => {
        event.currentTarget.hidden = true
      }}
    />
  ) : null
}
export function Avatar({
  name,
  color,
  large = false,
  path,
  transitionName,
  fallback,
}: {
  name: string
  color: string
  large?: boolean
  path?: string | null
  transitionName?: string | null
  fallback?: ReactNode
}) {
  const inherited = useContext(PortraitContext)
  const motionName = transitionName === undefined ? inherited : transitionName
  return (
    <SharedImage name={motionName}>
      <span
        className={`avatar ${large ? 'avatar-large' : ''}`}
        style={{ '--person-color': color } as React.CSSProperties}
        aria-hidden="true"
        data-portrait-key={motionName ?? undefined}
      >
        {fallback ?? name.trim().slice(0, 1).toUpperCase()}
        {path && <Photo key={path} path={path} />}
      </span>
    </SharedImage>
  )
}

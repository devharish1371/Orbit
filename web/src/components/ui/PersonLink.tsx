import type { ReactNode } from 'react'
import { JourneyLink } from './JourneyLink'
export function PersonLink({
  id,
  name,
  children,
  className,
}: {
  id?: string
  name: string
  children: ReactNode
  className?: string
}) {
  return id ? (
    <JourneyLink
      className={className}
      to={`/person/${id}`}
      aria-label={
        name.toLowerCase() === 'you'
          ? 'View your profile'
          : `View ${name}’s profile`
      }
    >
      {children}
    </JourneyLink>
  ) : (
    <>{children}</>
  )
}

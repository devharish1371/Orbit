import { ViewTransition, type ReactNode } from 'react'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'
/** Only the selected portrait/image participates. Repeated authors never share a name. */
export function SharedImage({
  name,
  children,
}: {
  name?: string | null
  children: ReactNode
}) {
  const motion = useMotionAllowed()
  return motion && name ? (
    <ViewTransition
      key={name}
      name={name}
      default="none"
      enter="none"
      exit="none"
      update="none"
      share="orbit-image"
    >
      {children}
    </ViewTransition>
  ) : (
    children
  )
}

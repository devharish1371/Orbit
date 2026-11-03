import { startTransition } from 'react'
function imageAnimations() {
  return (
    document
      .getAnimations?.()
      .filter((animation) =>
        (animation.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
          '::view-transition',
        ),
      ) ?? []
  )
}
export function cancelImageMotion() {
  document.activeViewTransition?.skipTransition()
  // Some WebViews support transitions before exposing the active transition handle.
  for (const animation of imageAnimations()) animation.cancel()
}
export function changeImageSurface(update: () => void, animate = true) {
  const interrupted =
    Boolean(document.activeViewTransition) || imageAnimations().length > 0
  cancelImageMotion()
  if (animate && !interrupted) startTransition(update)
  else update()
}

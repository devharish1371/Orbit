import { useSyncExternalStore } from 'react'
const preference = '(prefers-reduced-motion: reduce)'
function subscribe(listener: () => void) {
  const query = window.matchMedia?.(preference)
  if (query?.addEventListener) query.addEventListener('change', listener)
  else query?.addListener?.(listener)
  document.addEventListener('visibilitychange', listener)
  return () => {
    if (query?.removeEventListener)
      query.removeEventListener('change', listener)
    else query?.removeListener?.(listener)
    document.removeEventListener('visibilitychange', listener)
  }
}
function allowed() {
  return (
    typeof document.startViewTransition === 'function' &&
    !document.hidden &&
    !window.matchMedia?.(preference).matches
  )
}
export function useMotionAllowed() {
  return useSyncExternalStore(subscribe, allowed, () => false)
}

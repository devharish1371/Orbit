import { motionReduced } from './useComfort'
import { useSyncExternalStore } from 'react'
const preference = '(prefers-reduced-motion: reduce)'
function subscribe(listener: () => void) {
  const query = window.matchMedia?.(preference)
  if (query?.addEventListener) query.addEventListener('change', listener)
  else query?.addListener?.(listener)
  document.addEventListener('visibilitychange', listener)
  window.addEventListener('orbit-comfort-change', listener)
  return () => {
    if (query?.removeEventListener)
      query.removeEventListener('change', listener)
    else query?.removeListener?.(listener)
    document.removeEventListener('visibilitychange', listener)
    window.removeEventListener('orbit-comfort-change', listener)
  }
}
function allowed() {
  return (
    typeof document.startViewTransition === 'function' &&
    !document.hidden &&
    !motionReduced()
  )
}
export function useMotionAllowed() {
  return useSyncExternalStore(subscribe, allowed, () => false)
}

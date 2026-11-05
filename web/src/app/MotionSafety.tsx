import { motionReduced } from '@/hooks/useComfort'
import { useEffect } from 'react'
import { cancelImageMotion } from './imageMotion'
export function MotionSafety() {
  useEffect(() => {
    const hidden = () => {
        if (document.hidden) cancelImageMotion()
      },
      reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)'),
      preference = () => {
        if (motionReduced()) cancelImageMotion()
      }
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('pagehide', cancelImageMotion)
    window.addEventListener('popstate', cancelImageMotion)
    window.addEventListener('orbit-signing-out', cancelImageMotion)
    window.addEventListener('orbit-comfort-change', preference)
    if (reduce?.addEventListener) reduce.addEventListener('change', preference)
    else reduce?.addListener?.(preference)
    return () => {
      cancelImageMotion()
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('pagehide', cancelImageMotion)
      window.removeEventListener('popstate', cancelImageMotion)
      window.removeEventListener('orbit-signing-out', cancelImageMotion)
      window.removeEventListener('orbit-comfort-change', preference)
      if (reduce?.removeEventListener)
        reduce.removeEventListener('change', preference)
      else reduce?.removeListener?.(preference)
    }
  }, [])
  return null
}

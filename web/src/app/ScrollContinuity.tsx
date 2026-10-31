import { useLayoutEffect, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/** Memory-only tab positions; deferred content can grow before restoration finishes. */
export function ScrollContinuity({ userId }: { userId?: string }) {
  const { pathname } = useLocation()
  const positions = useRef(new Map<string, number>())
  const owner = useRef(userId)
  useEffect(() => {
    const prior = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = prior
    }
  }, [])
  useLayoutEffect(() => {
    if (owner.current !== userId) {
      positions.current.clear()
      owner.current = userId
    }
    if (pathname === '/chat') return
    const target = positions.current.get(pathname) ?? 0
    let restoring = true
    const save = () => {
      if (!restoring) positions.current.set(pathname, window.scrollY)
    }
    const stop = () => {
      restoring = false
      observer?.disconnect()
      clearTimeout(timeout)
    }
    const restore = () => {
      if (!restoring) return
      window.scrollTo({ top: target, behavior: 'instant' })
      if (document.documentElement.scrollHeight - window.innerHeight >= target)
        stop()
    }
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(restore)
    const timeout = setTimeout(stop, 5000)
    observer?.observe(document.documentElement)
    window.addEventListener('scroll', save, { passive: true })
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('pointerdown', stop, { passive: true })
    window.addEventListener('keydown', stop)
    restore()
    return () => {
      stop()
      window.removeEventListener('scroll', save)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('keydown', stop)
    }
  }, [pathname, userId])
  return null
}

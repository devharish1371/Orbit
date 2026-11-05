import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  nativeSurfaceSupported,
  surface,
  surfaceAppearance,
} from '@/native/surface'
export function useNativeReady(enabled = true) {
  useEffect(() => {
    if (!nativeSurfaceSupported || !enabled) return
    let active = true,
      frame = 0
    void surface
      .ticket()
      .then(({ ticket }) => {
        if (active)
          frame = requestAnimationFrame(() => {
            if (active)
              void surface
                .appearance(surfaceAppearance())
                .catch(() => {})
                .then(() => {
                  if (active) return surface.ready({ ticket })
                })
                .catch(() => {})
          })
      })
      .catch(() => {})
    return () => {
      active = false
      cancelAnimationFrame(frame)
    }
  }, [enabled])
}
/** The native intent only names an internal destination. Consume once after membership is ready. */
export function useWidgetEntry(enabled: boolean) {
  const navigate = useNavigate()
  const latestNavigate = useRef(navigate)
  useEffect(() => {
    latestNavigate.current = navigate
  }, [navigate])
  useEffect(() => {
    if (!nativeSurfaceSupported || !enabled) return
    let active = true
    const open = () => {
      void surface
        .widgetTarget()
        .then(({ route }) => {
          if (
            active &&
            ['/', '/keepsakes', '/plans', '/widget'].includes(route ?? '')
          )
            void latestNavigate.current(route!)
        })
        .catch(() => {})
    }
    const listener = surface
      .addListener('widgetOpen', open)
      .then((handle) => {
        if (active) open()
        return handle
      })
      .catch(() => {
        if (active) open()
        return null
      })
    const visible = () => {
      if (!document.hidden) open()
    }
    window.addEventListener('focus', visible)
    document.addEventListener('visibilitychange', visible)
    return () => {
      active = false
      window.removeEventListener('focus', visible)
      document.removeEventListener('visibilitychange', visible)
      void listener.then((value) => value?.remove())
    }
  }, [enabled])
}

import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useLocation, useNavigate } from 'react-router-dom'
import { dismissBackLayer, dismissDialog } from './backLayers'

const roots = new Set(['/', '/map', '/moments', '/chat', '/us'])
export function NativeNavigation({ enabled }: { enabled: boolean }) {
  const { pathname, state } = useLocation(),
    navigate = useNavigate()
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        document.querySelector('dialog[open]')
      )
        return
      if (dismissBackLayer()) event.preventDefault()
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [])
  useEffect(() => {
    if (!enabled || Capacitor.getPlatform() !== 'android') return
    let active = true
    const listener = App.addListener('backButton', () => {
      if (!active || dismissDialog() || dismissBackLayer()) return
      // A WebView can have history unrelated to Orbit. Only traverse our router entries.
      const index: unknown = window.history.state?.idx
      if (typeof index === 'number' && index > 0) navigate(-1)
      else if (!roots.has(pathname)) {
        const from: unknown = state?.orbitFrom
        const parent =
          typeof from === 'string' && roots.has(from)
            ? from
            : pathname === '/tracking'
              ? '/map'
              : '/us'
        navigate(parent, { replace: true })
      } else if (pathname !== '/') navigate('/', { replace: true })
      else void App.minimizeApp().catch(() => {})
    }).catch(() => null)
    return () => {
      active = false
      void listener.then((handle) => handle?.remove()).catch(() => {})
    }
  }, [enabled, navigate, pathname, state])
  return null
}

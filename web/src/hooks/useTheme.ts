import { useSyncExternalStore } from 'react'
import { accessibleAccent, blend, isHex } from '@/lib/appearance'
export type Theme = 'system' | 'dark' | 'light'
export function normalizeTheme(value: string): Theme {
  return value === 'light' || value === 'dark' ? value : 'system'
}
function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}
let choice: Theme = normalizeTheme(read('orbit-theme'))
let accent = isHex(read('orbit-accent')) ? read('orbit-accent') : '#FF6B8A'
const listeners = new Set<() => void>()
const media =
  typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-color-scheme: light)')
    : undefined
function apply() {
  const light =
    choice === 'system' ? Boolean(media?.matches) : choice === 'light'
  const root = document.documentElement
  root.dataset.theme = light ? 'light' : 'dark'
  root.style.setProperty('--primary', accessibleAccent(accent, light))
  root.style.setProperty('--button-from', blend(accent, '#FFFFFF', 0.5))
  root.style.setProperty('--button-to', blend(accent, '#C8A8F8', 0.55))
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', light ? '#FBF7FA' : '#0B0B12')
}
function notify() {
  apply()
  listeners.forEach((listener) => listener())
}
export function setAppearance(theme: Theme, color: string): void {
  choice = theme
  accent = isHex(color) ? color : '#FF6B8A'
  try {
    localStorage.setItem('orbit-theme', choice)
    localStorage.setItem('orbit-accent', accent)
  } catch {
    /* In-memory appearance still works when browser storage is unavailable. */
  }
  notify()
}
if (typeof window !== 'undefined') {
  media?.addEventListener('change', notify)
  window.addEventListener('storage', (event) => {
    if (event.key === 'orbit-theme' || event.key === 'orbit-accent') {
      choice = normalizeTheme(read('orbit-theme'))
      accent = isHex(read('orbit-accent')) ? read('orbit-accent') : '#FF6B8A'
      notify()
    }
  })
  apply()
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
function snapshot() {
  return `${choice}|${accent}|${Boolean(media?.matches)}`
}
export function useTheme() {
  useSyncExternalStore(subscribe, snapshot, () => 'system|#FF6B8A|false')
  return {
    theme: choice,
    accent,
    setTheme(value: Theme) {
      setAppearance(value, accent)
    },
  }
}

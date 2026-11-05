import { useSyncExternalStore } from 'react'
export type TextSize = 'standard' | 'larger' | 'largest'
export type MotionChoice = 'system' | 'reduced'
const storageKey = 'orbit-comfort-v1'
const listeners = new Set<() => void>()
const media =
  typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)')
    : undefined
function read() {
  try {
    const value = JSON.parse(
      localStorage.getItem(storageKey) ?? '{}',
    ) as Record<string, unknown>
    return {
      text:
        value?.text === 'larger' || value?.text === 'largest'
          ? value.text
          : 'standard',
      motion: value?.motion === 'reduced' ? 'reduced' : 'system',
    } as { text: TextSize; motion: MotionChoice }
  } catch {
    return { text: 'standard', motion: 'system' } as const
  }
}
let choice: { text: TextSize; motion: MotionChoice } = read()
export function motionReduced() {
  return (
    choice.motion === 'reduced' ||
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  )
}
function notify() {
  document.documentElement.dataset.textSize = choice.text
  document.documentElement.dataset.motion = motionReduced()
    ? 'reduced'
    : 'system'
  listeners.forEach((listener) => listener())
  window.dispatchEvent(new Event('orbit-comfort-change'))
}
export function setComfort(value: { text?: TextSize; motion?: MotionChoice }) {
  choice = {
    text: value.text ?? choice.text,
    motion: value.motion ?? choice.motion,
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(choice))
  } catch {
    /* Still applies for this session. */
  }
  notify()
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
function snapshot() {
  return `${choice.text}|${choice.motion}|${motionReduced()}`
}
if (typeof window !== 'undefined') {
  media?.addEventListener('change', notify)
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) {
      choice = read()
      notify()
    }
  })
  notify()
}
export function useComfort() {
  useSyncExternalStore(subscribe, snapshot, () => 'standard|system|false')
  return { ...choice, reduced: motionReduced(), setComfort }
}

export function comfortSnapshot() {
  return { text: choice.text, reduced: motionReduced() }
}

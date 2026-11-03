import { useEffect, useLayoutEffect, useRef } from 'react'

const layers = new Map<symbol, () => void>()
/** A tray/menu is a temporary layer, not a new route. Last opened closes first. */
export function dismissBackLayer() {
  const close = [...layers.values()].at(-1)
  if (!close) return false
  close()
  return true
}
export function useBackLayer(open: boolean, onClose: () => void) {
  const callback = useRef(onClose)
  useLayoutEffect(() => {
    callback.current = onClose
  }, [onClose])
  useEffect(() => {
    if (!open) return
    const token = Symbol('overlay')
    layers.set(token, () => callback.current())
    return () => {
      layers.delete(token)
    }
  }, [open])
}
/** Cancel goes through the existing sheet's busy guard and restores its own focus. */
export function dismissDialog() {
  const dialog = [
    ...document.querySelectorAll<HTMLDialogElement>('dialog[open]'),
  ].at(-1)
  if (!dialog) return false
  const event = new Event('cancel', { cancelable: true })
  if (dialog.dispatchEvent(event)) dialog.close()
  return true
}

import { useEffect, useLayoutEffect, type RefObject } from 'react'
function resize(node: HTMLTextAreaElement | null, max: number) {
  if (!node) return
  node.style.height = 'auto'
  node.style.height = Math.min(node.scrollHeight, max) + 'px'
}
/** Restore a multi-line draft before paint; width changes can rewrap it after navigation. */
export function useAutoSizeTextArea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  max = 132,
) {
  useLayoutEffect(() => resize(ref.current, max), [ref, value, max])
  useEffect(() => {
    const node = ref.current
    if (!node || typeof ResizeObserver === 'undefined') return
    let width = node.getBoundingClientRect().width
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width
      if (next === undefined || next === width) return
      width = next
      resize(node, max)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, max])
}

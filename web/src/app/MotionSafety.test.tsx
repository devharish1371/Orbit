import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { MotionSafety } from './MotionSafety'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'
import { cancelImageMotion } from './imageMotion'
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'activeViewTransition')
  Reflect.deleteProperty(document, 'startViewTransition')
  Reflect.deleteProperty(document, 'getAnimations')
})
test('older WebViews cancel only transition pseudo-elements, preserving unrelated animation', () => {
  const shared = {
      effect: { pseudoElement: '::view-transition-group(portrait)' },
      cancel: vi.fn(),
    },
    ambient = { effect: { pseudoElement: '::before' }, cancel: vi.fn() }
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () => [shared, ambient],
  })
  cancelImageMotion()
  expect(shared.cancel).toHaveBeenCalledOnce()
  expect(ambient.cancel).not.toHaveBeenCalled()
})
test('reduced motion and hiding the app disable shared motion; logout/back cancel an active snapshot', () => {
  let reduced = false
  const listeners = new Set<() => void>(),
    skip = vi.fn()
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduced
    },
    addEventListener: (_name: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_name: string, listener: () => void) =>
      listeners.delete(listener),
  }))
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(document, 'activeViewTransition', {
    configurable: true,
    value: { skipTransition: skip },
  })
  function Probe() {
    return <p>{useMotionAllowed() ? 'Motion on' : 'Motion off'}</p>
  }
  const view = render(
    <>
      <MotionSafety />
      <Probe />
    </>,
  )
  expect(screen.getByText('Motion on')).toBeVisible()
  act(() => {
    reduced = true
    listeners.forEach((listener) => listener())
  })
  expect(screen.getByText('Motion off')).toBeVisible()
  expect(skip).toHaveBeenCalled()
  skip.mockClear()
  fireEvent(window, new Event('orbit-signing-out'))
  expect(skip).toHaveBeenCalledOnce()
  skip.mockClear()
  fireEvent(window, new PopStateEvent('popstate'))
  expect(skip).toHaveBeenCalledOnce()
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  skip.mockClear()
  fireEvent(document, new Event('visibilitychange'))
  expect(skip).toHaveBeenCalledOnce()
  view.unmount()
  expect(listeners.size).toBe(0)
})

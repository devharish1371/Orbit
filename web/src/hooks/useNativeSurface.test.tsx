import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useNativeReady, useWidgetEntry } from './useNativeSurface'
const bridge = vi.hoisted(() => ({
  supported: true,
  ticket: vi.fn(),
  ready: vi.fn(),
  appearance: vi.fn(),
  target: vi.fn(),
  listen: vi.fn(),
}))
vi.mock('@/native/surface', () => ({
  get nativeSurfaceSupported() {
    return bridge.supported
  },
  surface: {
    ticket: bridge.ticket,
    ready: bridge.ready,
    appearance: bridge.appearance,
    widgetTarget: bridge.target,
    addListener: bridge.listen,
  },
  surfaceAppearance: () => ({
    theme: 'light',
    accent: '#FF6B8A',
    text: 'largest',
    reduced: true,
  }),
}))
let frame: FrameRequestCallback | undefined
beforeEach(() => {
  bridge.supported = true
  bridge.ticket.mockReset().mockResolvedValue({ ticket: 'load-one' })
  bridge.ready.mockReset().mockResolvedValue(undefined)
  bridge.appearance.mockReset().mockResolvedValue(undefined)
  bridge.target.mockReset().mockResolvedValue({ route: null })
  bridge.listen.mockReset().mockResolvedValue({ remove: vi.fn() })
  frame = undefined
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((fn: FrameRequestCallback) => {
      frame = fn
      return 7
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())
function Ready({ enabled = true }: { enabled?: boolean }) {
  useNativeReady(enabled)
  return <p>Screen</p>
}
test('native reveal waits for a committed frame and its current appearance, without a timer', async () => {
  let resolve!: (value: undefined) => void
  bridge.appearance.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r
      }),
  )
  render(<Ready />)
  await waitFor(() => expect(frame).toBeDefined())
  expect(bridge.ready).not.toHaveBeenCalled()
  act(() => frame!(1))
  expect(bridge.appearance).toHaveBeenCalledWith(
    expect.objectContaining({ theme: 'light', text: 'largest', reduced: true }),
  )
  expect(bridge.ready).not.toHaveBeenCalled()
  await act(async () => resolve(undefined))
  expect(bridge.ready).toHaveBeenCalledWith({ ticket: 'load-one' })
})
test('a palette storage failure does not strand a usable screen behind the opening cover', async () => {
  bridge.appearance.mockRejectedValue(new Error('Storage unavailable'))
  render(<Ready />)
  await waitFor(() => expect(frame).toBeDefined())
  await act(async () => frame!(1))
  expect(bridge.ready).toHaveBeenCalledWith({ ticket: 'load-one' })
})
test('unmounting before the frame or while appearance is pending cannot release another page', async () => {
  let resolve!: (value: undefined) => void
  bridge.appearance.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r
      }),
  )
  const view = render(<Ready />)
  await waitFor(() => expect(frame).toBeDefined())
  act(() => frame!(1))
  view.unmount()
  await act(async () => resolve(undefined))
  expect(bridge.ready).not.toHaveBeenCalled()
})
test('disabled or browser readiness never calls the native bridge', () => {
  const view = render(<Ready enabled={false} />)
  expect(bridge.ticket).not.toHaveBeenCalled()
  bridge.supported = false
  view.rerender(<Ready />)
  expect(bridge.ticket).not.toHaveBeenCalled()
})
function Entry() {
  useWidgetEntry(true)
  const location = useLocation()
  return <p>{location.pathname}</p>
}
test('widget entry consumes only whitelisted internal routes and removes its listener', async () => {
  let notify!: () => void
  const remove = vi.fn()
  bridge.listen.mockImplementation((_event, callback) => {
    notify = callback
    return Promise.resolve({ remove })
  })
  bridge.target
    .mockResolvedValueOnce({ route: '/plans' })
    .mockResolvedValueOnce({ route: 'https://example.com/elsewhere' })
  const view = render(
    <MemoryRouter>
      <Entry />
    </MemoryRouter>,
  )
  await screen.findByText('/plans')
  await act(async () => notify())
  expect(screen.getByText('/plans')).toBeVisible()
  view.unmount()
  await waitFor(() => expect(remove).toHaveBeenCalledOnce())
})

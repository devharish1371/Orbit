import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { useState } from 'react'
import { NativeNavigation } from './NativeNavigation'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { useBackLayer } from './backLayers'
const native = vi.hoisted(() => ({
  platform: 'android',
  callbacks: [] as (() => void)[],
  remove: vi.fn(),
  minimize: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => native.platform },
}))
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_event: string, callback: () => void) => {
      native.callbacks.push(callback)
      return { remove: native.remove }
    }),
    minimizeApp: native.minimize,
  },
}))
beforeEach(() => {
  native.platform = 'android'
  native.callbacks.length = 0
  native.remove.mockReset()
  native.minimize.mockReset().mockResolvedValue(undefined)
  window.history.replaceState({ idx: 0 }, '')
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})
function Location() {
  return <p>{useLocation().pathname}</p>
}
function start(path: string, state?: object) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <NativeNavigation enabled />
      <Location />
    </MemoryRouter>,
  )
}
function back() {
  act(() => native.callbacks.at(-1)?.())
}
test('native Back requests sheet cancellation first and respects its pending guard', async () => {
  const close = vi.fn()
  const view = render(
    <MemoryRouter initialEntries={['/chat']}>
      <NativeNavigation enabled />
      <Location />
      <DialogSheet title="Confirm" dismissible={false} onClose={close}>
        Working
      </DialogSheet>
    </MemoryRouter>,
  )
  back()
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.getByText('/chat')).toBeVisible()
  view.rerender(
    <MemoryRouter initialEntries={['/chat']}>
      <NativeNavigation enabled />
      <Location />
      <DialogSheet title="Confirm" onClose={close}>
        Ready
      </DialogSheet>
    </MemoryRouter>,
  )
  back()
  expect(close).toHaveBeenCalledOnce()
  expect(screen.getByText('/chat')).toBeVisible()
})
test('native Back closes a native choice dialog through its close lifecycle', () => {
  start('/chat')
  const dialog = document.createElement('dialog'),
    closed = vi.fn()
  dialog.setAttribute('open', '')
  dialog.addEventListener('close', closed)
  document.body.append(dialog)
  back()
  expect(closed).toHaveBeenCalledOnce()
  expect(dialog.open).toBe(false)
  expect(screen.getByText('/chat')).toBeVisible()
  dialog.remove()
})
test('temporary layers close in opening order, with Escape and Back sharing behavior', () => {
  function Layers() {
    const [outer, setOuter] = useState(true),
      [inner, setInner] = useState(false)
    useBackLayer(outer, () => setOuter(false))
    useBackLayer(inner, () => setInner(false))
    return (
      <>
        <p>{outer ? 'Outer open' : 'Outer closed'}</p>
        <p>{inner ? 'Inner open' : 'Inner closed'}</p>
        <button onClick={() => setInner(true)}>Open inner</button>
      </>
    )
  }
  render(
    <MemoryRouter initialEntries={['/chat']}>
      <NativeNavigation enabled />
      <Location />
      <Layers />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open inner' }))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.getByText('Inner closed')).toBeVisible()
  expect(screen.getByText('Outer open')).toBeVisible()
  back()
  expect(screen.getByText('Outer closed')).toBeVisible()
  expect(screen.getByText('/chat')).toBeVisible()
})
test.each([
  ['/tracking', undefined, '/map'],
  ['/person/fixture', { orbitFrom: '/chat' }, '/chat'],
  ['/settings', { orbitFrom: 'https://other.example' }, '/us'],
  ['/map', undefined, '/'],
])('a direct %s entry returns to a safe parent', (path, state, parent) => {
  start(path, state)
  back()
  expect(screen.getByText(parent)).toBeVisible()
})
test('router Back preserves an existing entry before minimizing at Home', async () => {
  window.history.replaceState({ idx: 1 }, '')
  render(
    <MemoryRouter initialEntries={['/moments', '/chat']} initialIndex={1}>
      <NativeNavigation enabled />
      <Location />
    </MemoryRouter>,
  )
  back()
  expect(screen.getByText('/moments')).toBeVisible()
  window.history.replaceState({ idx: 0 }, '')
  back()
  expect(screen.getByText('/')).toBeVisible()
  back()
  expect(native.minimize).toHaveBeenCalledOnce()
  await waitFor(() => expect(native.remove).toHaveBeenCalled())
})
test('web navigation retains the browser default and unmount removes the native subscription', async () => {
  native.platform = 'web'
  const web = start('/chat')
  expect(native.callbacks).toHaveLength(0)
  web.unmount()
  native.platform = 'android'
  const android = start('/chat')
  expect(native.callbacks).toHaveLength(1)
  android.unmount()
  await waitFor(() => expect(native.remove).toHaveBeenCalledOnce())
})

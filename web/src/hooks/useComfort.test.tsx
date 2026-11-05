import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
const platform = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const media = {
    matches: false,
    addEventListener: (_name: string, fn: () => void) => listeners.add(fn),
  }
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => media,
  })
  return { media, listeners }
})
import { setComfort, motionReduced } from './useComfort'
import { ComfortControls } from '@/features/settings/ComfortControls'
afterEach(() => {
  platform.media.matches = false
  act(() => setComfort({ text: 'standard', motion: 'system' }))
  vi.restoreAllMocks()
})
test('reading and motion choices update the app and persist together without changing theme', async () => {
  document.documentElement.dataset.theme = 'light'
  render(<ComfortControls />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Largest' }))
  await user.click(screen.getByRole('button', { name: 'Less motion' }))
  expect(document.documentElement.dataset.textSize).toBe('largest')
  expect(motionReduced()).toBe(true)
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(JSON.parse(localStorage.getItem('orbit-comfort-v1')!)).toEqual({
    text: 'largest',
    motion: 'reduced',
  })
  expect(screen.getByRole('button', { name: 'Largest' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
test('follow-phone cannot override the OS reduced-motion preference', () => {
  render(<ComfortControls />)
  act(() => {
    platform.media.matches = true
    platform.listeners.forEach((fn) => fn())
  })
  expect(motionReduced()).toBe(true)
  expect(document.documentElement.dataset.motion).toBe('reduced')
  expect(screen.getByText(/Your phone has reduced motion on/)).toBeVisible()
  act(() => {
    platform.media.matches = false
    platform.listeners.forEach((fn) => fn())
  })
  expect(motionReduced()).toBe(false)
})
test('cross-tab clear and malformed settings fall back safely', () => {
  render(<ComfortControls />)
  act(() => setComfort({ text: 'larger', motion: 'reduced' }))
  localStorage.setItem('orbit-comfort-v1', '{bad')
  act(() =>
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'orbit-comfort-v1' }),
    ),
  )
  expect(document.documentElement.dataset.textSize).toBe('standard')
  expect(motionReduced()).toBe(false)
  act(() => setComfort({ text: 'largest' }))
  localStorage.clear()
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })))
  expect(document.documentElement.dataset.textSize).toBe('standard')
})
test('blocked local storage still allows session-only comfort changes', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Unavailable')
  })
  expect(() => setComfort({ text: 'larger', motion: 'reduced' })).not.toThrow()
  expect(document.documentElement.dataset.textSize).toBe('larger')
  expect(motionReduced()).toBe(true)
})

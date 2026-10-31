import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import type { ReactNode } from 'react'
import Shell from './Shell'
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { display_name: 'You', color: '#ff6b8a' },
      couple: { id: 'fixture' },
    },
    isPending: false,
  }),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ signOut: vi.fn() }) }))
vi.mock('@/features/map/LiveContext', () => ({
  LiveProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/features/location/LocationProvider', () => ({
  LocationProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/features/alerts/PushProvider', () => ({
  PushProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/features/memories/AnniversaryReveal', () => ({
  AutomaticReveal: () => null,
}))
test('keeps navigation mounted while the requested screen loads', async () => {
  let ready = false,
    release = () => {}
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  function Delayed() {
    if (!ready) throw pending
    return <h1>Conversation ready</h1>
  }
  render(
    <MemoryRouter initialEntries={['/chat']}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="chat" element={<Delayed />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  const nav = screen.getByRole('navigation', { name: 'Orbit' })
  expect(nav).toBeVisible()
  expect(screen.getByRole('status', { name: 'Loading…' })).toBeVisible()
  await act(async () => {
    ready = true
    release()
    await pending
  })
  expect(
    await screen.findByRole('heading', { name: 'Conversation ready' }),
  ).toBeVisible()
  expect(screen.getByRole('navigation', { name: 'Orbit' })).toBe(nav)
})

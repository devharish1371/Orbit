import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import App from '@/App'
const auth = vi.hoisted(() => ({
  session: { user: { id: 'fixture' } } as Session | null,
  restoring: false,
  restoreError: false,
  retryRestore: vi.fn(),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('@/app/Shell', () => ({
  default: function TestShell() {
    const [draft, setDraft] = useState('')
    return (
      <>
        <input
          aria-label="Unsent draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Outlet />
      </>
    )
  },
}))
vi.mock('@/features/home/HomePage', () => ({ default: () => <h1>Home</h1> }))
afterEach(() => vi.restoreAllMocks())
test('an existing signed-in screen and draft survive a temporary session refresh failure', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const user = userEvent.setup()
  const view = render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: 'Home' })
  await user.type(screen.getByLabelText('Unsent draft'), 'Still writing')
  auth.restoreError = true
  auth.restoring = true
  view.rerender(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: 'Home' })).toBeVisible()
  expect(screen.getByLabelText('Unsent draft')).toHaveValue('Still writing')
  auth.restoreError = false
  auth.restoring = false
})

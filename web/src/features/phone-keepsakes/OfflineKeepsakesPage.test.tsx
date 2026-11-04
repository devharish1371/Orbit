import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import OfflineKeepsakesPage from './OfflineKeepsakesPage'
import { AuthContext, type AuthValue } from '@/app/AuthContext'
const native = vi.hoisted(() => ({ identity: vi.fn(), items: vi.fn() }))
vi.mock('./native', () => ({
  phoneCopiesSupported: true,
  phone: { identity: native.identity },
  phoneItems: native.items,
  phoneOperation: (fn: () => Promise<unknown>) => fn(),
  readPhoneMedia: vi.fn(),
}))
beforeEach(() => {
  native.identity
    .mockReset()
    .mockResolvedValue({ owner: 'own', couple: 'couple' })
  native.items.mockReset().mockResolvedValue([
    {
      id: 'saved',
      kind: 'text',
      body: 'Offline saved note',
      created_at: '2026-11-05T00:00:00Z',
      bytes: 0,
    },
  ])
})
test('cold offline library reads native files without auth, space, query or network providers', async () => {
  render(
    <MemoryRouter>
      <OfflineKeepsakesPage />
    </MemoryRouter>,
  )
  expect(await screen.findByText('Offline saved note')).toBeVisible()
  expect(screen.getByText('1 saved · Opens without internet')).toBeVisible()
})
test('a disabled vault fails closed and clears previously displayed private metadata', async () => {
  render(
    <MemoryRouter>
      <OfflineKeepsakesPage />
    </MemoryRouter>,
  )
  await screen.findByText('Offline saved note')
  native.identity.mockRejectedValue(new Error('SIGNED_OUT'))
  await userEvent.click(
    screen.getByRole('button', { name: 'Check saved files' }),
  )
  expect(
    await screen.findByText(
      'Set up phone copies in Keepsakes while you’re connected.',
    ),
  ).toBeVisible()
  expect(screen.queryByText('Offline saved note')).not.toBeInTheDocument()
})
test('signing out clears the private library even while its route is still mounted', async () => {
  render(
    <MemoryRouter>
      <OfflineKeepsakesPage />
    </MemoryRouter>,
  )
  await screen.findByText('Offline saved note')
  act(() => window.dispatchEvent(new Event('orbit-signing-out')))
  expect(screen.queryByText('Offline saved note')).not.toBeInTheDocument()
})
test('account changes hide old private metadata immediately while native identity is still loading', async () => {
  const library = (owner: string) => (
    <AuthContext.Provider
      value={{ session: { user: { id: owner } } } as AuthValue}
    >
      <MemoryRouter>
        <OfflineKeepsakesPage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
  const view = render(library('own'))
  await screen.findByText('Offline saved note')
  native.identity.mockImplementation(() => new Promise(() => {}))
  view.rerender(library('different-account'))
  expect(screen.queryByText('Offline saved note')).not.toBeInTheDocument()
})

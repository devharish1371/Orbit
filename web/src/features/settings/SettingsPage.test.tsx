import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import SettingsPage from './SettingsPage'
const logout = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
afterEach(() => vi.unstubAllGlobals())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ client: {}, signOut: logout }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: 'me' },
      couple: { anniversary: null, meet_url: null },
    },
  }),
}))
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}))
vi.mock('@/features/outbox/OutboxContext', () => ({
  useOutbox: () => ({ items: [{ id: 'pending' }] }),
}))
vi.mock('@/features/posts/StorageStatus', () => ({ StorageStatus: () => null }))
vi.mock('@/features/memories/ExportMemories', () => ({
  ExportMemories: () => null,
}))
vi.mock('./PrivacySettings', () => ({ PrivacySettings: () => null }))
test('logging out with pending texts requires confirmation before clearing them', async () => {
  vi.stubGlobal('__ORBIT_BUILD__', 'test')
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
  expect(logout).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'Pending texts and private phone copies will be removed from this device',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(logout).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Log out' }),
  )
  await waitFor(() => expect(logout).toHaveBeenCalledOnce())
})

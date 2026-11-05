import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import NotificationsPage from './NotificationsPage'
const f = vi.hoisted(() => ({ update: vi.fn() }))
vi.mock('./PushContext', () => ({ usePush: () => ({ state: 'web' }) }))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: {
        user_id: 'me',
        notify_prefs: { plans: false, chat: true },
        quiet_start: '23:00',
        quiet_end: '07:00',
      },
      couple: { timezone: 'Asia/Kolkata' },
    },
  }),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    client: {
      from: () => ({
        update: (body: unknown) => {
          f.update(body)
          const b = {
            eq: () => b,
            select: () => b,
            single: async () => ({ error: null }),
          }
          return b
        },
      }),
    },
  }),
}))
test('safety notifications default off and saving preserves preferences owned by other screens', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(
    screen.getByRole('checkbox', { name: 'Shared check-in reminders' }),
  ).not.toBeChecked()
  expect(f.update).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(f.update).toHaveBeenCalledWith(
      expect.objectContaining({
        notify_prefs: expect.objectContaining({
          plans: false,
          safety: false,
          chat: true,
        }),
      }),
    ),
  )
})

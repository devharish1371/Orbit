import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { JourneyCheckins } from './JourneyCheckins'
const f = vi.hoisted(() => ({
  rpc: vi.fn(),
  rows: [] as Record<string, unknown>[],
  owner: 'a',
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: f.owner } },
    client: { rpc: f.rpc },
  }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: f.owner },
      couple: { id: 'room', timezone: 'Asia/Kolkata' },
    },
  }),
}))
vi.mock('./useSafety', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./useSafety')>()),
  useJourneys: () => ({ data: f.rows, refetch: vi.fn() }),
}))
function setup() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        })
      }
    >
      <MemoryRouter>
        <JourneyCheckins />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  f.rows = []
  f.owner = 'a'
  f.rpc
    .mockReset()
    .mockResolvedValue({ data: { status: 'not_due' }, error: null })
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
test('new timer is private, waits for server, and a failed start retains identity for exact retry', async () => {
  const u = userEvent.setup()
  setup()
  await u.click(screen.getByRole('button', { name: 'Set a timer' }))
  await u.type(screen.getByLabelText('Where are you heading?'), 'Home')
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  f.rpc.mockResolvedValueOnce({ error: { message: 'offline' } })
  await u.click(screen.getByRole('button', { name: 'Start check-in' }))
  await screen.findByRole('alert')
  const body = f.rpc.mock.calls[0]?.[1]
  expect(body).toMatchObject({
    p_share: false,
    p_expected_user: 'a',
    p_expected_couple: 'room',
    p_version: null,
  })
  expect(screen.getByLabelText('Where are you heading?')).toHaveValue('Home')
  await u.click(screen.getByRole('button', { name: 'Start check-in' }))
  await waitFor(() => expect(f.rpc).toHaveBeenCalledTimes(2))
  expect(f.rpc.mock.calls[1]?.[1]).toEqual(body)
})
test('shared timer needs concrete consent and cancel preserves the draft', async () => {
  const u = userEvent.setup()
  setup()
  await u.click(screen.getByRole('button', { name: 'Set a timer' }))
  await u.type(screen.getByLabelText('Where are you heading?'), 'The café')
  await u.click(screen.getByRole('checkbox'))
  await u.click(screen.getByRole('button', { name: 'Start check-in' }))
  expect(
    screen.getByRole('heading', { name: 'Share this check-in?' }),
  ).toBeInTheDocument()
  expect(f.rpc).not.toHaveBeenCalled()
  await u.click(screen.getByRole('button', { name: /^Cancel$/ }))
  expect(screen.getByLabelText('Where are you heading?')).toHaveValue(
    'The café',
  )
  expect(f.rpc).not.toHaveBeenCalled()
  await u.click(screen.getByRole('button', { name: 'Start check-in' }))
  await u.click(screen.getByRole('button', { name: 'Share and start' }))
  await waitFor(() =>
    expect(f.rpc).toHaveBeenCalledWith(
      'save_safety_journey',
      expect.objectContaining({ p_share: true }),
    ),
  )
})
test('overdue is no confirmed check-in; actions carry version and stale failure remains retryable', async () => {
  f.rpc.mockResolvedValue({ data: { status: 'private' }, error: null })
  const u = userEvent.setup()
  f.rows = [
    {
      id: 'trip',
      user_id: 'a',
      state: 'active',
      share_overdue: false,
      version: 3,
      destination: 'Home',
      created_at: new Date(Date.now() - 120000).toISOString(),
      deadline: new Date(Date.now() - 60000).toISOString(),
    },
  ]
  setup()
  await screen.findByText('Private timer')
  expect(screen.getByText('No check-in yet')).toBeInTheDocument()
  f.rpc.mockResolvedValueOnce({ error: { message: 'JOURNEY_CHANGED' } })
  await u.click(screen.getByRole('button', { name: 'I’m here' }))
  await screen.findByText('This timer changed. Refresh before trying again.')
  expect(f.rpc).toHaveBeenCalledWith(
    'save_safety_journey',
    expect.objectContaining({
      p_id: 'trip',
      p_version: 3,
      p_action: 'check_in',
    }),
  )
  expect(screen.getByRole('button', { name: 'I’m here' })).toBeEnabled()
})

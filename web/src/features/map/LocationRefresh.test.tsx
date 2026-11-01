import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import type { Database } from '@/lib/database.types'
import { LocationRefresh } from './LocationRefresh'
const api = vi.hoisted(() => ({
  rpc: vi.fn(),
  refetch: vi.fn().mockResolvedValue({ error: null }),
  requests: [] as unknown[],
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ client: { rpc: api.rpc } }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: { self: { user_id: 'self' }, couple: { id: 'couple' } },
  }),
}))
vi.mock('./LiveContext', () => ({
  useLiveData: () => ({
    refreshRequests: { data: api.requests },
    locations: { refetch: api.refetch },
  }),
}))
const member = {
  user_id: 'partner',
  location_epoch: 1,
  share_mode: 'live',
} as Database['public']['Tables']['members']['Row']
const now = Date.now()
const request = {
  user_id: 'partner',
  couple_id: 'couple',
  location_epoch: 1,
  requested_at: new Date(now).toISOString(),
  expires_at: new Date(now + 120_000).toISOString(),
  baseline_at: new Date(now - 60_000).toISOString(),
}
function setup(mode = 'live', recordedAt = request.baseline_at) {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const element = (stamp: string) => (
    <QueryClientProvider client={query}>
      <LocationRefresh
        member={{ ...member, share_mode: mode }}
        recordedAt={stamp}
      />
    </QueryClientProvider>
  )
  const view = render(element(recordedAt))
  return { query, ...view, element }
}
afterEach(() => {
  cleanup()
  api.requests = []
  vi.clearAllMocks()
  vi.useRealTimers()
})
test('refresh creates a partner request and re-reads the map without claiming GPS success', async () => {
  api.rpc.mockResolvedValue({ data: request, error: null })
  const { query } = setup()
  await userEvent.click(
    screen.getByRole('button', { name: 'Refresh location' }),
  )
  expect(api.rpc).toHaveBeenCalledWith('request_location_refresh', {
    p_user_id: 'partner',
  })
  expect(api.refetch).toHaveBeenCalledTimes(1)
  expect(query.getQueryData(['location-refresh', 'couple'])).toEqual([request])
  expect(screen.queryByText('New location received.')).not.toBeInTheDocument()
})
test('pending request blocks duplicate taps and only a new timestamp completes it', () => {
  api.requests = [request]
  const view = setup()
  expect(
    screen.getByRole('button', { name: 'Updating location' }),
  ).toBeDisabled()
  expect(screen.getByText('Waiting for their phone…')).toBeVisible()
  view.rerender(view.element(new Date(now + 1000).toISOString()))
  expect(screen.getByText('New location received.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Refresh location' })).toBeEnabled()
})
test('paused sharing is never refreshed, and Surprise confirms only an approximate update', () => {
  const view = setup('paused')
  expect(
    screen.getByRole('button', { name: 'Refresh location' }),
  ).toBeDisabled()
  expect(api.rpc).not.toHaveBeenCalled()
  view.unmount()
  api.requests = [request]
  setup('surprise', new Date(now + 1000).toISOString())
  expect(screen.getByText('Approximate location updated.')).toBeVisible()
})
test('a request times out honestly and stops polling', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  api.requests = [request]
  setup()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(125_000)
  })
  expect(
    screen.getByText(
      'No new fix yet. The phone may be offline or unable to get GPS.',
    ),
  ).toBeVisible()
  const reads = api.refetch.mock.calls.length
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000)
  })
  expect(api.refetch).toHaveBeenCalledTimes(reads)
})
test('a network failure remains retryable', async () => {
  api.rpc.mockResolvedValue({ error: new Error('offline'), data: null })
  setup()
  await userEvent.click(
    screen.getByRole('button', { name: 'Refresh location' }),
  )
  expect(screen.getByRole('status')).toHaveTextContent(
    'Couldn’t request an update.',
  )
  expect(screen.getByRole('button', { name: 'Refresh location' })).toBeEnabled()
})

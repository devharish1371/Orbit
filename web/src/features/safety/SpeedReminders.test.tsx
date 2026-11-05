import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { SpeedReminders } from './SpeedReminders'
const f = vi.hoisted(() => ({
  supported: true,
  status: vi.fn(),
  configure: vi.fn(),
  dismiss: vi.fn(),
}))
vi.mock('./native', () => ({
  get speedSupported() {
    return f.supported
  },
  safety: { status: f.status, configure: f.configure, dismiss: f.dismiss },
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'me' } } }),
}))
const off = {
  supported: true,
  enabled: false,
  threshold: 80,
  running: true,
  notifications: true,
  pendingId: null,
  pendingAt: 0,
}
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
        <SpeedReminders />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  f.supported = true
  f.status.mockReset().mockResolvedValue(off)
  f.configure.mockReset()
  f.dismiss.mockReset()
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
test('opening never enables tracking or reminders; browsers have no native setup control', async () => {
  f.supported = false
  setup()
  expect(
    screen.queryByRole('button', { name: 'Set up' }),
  ).not.toBeInTheDocument()
  expect(f.status).not.toHaveBeenCalled()
  expect(f.configure).not.toHaveBeenCalled()
})
test('threshold setup requires consent and waits for a successful native acknowledgement', async () => {
  const u = userEvent.setup()
  setup()
  await u.click(await screen.findByRole('button', { name: 'Set up' }))
  expect(f.configure).not.toHaveBeenCalled()
  await u.click(screen.getByRole('button', { name: 'Remind above: 80 km/h' }))
  await u.click(screen.getByRole('button', { name: '100 km/h' }))
  f.configure.mockRejectedValueOnce(new Error('TRACKING_REQUIRED'))
  await u.click(screen.getByRole('button', { name: 'Enable reminder' }))
  await screen.findByText(
    'Start tracking and allow notifications in Tracking health first.',
  )
  expect(
    screen.getByRole('button', { name: 'Remind above: 100 km/h' }),
  ).toBeInTheDocument()
  f.configure.mockResolvedValueOnce({ ...off, enabled: true, threshold: 100 })
  await u.click(screen.getByRole('button', { name: 'Enable reminder' }))
  await screen.findByText('100 km/h · tracking active')
  expect(f.configure).toHaveBeenLastCalledWith({
    owner: 'me',
    enabled: true,
    threshold: 100,
  })
})
test('a historical local prompt can be dismissed by its own ID without sending anything', async () => {
  f.status.mockResolvedValue({
    ...off,
    enabled: true,
    pendingId: 'prompt',
    pendingAt: Date.now() - 60000,
  })
  f.dismiss.mockResolvedValue({ ...off, enabled: true })
  setup()
  const u = userEvent.setup()
  await u.click(await screen.findByRole('button', { name: 'Dismiss' }))
  await waitFor(() =>
    expect(f.dismiss).toHaveBeenCalledWith({ owner: 'me', id: 'prompt' }),
  )
  expect(f.configure).not.toHaveBeenCalled()
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Speed reminder' }),
    ).not.toBeInTheDocument(),
  )
})

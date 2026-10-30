import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  requestLocation: vi.fn().mockResolvedValue(undefined),
  requestBackground: vi.fn().mockResolvedValue(undefined),
  requestNotifications: vi.fn().mockResolvedValue(undefined),
  requestIgnore: vi.fn().mockResolvedValue(undefined),
  start: vi.fn().mockResolvedValue(undefined),
  mode: vi.fn().mockResolvedValue(undefined),
  health: {
    native: true,
    services: true,
    location: false,
    background: false,
    notifications: false,
    battery: false,
    enabled: false,
    running: false,
    lastUpload: 0,
    lastFix: 0,
    mode: 'moving',
    pendingMode: false,
    auth: true,
    rebooted: false,
    manufacturer: 'Nothing',
    model: 'Phone (3a)',
    os: '16',
    queue: 0,
  },
}))
vi.mock('@/native/tracker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/native/tracker')>()),
  nativeTracking: true,
  tracker: mocks,
}))
vi.mock('@/native/useTrackingHealth', () => ({
  useTrackingHealth: () => ({ data: mocks.health, refetch: vi.fn() }),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ client: {} }) }))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: 'fixture', share_mode: 'live' },
      couple: { timezone: 'Asia/Kolkata' },
    },
  }),
}))
import TrackingPage from './TrackingPage'
function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <TrackingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
afterEach(() => {
  vi.clearAllMocks()
  Object.assign(mocks.health, {
    location: false,
    background: false,
    notifications: false,
    battery: false,
  })
})
test('native onboarding requests each permission only after explicit consent and a tap', async () => {
  setup()
  const user = userEvent.setup()
  expect(mocks.requestLocation).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Allow location' })).toBeDisabled()
  await user.click(screen.getByRole('checkbox'))
  expect(screen.getByRole('button', { name: 'Allow location' })).toBeEnabled()
  expect(
    screen.getByRole('button', { name: 'Open location settings' }),
  ).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Allow location' }))
  expect(mocks.requestLocation).toHaveBeenCalledTimes(1)
  expect(mocks.requestBackground).not.toHaveBeenCalled()
  expect(mocks.start).not.toHaveBeenCalled()
})
test('native tracking starts only with all prerequisites and explicit consent', async () => {
  Object.assign(mocks.health, {
    location: true,
    background: true,
    notifications: true,
    battery: true,
  })
  setup()
  const user = userEvent.setup()
  expect(
    screen.getByRole('button', { name: 'Start background sharing' }),
  ).toBeDisabled()
  await user.click(screen.getByRole('checkbox'))
  await user.click(
    screen.getByRole('button', { name: 'Start background sharing' }),
  )
  expect(mocks.start).toHaveBeenCalledTimes(1)
})
test('pause queues the native privacy change rather than sending location from the page', async () => {
  setup()
  await userEvent.click(screen.getByRole('button', { name: 'Pause sharing' }))
  expect(mocks.mode).toHaveBeenCalledWith({
    mode: 'paused',
    until: expect.any(String),
  })
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Your sharing change is queued',
  )
})

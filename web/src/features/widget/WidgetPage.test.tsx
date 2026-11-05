import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import WidgetPage from './WidgetPage'
const state = vi.hoisted(() => ({
  supported: true,
  owner: 'me',
  value: {
    kind: 'private',
    id: null,
    installed: 0,
    pinSupported: true,
    covered: false,
    checkedAt: 0,
  },
  status: vi.fn(),
  select: vi.fn(),
  pin: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('@/native/surface', () => ({
  get nativeSurfaceSupported() {
    return state.supported
  },
  surface: {
    widgetStatus: state.status,
    widgetSelect: state.select,
    widgetPin: state.pin,
    widgetRefresh: state.refresh,
  },
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: state.owner },
      couple: { id: 'couple', social_revision: 1 },
    },
  }),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: state.owner } }, client: {} }),
}))
vi.mock('@/hooks/usePrivateMedia', () => ({
  usePrivateMedia: () => ({ data: null }),
}))
vi.mock('@/features/memories/useMemories', () => ({
  useKeptMemories: () => ({
    data: {
      pages: [
        [
          {
            id: 'photo',
            kind: 'photo',
            body: 'A photo',
            archive_revision: 2,
            created_at: '2026-11-05T00:00:00Z',
          },
        ],
      ],
    },
  }),
}))
vi.mock('@/features/plans/usePlanning', () => ({
  usePlans: () => ({ data: [] }),
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
        <WidgetPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  state.supported = true
  state.owner = 'me'
  state.status.mockReset().mockImplementation(async () => state.value)
  state.select.mockReset()
  state.pin.mockReset()
  state.refresh.mockReset()
  state.value = {
    kind: 'private',
    id: null,
    installed: 0,
    pinSupported: true,
    covered: false,
    checkedAt: 0,
  }
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
test('a browser shows an honest private preview without native setup actions', () => {
  state.supported = false
  setup()
  expect(
    screen.getByText('Home-screen widgets are available in the Android app.'),
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Add widget' }),
  ).not.toBeInTheDocument()
  expect(state.status).not.toHaveBeenCalled()
})
test('showing a photo requires a concrete privacy confirmation and retains the choice on failure', async () => {
  state.select.mockRejectedValue(new Error('Offline'))
  setup()
  await screen.findByRole('button', { name: 'Photo' })
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Photo' }))
  await user.click(screen.getByRole('button', { name: 'A photo' }))
  expect(state.select).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'Your launcher can keep a preview outside Orbit',
  )
  await user.click(screen.getByRole('button', { name: 'Use photo' }))
  await waitFor(() =>
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Couldn’t update the widget',
    ),
  )
  expect(state.select).toHaveBeenCalledWith({
    owner: 'me',
    couple: 'couple',
    kind: 'photo',
    id: 'photo',
    version: 2,
  })
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
test('private mode clears through the same account-bound bridge and pin request is not treated as installation', async () => {
  state.select.mockResolvedValue(state.value)
  state.pin.mockResolvedValue({ requested: true })
  setup()
  await screen.findByRole('button', { name: 'Private' })
  await userEvent.click(screen.getByRole('button', { name: 'Private' }))
  expect(state.select).toHaveBeenCalledWith({
    owner: 'me',
    couple: 'couple',
    kind: 'private',
  })
  await userEvent.click(screen.getByRole('button', { name: 'Add widget' }))
  await screen.findByText('Confirm with your launcher.')
  expect(
    screen.getByText('Your launcher will ask before adding it.'),
  ).toBeVisible()
})
test('privacy-covered choices never render a photo preview', async () => {
  state.value = { ...state.value, covered: true }
  setup()
  expect(
    await screen.findByText(
      'Orbit lock or screenshot protection keeps your widget covered.',
    ),
  ).toBeVisible()
  expect(
    screen.getByRole('img', { name: 'Private Orbit widget' }),
  ).toBeVisible()
})
test('switching accounts closes a prior-account photo consent sheet', async () => {
  const view = setup()
  await screen.findByRole('button', { name: 'Photo' })
  await userEvent.click(screen.getByRole('button', { name: 'Photo' }))
  await userEvent.click(screen.getByRole('button', { name: 'A photo' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  state.owner = 'other'
  view.rerender(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <WidgetPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  expect(state.select).not.toHaveBeenCalled()
})

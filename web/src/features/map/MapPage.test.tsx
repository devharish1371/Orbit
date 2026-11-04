import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { FlowProvider } from '@/app/FlowProvider'
import { dismissBackLayer } from '@/app/backLayers'
import type { Database } from '@/lib/database.types'
import type { TrailFix } from '@/lib/journeys'
import MapPage from './MapPage'
type Member = Database['public']['Tables']['members']['Row']
const api = vi.hoisted(() => ({
  mode: 'live',
  epoch: 1,
  fuzzed: false,
  from: vi.fn(),
  now: Date.parse('2026-11-04T12:00:00Z'),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ client: { from: api.from } }),
}))
vi.mock('@/hooks/useNow', () => ({ useNow: () => api.now }))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => {} }))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: {
        user_id: 'self',
        display_name: 'You',
        share_mode: 'live',
        location_epoch: 1,
      } as Member,
      partner: {
        user_id: 'partner',
        display_name: 'Partner',
        share_mode: api.mode,
        location_epoch: api.epoch,
      } as Member,
      couple: { id: 'couple', timezone: 'Asia/Kolkata' },
    },
  }),
}))
vi.mock('@/features/location/LocationContext', () => ({
  useLocationSharing: () => ({ enabled: false }),
}))
vi.mock('@/native/tracker', () => ({ nativeTracking: false }))
vi.mock('./LiveContext', () => ({
  useLiveData: () => ({
    connection: 'live',
    locations: {
      data: [
        {
          user_id: 'partner',
          lat: 13,
          lng: 80,
          fuzzed: api.fuzzed,
          recorded_at: new Date(api.now).toISOString(),
          battery_pct: 80,
          speed_mps: 0,
          accuracy_m: 10,
        },
      ],
    },
    places: {
      data: [{ id: 'cafe', name: 'Café', emoji: '☕', lat: 13, lng: 80 }],
    },
  }),
}))
vi.mock('@/components/ui/Avatar', () => ({ Avatar: () => <span /> }))
vi.mock('./LocationRefresh', () => ({
  LocationRefresh: () => <button>Refresh</button>,
}))
vi.mock('./MapCanvas', () => ({
  default: (props: {
    people: unknown[]
    trail: unknown[]
    sample?: TrailFix
  }) => (
    <div role="region" aria-label="Rendered map">
      <output aria-label="Visible people">{props.people.length}</output>
      <output aria-label="Trail samples">{props.trail.length}</output>
      {props.sample && (
        <time aria-label="Historical cursor">{props.sample.recorded_at}</time>
      )}
    </div>
  ),
}))
const points = Array.from({ length: 6 }, (_, i) => ({
  lat: 13 + i * 0.001,
  lng: 80,
  accuracy_m: 10,
  speed_mps: 1.4,
  recorded_at: new Date(api.now - 3600_000 + i * 60_000).toISOString(),
}))
function Profile() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>Return to map</button>
}
function setup() {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  query.setQueryData(['journeys', 'partner', 1], {
    fixes: points,
    partial: false,
  })
  const element = () => (
    <QueryClientProvider client={query}>
      <FlowProvider>
        <MemoryRouter initialEntries={['/map']}>
          <Routes>
            <Route
              path="/map"
              element={
                <>
                  <Link to="/person/partner">Open profile</Link>
                  <MapPage />
                </>
              }
            />
            <Route path="/person/:id" element={<Profile />} />
          </Routes>
        </MemoryRouter>
      </FlowProvider>
    </QueryClientProvider>
  )
  return { ...render(element()), element }
}
beforeEach(() => {
  api.mode = 'live'
  api.epoch = 1
  api.fuzzed = false
  api.from.mockClear()
})
test('recorded sample selection survives profile navigation; Back clears the journey before collapsing details', async () => {
  setup()
  await userEvent.click(screen.getByRole('button', { name: '24 hours' }))
  await userEvent.click(screen.getByRole('button', { name: /Walk/ }))
  expect(screen.getByLabelText('Trail samples')).toHaveTextContent('6')
  await userEvent.click(
    screen.getByRole('button', { name: 'Next recorded location' }),
  )
  expect(screen.getByLabelText('Historical cursor')).toHaveTextContent(
    points[1]!.recorded_at,
  )
  await userEvent.click(screen.getByRole('link', { name: 'Open profile' }))
  await userEvent.click(screen.getByRole('button', { name: 'Return to map' }))
  expect(screen.getByLabelText('Historical cursor')).toHaveTextContent(
    points[1]!.recorded_at,
  )
  expect(screen.getByRole('slider')).toHaveValue('1')
  await act(async () => {
    expect(dismissBackLayer()).toBe(true)
  })
  expect(screen.queryByLabelText('Historical cursor')).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Collapse map details' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await act(async () => {
    expect(dismissBackLayer()).toBe(true)
  })
  expect(
    screen.getByRole('button', { name: 'Expand map details' }),
  ).toHaveFocus()
})
test.each(['surprise', 'paused'])(
  '%s removes precise cached markers, history and directions without reading new history',
  async (mode) => {
    const view = setup()
    await userEvent.click(screen.getByRole('button', { name: '24 hours' }))
    await userEvent.click(screen.getByRole('button', { name: /Walk/ }))
    expect(screen.getByLabelText('Visible people')).toHaveTextContent('1')
    api.mode = mode
    api.epoch = 2
    view.rerender(view.element())
    expect(screen.getByLabelText('Visible people')).toHaveTextContent('0')
    expect(screen.getByLabelText('Trail samples')).toHaveTextContent('0')
    expect(screen.queryByLabelText('Historical cursor')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        `History hidden in ${mode === 'paused' ? 'Pause' : 'Surprise'} mode`,
      ),
    ).toBeVisible()
    expect(api.from).not.toHaveBeenCalled()
  },
)
test('saved-place selection opens details with explicit external navigation, and Back returns to the list', async () => {
  setup()
  await userEvent.click(screen.getByRole('button', { name: 'Places' }))
  await userEvent.click(screen.getByRole('button', { name: /Café/ }))
  expect(
    screen.getByRole('link', { name: 'Navigate to Café' }),
  ).toHaveAttribute(
    'href',
    'https://www.google.com/maps/dir/?api=1&destination=13.000000,80.000000',
  )
  expect(
    screen.getByRole('link', { name: 'Navigate to Café' }),
  ).toHaveAttribute('rel', 'noopener noreferrer')
  await act(async () => {
    expect(dismissBackLayer()).toBe(true)
  })
  expect(
    screen.queryByRole('link', { name: 'Navigate to Café' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Places' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

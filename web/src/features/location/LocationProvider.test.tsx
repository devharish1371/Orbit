import { act, render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { LocationProvider } from './LocationProvider'
import { useLocationSharing } from './LocationContext'
const api = vi.hoisted(() => ({
  upsert: vi.fn().mockResolvedValue({ error: null }),
  insert: vi.fn().mockResolvedValue({ error: null }),
}))
const auth = vi.hoisted(() => ({ client: { from: () => api } }))
const refreshRequests = vi.hoisted(() => ({
  data: [] as {
    user_id: string
    location_epoch: number
    requested_at: string
    expires_at: string
  }[],
}))
vi.mock('@/features/map/LiveContext', () => ({
  useLiveData: () => ({ refreshRequests }),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: 'self', share_mode: 'live', location_epoch: 0 },
      couple: { id: 'space' },
    },
  }),
}))
function Controls() {
  const sharing = useLocationSharing()
  return (
    <>
      <button onClick={sharing.start}>Start</button>
      <button onClick={sharing.stop}>Stop</button>
      <p>{sharing.message}</p>
    </>
  )
}
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  api.upsert.mockClear()
  api.insert.mockClear()
  refreshRequests.data = []
})
test('a refresh never starts browser sharing without consent, and asks for an uncached fix after consent', async () => {
  refreshRequests.data = [
    {
      user_id: 'self',
      location_epoch: 0,
      requested_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 120_000).toISOString(),
    },
  ]
  const watch = vi.fn().mockReturnValue(15)
  vi.stubGlobal(
    'navigator',
    Object.assign(Object.create(navigator), {
      geolocation: { watchPosition: watch, clearWatch: vi.fn() },
    }),
  )
  render(
    <LocationProvider>
      <Controls />
    </LocationProvider>,
  )
  expect(watch).not.toHaveBeenCalled()
  await userEvent.click(screen.getByText('Start'))
  expect(watch).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    expect.objectContaining({ maximumAge: 0 }),
  )
})
test('web location starts only after consent and clears its watcher when hidden or stopped', async () => {
  let receive: PositionCallback | undefined
  const watch = vi.fn((callback: PositionCallback) => {
      receive = callback
      return 12
    }),
    clear = vi.fn()
  vi.stubGlobal(
    'navigator',
    Object.assign(Object.create(navigator), {
      geolocation: { watchPosition: watch, clearWatch: clear },
    }),
  )
  let hidden = false
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  render(
    <LocationProvider>
      <Controls />
    </LocationProvider>,
  )
  expect(watch).not.toHaveBeenCalled()
  await userEvent.click(screen.getByText('Start'))
  expect(watch).toHaveBeenCalledTimes(1)
  await act(async () => {
    receive?.({
      coords: {
        latitude: 13,
        longitude: 80,
        accuracy: 10,
        speed: 1,
        heading: 90,
      },
      timestamp: Date.now(),
    } as GeolocationPosition)
  })
  expect(api.upsert).toHaveBeenCalledTimes(1)
  expect(api.insert).toHaveBeenCalledTimes(1)
  act(() => {
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(clear).toHaveBeenCalledWith(12)
  await act(async () => {
    receive?.({
      coords: {
        latitude: 13.1,
        longitude: 80,
        accuracy: 10,
        speed: 1,
        heading: 90,
      },
      timestamp: Date.now(),
    } as GeolocationPosition)
  })
  expect(api.upsert).toHaveBeenCalledTimes(1)
  act(() => {
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(watch).toHaveBeenCalledTimes(2)
  await userEvent.click(screen.getByText('Stop'))
  expect(clear).toHaveBeenCalledTimes(2)
})

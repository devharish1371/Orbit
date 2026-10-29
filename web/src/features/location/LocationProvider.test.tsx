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
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: 'self', share_mode: 'live' },
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
  vi.restoreAllMocks()
  api.upsert.mockClear()
  api.insert.mockClear()
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
  vi.unstubAllGlobals()
})

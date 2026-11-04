import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import { MapCameraContext, type MapCameraMemory } from '@/app/FlowContext'
import type { TrailFix } from '@/lib/journeys'
import MapCanvas from './MapCanvas'
const api = vi.hoisted(() => ({
  fit: vi.fn(),
  pan: vi.fn(),
  remove: vi.fn(),
  resize: vi.fn(),
  host: null as HTMLElement | null,
}))
vi.mock('@/components/ui/Avatar', () => ({ Avatar: () => <span /> }))
vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(),
  NavigationControl: class {},
  AttributionControl: class {},
  LngLatBounds: class {
    extend() {
      return this
    }
  },
  Map: class {
    constructor(options: { container: HTMLElement }) {
      api.host = options.container
    }
    addControl() {}
    on(type: string, callback: () => void) {
      if (type === 'load') queueMicrotask(callback)
    }
    isStyleLoaded() {
      return true
    }
    getSource() {
      return { setData: vi.fn() }
    }
    fitBounds = api.fit
    panTo = api.pan
    remove = api.remove
    resize = api.resize
    getCenter() {
      return { lng: 80, lat: 13 }
    }
    getZoom() {
      return 12
    }
    getBearing() {
      return 18
    }
    getPitch() {
      return 0
    }
  },
  Marker: class {
    node: HTMLElement
    constructor({ element }: { element: HTMLElement }) {
      this.node = element
    }
    setLngLat() {
      return this
    }
    addTo() {
      api.host?.append(this.node)
      return this
    }
    remove() {
      this.node.remove()
    }
  },
}))
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(() => vi.unstubAllGlobals())
const sample: TrailFix = {
  lat: 13,
  lng: 80,
  accuracy_m: 10,
  speed_mps: 1,
  recorded_at: '2026-11-04T12:00:00Z',
}
const props = {
  dark: false,
  people: [],
  places: [],
  trail: [],
  fit: 0,
  adding: false,
  onPick: vi.fn(),
  onPerson: vi.fn(),
  onRetry: vi.fn(),
}
test('historical cursor is removed when authorization disappears; scrubbing pans without changing zoom', async () => {
  const camera: { current: MapCameraMemory | null } = { current: null }
  const element = (shown?: TrailFix) => (
    <MapCameraContext.Provider value={camera}>
      <MapCanvas
        {...props}
        sample={shown}
        focus={{ points: [sample], key: 1, sample: true }}
      />
    </MapCameraContext.Provider>
  )
  const view = render(element(sample))
  expect(
    await screen.findByRole('img', { name: /Recorded location at/ }),
  ).toBeVisible()
  expect(api.pan).toHaveBeenCalledWith([80, 13], { duration: 0 })
  expect(api.fit).not.toHaveBeenCalled()
  view.rerender(element())
  expect(
    screen.queryByRole('img', { name: /Recorded location at/ }),
  ).not.toBeInTheDocument()
  view.unmount()
  expect(camera.current).toEqual({
    center: [80, 13],
    zoom: 12,
    bearing: 18,
    pitch: 0,
  })
  expect(api.remove).toHaveBeenCalledTimes(1)
})
test('a route selected before renderer load is fitted once without an animation under reduced motion', async () => {
  render(
    <MapCanvas
      {...props}
      focus={{ points: [sample, { lat: 13.1, lng: 80.1 }], key: 1 }}
    />,
  )
  await waitFor(() => expect(api.fit).toHaveBeenCalledTimes(1))
  expect(api.fit).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ maxZoom: 15, duration: 0 }),
  )
})

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { Map } from 'maplibre-gl'
import { PersonMarker } from './MapCanvas'
import type { Database } from '@/lib/database.types'
const fixture = vi.hoisted(() => ({ host: null as HTMLElement | null }))
afterEach(() => {
  fixture.host?.remove()
  vi.unstubAllGlobals()
})
vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(),
  Map: vi.fn(),
  NavigationControl: vi.fn(),
  AttributionControl: vi.fn(),
  LngLatBounds: vi.fn(),
  Marker: class {
    node: HTMLElement
    point = { lat: 13, lng: 80 }
    constructor(options: { element: HTMLElement }) {
      this.node = options.element
    }
    setLngLat(point: number[]) {
      this.point = { lng: point[0]!, lat: point[1]! }
      return this
    }
    getLngLat() {
      return this.point
    }
    addTo() {
      fixture.host!.append(this.node)
      return this
    }
    remove() {
      this.node.remove()
    }
  },
}))
test('a portrait click selects the person without bubbling into the map POI handler', () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true })),
  )
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 0),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  fixture.host = document.createElement('div')
  document.body.append(fixture.host)
  const tileClick = vi.fn(),
    select = vi.fn()
  fixture.host.addEventListener('click', tileClick)
  const member = {
    user_id: 'self',
    display_name: 'You',
    color: '#ff6b8a',
    avatar_path: null,
  } as Database['public']['Tables']['members']['Row']
  const location = {
    lat: 13,
    lng: 80,
    battery_pct: 85,
    charging: false,
    heading: null,
    fuzzed: false,
  } as Database['public']['Tables']['live_location']['Row']
  const view = render(
    <PersonMarker
      map={{} as Map}
      member={member}
      location={location}
      onSelect={select}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'You · 85%' }))
  expect(select).toHaveBeenCalledTimes(1)
  expect(tileClick).not.toHaveBeenCalled()
  view.unmount()
  expect(fixture.host.children).toHaveLength(0)
  fixture.host.remove()
})

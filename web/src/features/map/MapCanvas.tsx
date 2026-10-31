import { MapCameraContext } from '@/app/FlowContext'
import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Map,
  Marker,
  NavigationControl,
  AttributionControl,
  LngLatBounds,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Avatar } from '@/components/ui/Avatar'
import { copy } from '@/copy/en'
import { couple } from '@/config/couple.config'
import { circle, interpolate, type Point } from '@/lib/geo'
import type { Database } from '@/lib/database.types'
setWorkerUrl(workerUrl)
type Member = Database['public']['Tables']['members']['Row']
type Location = Database['public']['Tables']['live_location']['Row']
type Place = Database['public']['Tables']['places']['Row']
function PersonMarker({
  map,
  member,
  location,
  onSelect,
}: {
  map: Map
  member: Member
  location: Location
  onSelect: () => void
}) {
  const [element] = useState(() => document.createElement('button'))
  const marker = useRef<Marker | null>(null)
  const select = useRef(onSelect)
  useEffect(() => {
    select.current = onSelect
  }, [onSelect])
  useEffect(() => {
    element.setAttribute('type', 'button')
    element.setAttribute('class', 'person-map-marker')
    element.setAttribute('aria-label', member.nickname || member.display_name)
    const click = () => select.current()
    element.addEventListener('click', click)
    const instance = new Marker({ element, anchor: 'center' })
      .setLngLat([location.lng, location.lat])
      .addTo(map)
    marker.current = instance
    return () => {
      element.removeEventListener('click', click)
      instance.remove()
      marker.current = null
    }
    // Coordinates update in the animation effect rather than recreating the marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, element, member.user_id, member.nickname, member.display_name])
  useEffect(() => {
    const instance = marker.current
    if (!instance) return
    const start = instance.getLngLat(),
      target = { lat: location.lat, lng: location.lng },
      began = performance.now()
    let frame = 0
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const tick = (now: number) => {
      const progress = reduced ? 1 : Math.min(1, (now - began) / 900)
      const p = interpolate(
        start,
        target,
        progress * progress * (3 - 2 * progress),
      )
      instance.setLngLat([p.lng, p.lat])
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [location.lat, location.lng])
  const battery = location.battery_pct
  useEffect(() => {
    element.setAttribute(
      'aria-label',
      `${member.nickname || member.display_name} · ${battery === null ? copy.map.batteryUnknown : `${battery}%`}${location.charging ? ' ϟ' : ''}`,
    )
  }, [
    element,
    member.nickname,
    member.display_name,
    battery,
    location.charging,
  ])
  return createPortal(
    <span
      className="map-marker-inner"
      aria-hidden="true"
      style={
        {
          '--battery': `${battery ?? 0}%`,
          '--person-color': member.color,
        } as React.CSSProperties
      }
    >
      <Avatar
        name={member.display_name}
        color={member.color}
        path={member.avatar_path}
      />
      {location.heading !== null && !location.fuzzed && (
        <i
          className="heading-tip"
          style={{ rotate: `${location.heading}deg` }}
          aria-hidden="true"
        />
      )}
      <span className="marker-battery">
        {battery === null ? '—' : `${battery}%`}
        {location.charging ? 'ϟ' : ''}
      </span>
    </span>,
    element,
  )
}
export default function MapCanvas({
  dark,
  people,
  places,
  trail,
  fit,
  adding,
  onPick,
  onPerson,
  onRetry,
}: {
  dark: boolean
  people: { member: Member; location: Location }[]
  places: Place[]
  trail: Point[]
  fit: number
  adding: boolean
  onPick: (p: Point) => void
  onPerson: (id: string) => void
  onRetry: () => void
}) {
  const cameraRef = useContext(MapCameraContext)
  const initiallyFitRef = useRef(false)
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<Map | null>(null)
  const [failed, setFailed] = useState(false)
  const pick = useRef(onPick),
    addingRef = useRef(adding)
  useEffect(() => {
    pick.current = onPick
    addingRef.current = adding
  }, [onPick, adding])
  useEffect(() => {
    if (!container.current) return
    let instance: Map
    try {
      instance = new Map({
        container: container.current,
        style: dark ? couple.mapStyleDarkUrl : couple.mapStyleUrl,
        center: cameraRef?.current?.center ?? [78, 22],
        zoom: cameraRef?.current?.zoom ?? 3.5,
        bearing: cameraRef?.current?.bearing ?? 0,
        pitch: cameraRef?.current?.pitch ?? 0,
        attributionControl: false,
        renderWorldCopies: false,
        maxZoom: 18,
        canvasContextAttributes: { antialias: false },
      })
      if (cameraRef?.current) initiallyFitRef.current = true
      instance.addControl(
        new AttributionControl({ compact: true }),
        'bottom-right',
      )
      instance.addControl(
        new NavigationControl({ showCompass: false }),
        'top-right',
      )
      instance.on('load', () => setMap(instance))
      instance.on('error', () => setFailed(true))
      instance.on('click', (event) => {
        if (addingRef.current)
          pick.current({ lat: event.lngLat.lat, lng: event.lngLat.lng })
      })
      const observer = new ResizeObserver(() => instance.resize())
      observer.observe(container.current)
      return () => {
        observer.disconnect()
        if (cameraRef && initiallyFitRef.current) {
          const center = instance.getCenter()
          cameraRef.current = {
            center: [center.lng, center.lat],
            zoom: instance.getZoom(),
            bearing: instance.getBearing(),
            pitch: instance.getPitch(),
          }
        }
        instance.remove()
      }
    } catch {
      queueMicrotask(() => setFailed(true))
    }
  }, [dark, cameraRef])
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return
    const polygons = {
      type: 'FeatureCollection' as const,
      features: [
        ...places.map((p) => ({
          type: 'Feature' as const,
          properties: { color: '#7C5CFF' },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [circle(p, p.radius_m)],
          },
        })),
        ...people.map(({ location, member }) => ({
          type: 'Feature' as const,
          properties: { color: member.color },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              circle(
                location,
                Math.min(5000, Math.max(5, location.accuracy_m ?? 5)),
              ),
            ],
          },
        })),
      ],
    }
    const source = map.getSource('orbit-areas') as GeoJSONSource | undefined
    if (source) source.setData(polygons)
    else {
      map.addSource('orbit-areas', { type: 'geojson', data: polygons })
      map.addLayer({
        id: 'orbit-areas-fill',
        type: 'fill',
        source: 'orbit-areas',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.13 },
      })
      map.addLayer({
        id: 'orbit-areas-line',
        type: 'line',
        source: 'orbit-areas',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-opacity': 0.6,
        },
      })
    }
    const line = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: trail.map((p) => [p.lng, p.lat]),
      },
    }
    const trailSource = map.getSource('orbit-trail') as
      GeoJSONSource | undefined
    if (trailSource) trailSource.setData(line)
    else {
      map.addSource('orbit-trail', { type: 'geojson', data: line })
      map.addLayer({
        id: 'orbit-trail-line',
        type: 'line',
        source: 'orbit-trail',
        paint: {
          'line-color': '#A98EFF',
          'line-width': 3,
          'line-opacity': 0.8,
        },
      })
    }
  }, [map, people, places, trail])
  const points = useRef<Point[]>([])
  useEffect(() => {
    points.current = people.map((p) => p.location)
  }, [people])
  useEffect(() => {
    if (!map || initiallyFitRef.current || !people.length) return
    initiallyFitRef.current = true
    const bounds = new LngLatBounds()
    people.forEach(({ location }) =>
      bounds.extend([location.lng, location.lat]),
    )
    map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 0 })
  }, [map, people])
  useEffect(() => {
    if (!map || !fit || !points.current.length) return
    const bounds = new LngLatBounds()
    points.current.forEach((p) => bounds.extend([p.lng, p.lat]))
    map.fitBounds(bounds, {
      padding: 70,
      maxZoom: 14,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 600,
    })
  }, [fit, map])
  useEffect(() => {
    if (!map) return
    const markers = places.map((place) => {
      const node = document.createElement('span')
      node.className = 'place-map-marker'
      node.textContent = place.emoji
      node.title = place.name
      return new Marker({ element: node })
        .setLngLat([place.lng, place.lat])
        .addTo(map)
    })
    return () => markers.forEach((marker) => marker.remove())
  }, [map, places])
  return (
    <div className={`map-stage ${adding ? 'is-adding' : ''}`}>
      <div
        ref={container}
        className="map-canvas"
        role="region"
        aria-label={copy.map.canvas}
      />
      {failed && (
        <p className="map-error" role="status">
          {copy.map.mapFailed}
          <button className="text-button" onClick={onRetry}>
            {copy.map.retry}
          </button>
        </p>
      )}
      {map && adding && (
        <button
          className="button map-center-button"
          onClick={() => {
            const center = map.getCenter()
            onPick({ lat: center.lat, lng: center.lng })
          }}
        >
          {copy.map.useCenter}
        </button>
      )}
      {map &&
        people.map(({ member, location }) => (
          <PersonMarker
            key={member.user_id}
            map={map}
            member={member}
            location={location}
            onSelect={() => onPerson(member.user_id)}
          />
        ))}
    </div>
  )
}

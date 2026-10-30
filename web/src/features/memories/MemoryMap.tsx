import { useEffect, useRef, useState } from 'react'
import {
  Map,
  Marker,
  LngLatBounds,
  NavigationControl,
  AttributionControl,
  setWorkerUrl,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { couple } from '@/config/couple.config'
import { type Post } from '@/lib/posts'
setWorkerUrl(workerUrl)
export default function MemoryMap({
  posts,
  dark,
  onSelect,
}: {
  posts: Post[]
  dark: boolean
  onSelect: (id: string) => void
}) {
  const container = useRef<HTMLDivElement>(null),
    select = useRef(onSelect)
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0)
  useEffect(() => {
    select.current = onSelect
  }, [onSelect])
  useEffect(() => {
    if (!container.current) return
    const map = new Map({
      container: container.current,
      style: dark ? couple.mapStyleDarkUrl : couple.mapStyleUrl,
      center: [78, 22],
      zoom: 3.5,
      attributionControl: false,
      renderWorldCopies: false,
    })
    map.addControl(new AttributionControl({ compact: true }))
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    const markers: Marker[] = []
    map.on('error', () => setFailed(true))
    map.on('load', () => {
      const bounds = new LngLatBounds()
      posts.forEach((post, index) => {
        if (post.lat === null || post.lng === null) return
        const node = document.createElement('button')
        node.type = 'button'
        node.className = 'memory-map-pin'
        node.textContent = '✦'
        node.setAttribute('aria-label', `Open kept memory ${index + 1}`)
        node.addEventListener('click', () => select.current(post.id))
        markers.push(
          new Marker({ element: node })
            .setLngLat([post.lng, post.lat])
            .addTo(map),
        )
        bounds.extend([post.lng, post.lat])
      })
      if (!bounds.isEmpty())
        map.fitBounds(bounds, { padding: 65, maxZoom: 13, duration: 0 })
    })
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      markers.forEach((marker) => marker.remove())
      map.remove()
    }
  }, [posts, dark, retry])
  return (
    <div className="memory-map-stage">
      <div
        ref={container}
        className="map-canvas"
        role="region"
        aria-label="Places in our kept memories"
      />
      {failed && (
        <button
          className="map-error"
          onClick={() => {
            setFailed(false)
            setRetry(retry + 1)
          }}
        >
          The map couldn’t load. Retry
        </button>
      )}
    </div>
  )
}

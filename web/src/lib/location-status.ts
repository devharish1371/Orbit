import { validPoint, type Point } from './geo'
export function locationStatus(
  mode: string,
  at: string | null | undefined,
  now: number,
) {
  if (mode === 'paused') return { label: 'Sharing paused', state: 'paused' }
  if (mode === 'surprise')
    return { label: 'Surprise mode · approximate area', state: 'approximate' }
  const time = at ? Date.parse(at) : NaN
  if (!Number.isFinite(time))
    return { label: 'Waiting for a location', state: 'waiting' }
  const age = Math.max(0, now - time)
  const minutes = Math.floor(age / 60000)
  const label =
    age < 60000
      ? 'Updated just now'
      : minutes < 60
        ? `Updated ${minutes} min ago`
        : `Updated ${Math.floor(minutes / 60)} h ago`
  return { label, state: age > 300000 ? 'old' : 'recent' }
}
export function directionsTo(
  point: Point,
  mode: string,
  fuzzed: boolean,
  at: string,
  now: number,
): string | null {
  const age = now - Date.parse(at)
  if (
    mode !== 'live' ||
    fuzzed ||
    !validPoint(point) ||
    !Number.isFinite(age) ||
    age < -60000 ||
    age > 300000
  )
    return null
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat.toFixed(6)},${point.lng.toFixed(6)}`
}

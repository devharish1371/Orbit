export interface Point {
  lat: number
  lng: number
}
const radians = (value: number) => (value * Math.PI) / 180
export function distance(a: Point, b: Point): number {
  const dlat = radians(b.lat - a.lat),
    dlng = radians(b.lng - a.lng)
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(dlng / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)))
}
export function midpoint(a: Point, b: Point): Point {
  const lat1 = radians(a.lat),
    lat2 = radians(b.lat),
    delta = radians(b.lng - a.lng)
  const x = Math.cos(lat2) * Math.cos(delta),
    y = Math.cos(lat2) * Math.sin(delta)
  return {
    lat:
      (Math.atan2(
        Math.sin(lat1) + Math.sin(lat2),
        Math.sqrt((Math.cos(lat1) + x) ** 2 + y ** 2),
      ) *
        180) /
      Math.PI,
    lng:
      ((a.lng + (Math.atan2(y, Math.cos(lat1) + x) * 180) / Math.PI + 540) %
        360) -
      180,
  }
}
export function middleUrl(a: Point, b: Point): string {
  const p = midpoint(a, b)
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
}
export function distanceLabel(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters / 10) * 10} m`
    : `${(meters / 1000).toFixed(1)} km`
}
export function circle(point: Point, radius: number): [number, number][] {
  return Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2
    return [
      point.lng +
        (Math.sin(angle) * radius) /
          (111_320 * Math.max(0.01, Math.cos(radians(point.lat)))),
      point.lat + (Math.cos(angle) * radius) / 111_320,
    ]
  })
}
export function blur(point: Point): Point {
  // A fixed global ~2km grid; repeated fixes in one cell never reveal extra precision.
  return {
    lat: (Math.floor(point.lat / 0.018) + 0.5) * 0.018,
    lng: (Math.floor(point.lng / 0.018) + 0.5) * 0.018,
  }
}
export function validPoint(point: Point): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  )
}
export function interpolate(a: Point, b: Point, t: number): Point {
  const delta = ((b.lng - a.lng + 540) % 360) - 180
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: ((a.lng + delta * t + 540) % 360) - 180,
  }
}

import { distance, validPoint, type Point } from './geo'
export interface TrailFix extends Point {
  recorded_at: string
  accuracy_m: number | null
  speed_mps: number | null
}
export interface Journey {
  id: string
  points: TrailFix[]
  metres: number
  seconds: number
  mode: 'walk' | 'drive' | 'journey'
  state: 'moving' | 'finished' | 'gap'
  started: string
  ended: string
}
/** Cursor identity is a recorded timestamp; refreshes never turn it into an invented fix. */
export function selectedSample(
  journey: Journey | undefined,
  at: string | null,
) {
  return (
    journey?.points.find((p) => p.recorded_at === at) ?? journey?.points.at(-1)
  )
}
/** Conservative GPS-only estimates. Gaps never become fictitious straight-line trips. */
export function journeysFromFixes(input: TrailFix[], now: number): Journey[] {
  const fixes = [
    ...new Map(
      input
        .filter(
          (p) =>
            validPoint(p) &&
            p.accuracy_m !== null &&
            p.accuracy_m >= 0 &&
            p.accuracy_m <= 100 &&
            Date.parse(p.recorded_at) > now - 86400_000 &&
            Date.parse(p.recorded_at) <= now + 10_000,
        )
        .sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at))
        .map((p) => [p.recorded_at, p]),
    ).values(),
  ]
  const result: Journey[] = []
  let points: TrailFix[] = [],
    lastMoving = 0
  function finish(state: Journey['state']) {
    const track = points.slice(0, lastMoving + 1)
    const first = track[0],
      last = track.at(-1)
    if (!first || !last || track.length < 3) return
    let metres = 0
    for (let i = 1; i < track.length; i++)
      metres += distance(track[i - 1]!, track[i]!)
    const seconds =
      (Date.parse(last.recorded_at) - Date.parse(first.recorded_at)) / 1000
    if (metres < 120 || seconds < 60) return
    const speeds = track
      .map((p) => p.speed_mps)
      .filter((v): v is number => v !== null && v >= 0.5 && v <= 70)
      .sort((a, b) => a - b)
    const median =
      speeds.length >= 3 ? speeds[Math.floor(speeds.length / 2)]! : null
    const average = metres / seconds
    const mode =
      median !== null && median >= 5 && average >= 3
        ? 'drive'
        : median !== null && median <= 2.5 && average <= 2.8
          ? 'walk'
          : 'journey'
    result.push({
      id: first.recorded_at,
      points: track,
      metres,
      seconds,
      mode,
      state,
      started: first.recorded_at,
      ended: last.recorded_at,
    })
  }
  for (const fix of fixes) {
    const previous = points.at(-1)
    if (!previous) {
      points = [fix]
      lastMoving = 0
      continue
    }
    const elapsed =
      (Date.parse(fix.recorded_at) - Date.parse(previous.recorded_at)) / 1000
    const step = distance(previous, fix)
    if (elapsed > 600 || step / elapsed > 70) {
      finish('gap')
      points = [fix]
      lastMoving = 0
      continue
    }
    const anchor = points[lastMoving]!
    const moved =
      distance(anchor, fix) >
        Math.max(45, anchor.accuracy_m! + fix.accuracy_m!) ||
      ((fix.speed_mps ?? 0) >= 0.8 && step > Math.max(15, fix.accuracy_m!))
    points.push(fix)
    if (moved) lastMoving = points.length - 1
    else if (
      Date.parse(fix.recorded_at) - Date.parse(anchor.recorded_at) >=
      300_000
    ) {
      finish('finished')
      points = [fix]
      lastMoving = 0
    }
  }
  finish(
    points.at(-1) && now - Date.parse(points.at(-1)!.recorded_at) < 180_000
      ? 'moving'
      : 'gap',
  )
  return result.reverse()
}
export function journeyPath(points: Point[]): string {
  if (!points.length) return ''
  const lngs = points.map((p) => p.lng),
    lats = points.map((p) => p.lat),
    x = Math.min(...lngs),
    y = Math.min(...lats),
    dx = Math.max(...lngs) - x,
    dy = Math.max(...lats) - y
  const scale = 88 / Math.max(dx, dy, 0.0001)
  return points
    .map(
      (p, i) =>
        `${i ? 'L' : 'M'}${(6 + (p.lng - x) * scale).toFixed(1)},${(94 - (p.lat - y) * scale).toFixed(1)}`,
    )
    .join(' ')
}

import { expect, test } from 'vitest'
import { journeysFromFixes, journeyPath, type TrailFix } from './journeys'
const now = Date.parse('2026-11-03T12:00:00Z')
const fix = (
  minute: number,
  lat: number,
  speed: number | null = 1.4,
  accuracy = 10,
): TrailFix => ({
  lat,
  lng: 80.2,
  speed_mps: speed,
  accuracy_m: accuracy,
  recorded_at: new Date(now - 3600_000 + minute * 60_000).toISOString(),
})
test('walking and vehicle travel are estimated from multiple reliable moving fixes', () => {
  const walking = Array.from({ length: 11 }, (_, i) => fix(i, 13 + i * 0.00075))
  const driving = Array.from({ length: 11 }, (_, i) =>
    fix(i, 13 + i * 0.0054, 10),
  )
  expect(journeysFromFixes(walking, now)[0]).toMatchObject({
    mode: 'walk',
    state: 'gap',
    seconds: 600,
  })
  expect(journeysFromFixes(driving, now)[0]?.mode).toBe('drive')
  expect(
    journeysFromFixes(
      walking.map((p) => ({ ...p, speed_mps: null })),
      now,
    )[0]?.mode,
  ).toBe('journey')
})
test('confirmed dwell finishes a journey, and gaps never join disconnected tracks', () => {
  const moving = Array.from({ length: 6 }, (_, i) => fix(i, 13 + i * 0.001))
  expect(
    journeysFromFixes([...moving, fix(10, 13.005, 0)], now)[0]?.state,
  ).toBe('finished')
  const two = [
    ...moving,
    ...Array.from({ length: 6 }, (_, i) => fix(i + 25, 14 + i * 0.001)),
  ]
  const trips = journeysFromFixes(two, now)
  expect(trips).toHaveLength(2)
  expect(trips.every((t) => t.metres < 1000)).toBe(true)
})
test('jitter, poor fixes, future fixes and impossible jumps do not invent journeys', () => {
  const jitter = Array.from({ length: 20 }, (_, i) =>
    fix(i, 13 + (i % 2) * 0.00001, 0),
  )
  expect(journeysFromFixes(jitter, now)).toEqual([])
  expect(
    journeysFromFixes(
      Array.from({ length: 10 }, (_, i) => fix(i, 13 + i * 0.01, 10, 500)),
      now,
    ),
  ).toEqual([])
  expect(journeysFromFixes([fix(1, 13), fix(2, 40), fix(3, 70)], now)).toEqual(
    [],
  )
  expect(
    journeysFromFixes([fix(70, 13), fix(71, 13.1), fix(72, 13.2)], now),
  ).toEqual([])
  expect(journeyPath(jitter)).not.toMatch(/NaN|Infinity/)
})

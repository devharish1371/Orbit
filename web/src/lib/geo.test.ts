import { expect, test } from 'vitest'
import {
  blur,
  circle,
  distance,
  interpolate,
  midpoint,
  middleUrl,
  validPoint,
} from './geo'
test('distance and midpoint handle nearby points and the date line', () => {
  expect(distance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(
    111195,
    0,
  )
  expect(distance({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBe(0)
  expect(
    Math.abs(midpoint({ lat: 0, lng: 179 }, { lat: 0, lng: -179 }).lng),
  ).toBeCloseTo(180)
  expect(
    Math.abs(interpolate({ lat: 0, lng: 179 }, { lat: 0, lng: -179 }, 0.5).lng),
  ).toBeCloseTo(180)
  expect(middleUrl({ lat: 0, lng: 0 }, { lat: 0, lng: 2 })).toContain(
    'destination=0.000000,1.000000',
  )
})
test('privacy blur is deterministic, circles close, and invalid coordinates fail', () => {
  expect(blur({ lat: 13.01, lng: 80.01 })).toEqual(
    blur({ lat: 13.01001, lng: 80.01001 }),
  )
  const ring = circle({ lat: 13, lng: 80 }, 150)
  expect(ring[0]?.[1]).toBeCloseTo(ring[64]?.[1] ?? 0)
  expect(validPoint({ lat: NaN, lng: 0 })).toBe(false)
  expect(validPoint({ lat: 91, lng: 0 })).toBe(false)
})

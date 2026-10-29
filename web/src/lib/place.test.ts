import { expect, test } from 'vitest'
import { validPlace, type PlaceDraft } from './place'
const place: PlaceDraft = {
  lat: 13,
  lng: 80,
  name: 'Home',
  emoji: '🏠',
  radius_m: 150,
  notify_arrive: true,
  notify_leave: true,
}
test('places reject blank names, invalid coordinates and out-of-bounds radii', () => {
  expect(validPlace(place)).toBe(true)
  for (const values of [
    { name: ' ' },
    { name: 'x'.repeat(41) },
    { emoji: '' },
    { radius_m: 49 },
    { radius_m: 2001 },
    { radius_m: 50.5 },
    { lat: NaN },
  ])
    expect(validPlace({ ...place, ...values })).toBe(false)
})

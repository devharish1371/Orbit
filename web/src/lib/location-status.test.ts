import { describe, expect, it } from 'vitest'
import { directionsTo, locationStatus } from './location-status'
describe('location guidance', () => {
  const now = Date.parse('2026-11-01T10:00:00Z')
  it('distinguishes shared mode from the age of the last fix', () => {
    expect(
      locationStatus('paused', new Date(now).toISOString(), now).state,
    ).toBe('paused')
    expect(
      locationStatus('surprise', new Date(now).toISOString(), now).state,
    ).toBe('approximate')
    expect(locationStatus('live', null, now).state).toBe('waiting')
    expect(
      locationStatus('live', new Date(now - 360000).toISOString(), now),
    ).toEqual({ label: 'Updated 6 min ago', state: 'old' })
  })
  it('offers navigation only to a recent precise shared point', () => {
    const p = { lat: 13, lng: 80 },
      at = new Date(now).toISOString()
    expect(directionsTo(p, 'live', false, at, now)).toContain(
      'destination=13.000000,80.000000',
    )
    for (const [mode, fuzzed, time] of [
      ['paused', false, at],
      ['surprise', false, at],
      ['live', true, at],
      ['live', false, 'invalid'],
      ['live', false, new Date(now - 360000).toISOString()],
    ] as const)
      expect(directionsTo(p, mode, fuzzed, time, now)).toBeNull()
    expect(
      directionsTo({ lat: 100, lng: 80 }, 'live', false, at, now),
    ).toBeNull()
  })
})

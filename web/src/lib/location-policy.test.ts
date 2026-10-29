import { expect, test } from 'vitest'
import {
  shouldPublish,
  shouldRecord,
  validFix,
  type Fix,
} from './location-policy'
const now = 1_000_000
const fix: Fix = {
  lat: 13,
  lng: 80,
  accuracy: 10,
  speed: 1,
  heading: 90,
  timestamp: now,
}
test('location filtering rejects inaccurate, stale, future and duplicate fixes', () => {
  expect(validFix(fix, now)).toBe(true)
  expect(validFix({ ...fix, accuracy: 101 }, now)).toBe(false)
  expect(validFix({ ...fix, timestamp: now - 120001 }, now)).toBe(false)
  expect(validFix({ ...fix, timestamp: now + 11000 }, now)).toBe(false)
  expect(shouldPublish(fix, fix, now + 15000, now)).toBe(false)
})
test('moving publishes at most every 15 seconds, stationary at most every five minutes', () => {
  const last = { ...fix, timestamp: now - 20000 }
  expect(shouldPublish(fix, last, now, now - 14999)).toBe(false)
  expect(shouldPublish(fix, last, now, now - 15000)).toBe(true)
  expect(shouldPublish({ ...fix, speed: 0 }, last, now, now - 15000)).toBe(
    false,
  )
  expect(shouldPublish({ ...fix, speed: 0 }, last, now, now - 300000)).toBe(
    true,
  )
  expect(shouldRecord(fix, last)).toBe(false)
  expect(shouldRecord({ ...fix, lng: 80.001 }, last)).toBe(true)
})

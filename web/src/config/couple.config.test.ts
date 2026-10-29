import { expect, test } from 'vitest'
import {
  couple,
  validDate,
  validMeetUrl,
  validateConfig,
} from './couple.config'
import { anniversaryDays } from '@/lib/calendar'
import { callUrl, whatsappUrl } from '@/lib/connect'

test('configuration rejects invalid dates, meeting URLs, timezones and colors', () => {
  expect(validDate('2024-02-29')).toBe(true)
  expect(validDate('2025-02-29')).toBe(false)
  expect(validMeetUrl('https://meet.google.com/abc-defg-hij')).toBe(true)
  expect(validMeetUrl('javascript:alert(1)')).toBe(false)
  expect(() => validateConfig(couple)).not.toThrow()
  expect(() =>
    validateConfig({ ...couple, timezone: 'not-a-timezone' } as typeof couple),
  ).toThrow()
})
test('anniversary countdown respects India calendar day and year rollover', () => {
  expect(
    anniversaryDays(
      '2020-10-30',
      new Date('2026-10-29T20:00:00Z'),
      'Asia/Kolkata',
    ),
  ).toBe(0)
  expect(
    anniversaryDays(
      '2020-01-01',
      new Date('2026-12-31T20:00:00Z'),
      'Asia/Kolkata',
    ),
  ).toBe(0)
})
test('connection URLs validate phone numbers and never treat arbitrary strings as URLs', () => {
  expect(callUrl('+919876543210')).toBe('tel:+919876543210')
  expect(whatsappUrl('+919876543210')).toBe('https://wa.me/919876543210')
  expect(callUrl('javascript:alert(1)')).toBeNull()
})

import { expect, test, vi } from 'vitest'
import {
  zoneInput,
  zoneInstant,
  planCalendar,
  planConfirmed,
  drawIdea,
  type Plan,
  type Idea,
} from './plans'
const plan = {
  id: '11111111-1111-4111-8111-111111111111',
  version: 2,
  title: 'Dinner; together, soon',
  notes: 'Line one\r\nBEGIN:VEVENT\nA \\ B',
  venue: 'Chennai',
  starts_at: '2026-11-11T13:30:00Z',
  updated_at: '2026-11-04T10:00:00Z',
  cancelled: false,
  accepted_by: ['a', 'b'],
} as Plan
test('couple wall time is independent of device timezone, with explicit DST gap/overlap rejection', () => {
  expect(zoneInstant('2026-11-11T19:00', 'Asia/Kolkata')).toBe(
    '2026-11-11T13:30:00.000Z',
  )
  expect(zoneInput(plan.starts_at, 'Asia/Kolkata')).toBe('2026-11-11T19:00')
  expect(() => zoneInstant('2026-03-08T02:30', 'America/New_York')).toThrow()
  expect(() => zoneInstant('2026-11-01T01:30', 'America/New_York')).toThrow()
  expect(() => zoneInstant('2026-02-30T19:00', 'Asia/Kolkata')).toThrow()
})
test('calendar is UTC, stable/versioned, escaped and contains no alarm or invitation recipients', () => {
  const file = planCalendar(plan, true)
  expect(file).toContain('UID:' + plan.id + '@orbit.local\r\nSEQUENCE:2')
  expect(file).toContain('DTSTART:20261111T133000Z')
  expect(file).toContain('SUMMARY:Dinner\\; together\\, soon')
  expect(file.match(/\r\nBEGIN:VEVENT/g)).toHaveLength(1)
  expect(file).not.toMatch(/VALARM|ATTENDEE|ORGANIZER|METHOD:REQUEST/)
  expect(planCalendar({ ...plan, cancelled: true }, false)).toContain(
    'STATUS:CANCELLED',
  )
  expect(planCalendar(plan, false)).toContain('STATUS:TENTATIVE')
})
test('Unicode calendar lines stay within 75 octets and unfolding preserves content', () => {
  const file = planCalendar({ ...plan, title: '💛'.repeat(80) }, true)
  expect(
    file
      .split('\r\n')
      .every((line) => new TextEncoder().encode(line).length <= 75),
  ).toBe(true)
  expect(file.replace(/\r\n /g, '')).toContain('SUMMARY:' + '💛'.repeat(80))
})
test('both current members must confirm and the jar only picks active authored ideas', () => {
  expect(planConfirmed(plan, ['a', 'b'])).toBe(true)
  expect(planConfirmed({ ...plan, accepted_by: ['a'] }, ['a', 'b'])).toBe(false)
  expect(planConfirmed({ ...plan, cancelled: true }, ['a', 'b'])).toBe(false)
  const idea = { id: 'idea', kind: 'idea', archived: false } as Idea
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
    ;(array as Uint32Array)[0] = 1
    return array
  })
  expect(
    drawIdea([
      idea,
      { ...idea, id: 'place', kind: 'place' },
      { ...idea, id: 'old', archived: true },
    ]),
  ).toBe(idea)
  expect(drawIdea([])).toBeUndefined()
})

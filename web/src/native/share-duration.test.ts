import { expect, test } from 'vitest'
import { modeUntil } from './share-duration'
test('sharing duration uses the couple’s next local midnight', () => {
  expect(
    modeUntil('tomorrow', new Date('2026-10-30T10:00:00Z'), 'Asia/Kolkata'),
  ).toBe('2026-10-30T18:30:00.000Z')
  expect(
    modeUntil('tomorrow', new Date('2026-10-30T20:00:00Z'), 'Asia/Kolkata'),
  ).toBe('2026-10-31T18:30:00.000Z')
  expect(
    modeUntil('fourHours', new Date('2026-10-30T10:00:00Z'), 'Asia/Kolkata'),
  ).toBe('2026-10-30T14:00:00.000Z')
  expect(modeUntil('indefinite', new Date(), 'Asia/Kolkata')).toBeUndefined()
})

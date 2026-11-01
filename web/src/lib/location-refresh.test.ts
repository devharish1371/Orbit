import { expect, test } from 'vitest'
import { refreshState, type RefreshRequest } from './location-refresh'
const now = Date.now()
const iso = (offset: number) => new Date(now + offset).toISOString()
const request: RefreshRequest = {
  user_id: 'partner',
  couple_id: 'couple',
  location_epoch: 2,
  requested_at: iso(0),
  expires_at: iso(120_000),
  baseline_at: iso(-60_000),
}
const member = { share_mode: 'live', location_epoch: 2 }
test('a refresh waits for a new fix, not a refetch of the old timestamp', () => {
  expect(refreshState(request, member, iso(-60_000), now)).toBe('waiting')
  expect(refreshState(request, member, iso(1000), now + 1000)).toBe('updated')
  expect(refreshState(request, member, iso(-60_000), now + 120_001)).toBe(
    'unavailable',
  )
  expect(refreshState(request, member, undefined, now + 120_001)).toBe(
    'unavailable',
  )
})
test('future-dated baseline and privacy changes cannot create false refresh success', () => {
  expect(
    refreshState(
      { ...request, baseline_at: iso(30_000) },
      member,
      iso(30_000),
      now,
    ),
  ).toBe('waiting')
  expect(
    refreshState(request, { ...member, share_mode: 'paused' }, iso(1000), now),
  ).toBe('idle')
  expect(
    refreshState(request, { ...member, location_epoch: 3 }, iso(1000), now),
  ).toBe('idle')
  expect(
    refreshState(
      request,
      { ...member, share_mode: 'surprise' },
      iso(1000),
      now,
    ),
  ).toBe('updated')
})

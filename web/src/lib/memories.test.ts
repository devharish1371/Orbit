import { describe, expect, it } from 'vitest'
import { isAnniversary, localDay, storyDays, storyMilestones } from './memories'
import { dailyQuestions } from '@/copy/memories'
describe('local anniversary timeline', () => {
  it('uses the couple timezone across the UTC day boundary', () => {
    const now = new Date('2026-11-10T20:00:00Z')
    expect(localDay(now, 'Asia/Kolkata')).toBe('2026-11-11')
    expect(isAnniversary('2025-11-11', now, 'Asia/Kolkata')).toBe(true)
    expect(isAnniversary('2025-11-11', now, 'UTC')).toBe(false)
    expect(storyDays('2025-11-11', now, 'Asia/Kolkata')).toBe(365)
  })
  it('does not celebrate a future start or show negative days', () => {
    const now = new Date('2024-11-11T12:00:00Z')
    expect(isAnniversary('2025-11-11', now, 'Asia/Kolkata')).toBe(false)
    expect(storyDays('2025-11-11', now, 'Asia/Kolkata')).toBe(0)
    expect(storyMilestones('2025-11-11', now, 'Asia/Kolkata')).toEqual([])
  })
  it('keeps the daily question catalog aligned with server indices', () => {
    expect(dailyQuestions).toHaveLength(60)
    expect(new Set(dailyQuestions).size).toBe(60)
  })
})

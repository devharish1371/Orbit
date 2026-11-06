import { expect, test, vi } from 'vitest'
import { archiveRows } from './pages'
test('readiness loads all manifest pages in order and refuses partial evidence on failure', async () => {
  const page = vi
    .fn()
    .mockResolvedValueOnce({
      data: Array.from({ length: 500 }, (_, id) => id),
      error: null,
    })
    .mockResolvedValueOnce({ data: [500], error: null })
  expect(await archiveRows(page, new AbortController().signal)).toHaveLength(
    501,
  )
  expect(page.mock.calls).toEqual([
    [0, 499],
    [500, 999],
  ])
  const failed = vi
    .fn()
    .mockResolvedValueOnce({ data: Array(500).fill(0), error: null })
    .mockResolvedValueOnce({ data: null, error: 'offline' })
  await expect(
    archiveRows(failed, new AbortController().signal),
  ).rejects.toThrow('ARCHIVE_UNAVAILABLE')
  const cancelled = new AbortController()
  cancelled.abort()
  await expect(archiveRows(page, cancelled.signal)).rejects.toThrow()
})

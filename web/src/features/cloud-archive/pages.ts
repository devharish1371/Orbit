/** Exhaust the archive/proof manifest, or fail rather than show a partial readiness picture. */
export async function archiveRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
  signal: AbortSignal,
) {
  const rows: T[] = []
  for (let offset = 0; offset < 10000; offset += 500) {
    signal.throwIfAborted()
    const result = await page(offset, offset + 499)
    if (result.error || !result.data) throw new Error('ARCHIVE_UNAVAILABLE')
    rows.push(...result.data)
    if (result.data.length < 500) return rows
  }
  throw new Error('ARCHIVE_MANIFEST_LIMIT')
}

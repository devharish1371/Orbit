import type { OrbitClient } from './supabase'
import { MemoryZip } from './zip'
async function collect<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
  signal: AbortSignal,
) {
  const rows: T[] = []
  for (let offset = 0; offset < 20000; offset += 500) {
    signal.throwIfAborted()
    const result = await page(offset, offset + 499)
    if (result.error || !result.data) throw new Error('EXPORT_QUERY_FAILED')
    rows.push(...result.data)
    if (result.data.length < 500) return rows
  }
  throw new Error('EXPORT_SIZE_LIMIT')
}
export async function exportMemories(
  client: OrbitClient,
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
): Promise<Blob> {
  const started = new Date().toISOString()
  const posts = await collect(
    (from, to) =>
      client
        .from('posts')
        .select('*')
        .eq('keep', true)
        .is('unsent_at', null)
        .lte('created_at', started)
        .order('id')
        .range(from, to),
    signal,
  )
  const capsules = await collect(
    (from, to) =>
      client
        .from('capsules')
        .select('*')
        .lte('created_at', started)
        .order('id')
        .range(from, to),
    signal,
  )
  const answers = await collect(
    (from, to) =>
      client
        .from('question_answers')
        .select('*')
        .lte('created_at', started)
        .order('day')
        .order('user_id')
        .range(from, to),
    signal,
  )
  const summaries = await collect(
    (from, to) =>
      client
        .from('daily_summary')
        .select('*')
        .order('day')
        .order('user_id')
        .range(from, to),
    signal,
  )
  const postIds = posts.map((post) => post.id)
  const comments = [],
    reactions = []
  for (let offset = 0; offset < postIds.length; offset += 100) {
    const ids = postIds.slice(offset, offset + 100)
    comments.push(
      ...(await collect(
        (from, to) =>
          client
            .from('comments')
            .select('*')
            .in('post_id', ids)
            .order('id')
            .range(from, to),
        signal,
      )),
    )
    reactions.push(
      ...(await collect(
        (from, to) =>
          client
            .from('reactions')
            .select('*')
            .in('post_id', ids)
            .order('post_id')
            .order('user_id')
            .order('emoji')
            .range(from, to),
        signal,
      )),
    )
  }
  const zip = new MemoryZip(),
    files: Record<string, string> = {}
  const paths = [
    ...new Set(
      posts
        .flatMap((post) => [post.media_path, post.thumb_path])
        .filter((path): path is string => !!path),
    ),
  ]
  let count = 0
  for (const path of paths) {
    signal.throwIfAborted()
    const signed = await client.storage.from('media').createSignedUrl(path, 300)
    if (signed.error || !signed.data)
      throw new Error('EXPORT_MEDIA_UNAVAILABLE')
    const response = await fetch(signed.data.signedUrl, {
      signal,
      credentials: 'omit',
    })
    if (!response.ok) throw new Error('EXPORT_MEDIA_UNAVAILABLE')
    const content = new Uint8Array(await response.arrayBuffer())
    signal.throwIfAborted()
    const name = `media/${path.split('/').slice(-2).join('/')}`
    zip.add(name, content)
    files[path] = name
    progress(++count, paths.length)
  }
  signal.throwIfAborted()
  zip.add(
    'memories.json',
    new TextEncoder().encode(
      JSON.stringify(
        {
          format: 'orbit-memories-v1',
          exported_at: started,
          scope:
            'Kept posts with media; RLS-visible capsules and answers; daily summaries. Locked partner capsules are excluded.',
          posts,
          comments,
          reactions,
          capsules,
          answers,
          daily_summaries: summaries,
          files,
        },
        null,
        2,
      ),
    ),
  )
  return zip.finish()
}

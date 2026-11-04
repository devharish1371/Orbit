import type { Post } from '@/lib/posts'
import {
  copyMatches,
  copyMetadata,
  MAX_COPY_BYTES,
  type CopyReceipt,
  type PhoneCopy,
} from './model'
export interface CopySyncPort {
  manifest(): Promise<Post[]>
  local(): Promise<PhoneCopy[]>
  receipts(): Promise<CopyReceipt[]>
  download(post: Post): Promise<Blob>
  write(metadata: object, blob: Blob): Promise<PhoneCopy>
  remove(id: string): Promise<void>
  acknowledge(copy: PhoneCopy): Promise<void>
  forget(id: string): Promise<void>
}
/** Full manifest must succeed before any pruning. An interrupted pass is safe to retry. */
export async function syncPhoneCopies(
  port: CopySyncPort,
  active: () => boolean,
) {
  const check = () => {
    if (!active()) throw new Error('COPY_CANCELLED')
  }
  const posts = await port.manifest()
  check()
  const local = await port.local()
  check()
  const receipts = await port.receipts()
  check()
  const wanted = new Map(
    posts.filter((p) => p.keep && !p.unsent_at).map((p) => [p.id, p]),
  )
  for (const copy of local) {
    const post = wanted.get(copy.id)
    if (!post || !copyMatches(copy, post)) {
      check()
      await port.remove(copy.id)
      check()
      await port.forget(copy.id)
    }
  }
  for (const receipt of receipts) {
    if (
      !local.some(
        (c) =>
          c.id === receipt.post_id &&
          wanted.has(c.id) &&
          copyMatches(c, wanted.get(c.id)!),
      )
    ) {
      check()
      await port.forget(receipt.post_id)
    }
  }
  let saved = 0,
    skipped = 0
  for (const post of wanted.values()) {
    check()
    if (post.media_bytes > MAX_COPY_BYTES) {
      skipped++
      continue
    }
    let copy = local.find((c) => copyMatches(c, post))
    if (!copy) {
      if (saved >= 1000) {
        skipped++
        continue
      }
      const blob = post.media_path ? await port.download(post) : new Blob([])
      check()
      if (blob.size !== post.media_bytes) throw new Error('COPY_SIZE_CHANGED')
      copy = await port.write(copyMetadata(post, blob.type), blob)
      check()
      if (!copyMatches(copy, post)) throw new Error('COPY_VERIFY_FAILED')
    }
    // The server rechecks Keep, unsend, revision, current phone and current account.
    check()
    try {
      await port.acknowledge(copy)
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        String(error.message).includes('KEEPSAKE_CHANGED')
      ) {
        check()
        await port.remove(post.id)
      }
      throw error
    }
    saved++
  }
  return { saved, skipped }
}

import { phone, phoneOperation } from '@/features/phone-keepsakes/native'
import {
  copyMatches,
  validCopy,
  type PhoneIdentity,
} from '@/features/phone-keepsakes/model'
import { copySources } from '@/lib/memory-sides'
import { splitCopyId } from '@/lib/photos'
import type { Post } from '@/lib/posts'
import type { OrbitClient } from '@/lib/supabase'
export async function verifyMemoryCopies(
  client: OrbitClient,
  identity: PhoneIdentity,
  post: Post,
  active: () => boolean,
) {
  return phoneOperation(async () => {
    const check = () => {
      if (!active()) throw new Error('BACKUP_CANCELLED')
    }
    check()
    const status = await phone.status(identity)
    if (!status.enabled || status.protocol !== 2)
      throw new Error('UPDATE_PHONE_REQUIRED')
    const hashes = new Map<string, string>(),
      args = {
        p_expected_user: identity.owner,
        p_expected_couple: identity.couple,
        p_device: status.device,
      }
    try {
      for (const source of copySources(post)) {
        check()
        const copy = await phone.open({ ...identity, id: source.id })
        check()
        if (!validCopy(copy) || !copyMatches(copy, source))
          throw new Error('COPY_VERIFY_FAILED')
        const id = splitCopyId(copy.id),
          values = {
            ...args,
            p_post: id.post,
            p_revision: copy.revision,
            p_bytes: copy.bytes,
            p_sha256: copy.sha256,
          }
        const result = id.asset
          ? await client.rpc('ack_keepsake_asset', {
              ...values,
              p_asset: id.asset,
            })
          : await client.rpc('ack_keepsake_copy', values)
        if (result.error) throw result.error
        hashes.set(source.id, copy.sha256)
      }
      check()
      const confirmed = await client.rpc('confirm_copy_protocol', args)
      if (confirmed.error) throw confirmed.error
      check()
      return { hashes, device: status.device }
    } finally {
      await phone.close(identity).catch(() => {})
    }
  })
}

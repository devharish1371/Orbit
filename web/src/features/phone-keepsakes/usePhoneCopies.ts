import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import type { Post } from '@/lib/posts'
import type { CopyReceipt } from './model'
import {
  phone,
  phoneCopiesSupported,
  phoneItems,
  phoneOperation,
  writePhoneCopy,
} from './native'
import { syncPhoneCopies } from './sync'
export function usePhoneCopies() {
  const { client, session } = useAuth(),
    { data: space } = useSpace()
  const owner = session?.user.id,
    couple = space?.couple.id
  return useQuery({
    queryKey: ['phone-copies', owner, couple],
    enabled: !!owner && !!couple,
    refetchInterval: 60000,
    queryFn: async () => {
      const identity = { owner: owner!, couple: couple! }
      const loadReceipts = async () => {
        const rows: CopyReceipt[] = []
        for (let offset = 0; ; offset += 500) {
          const page = await client
            .from('keepsake_receipts')
            .select('*')
            .order('post_id')
            .order('user_id')
            .range(offset, offset + 499)
          if (page.error) throw page.error
          rows.push(...page.data)
          if (page.data.length < 500) return rows
        }
      }
      const [devices, receipts, local] = await Promise.all([
        client.from('keepsake_devices').select('*'),
        loadReceipts(),
        phoneCopiesSupported
          ? phoneOperation(() => phone.status(identity))
          : Promise.resolve(null),
      ])
      if (devices.error) throw devices.error
      return { devices: devices.data, receipts, local }
    },
  })
}
export function PhoneCopySync() {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const owner = session?.user.id,
    couple = space?.couple.id,
    revision = space?.couple.social_revision
  const [restart, setRestart] = useState(0),
    busy = useRef(false)
  useEffect(() => {
    if (!phoneCopiesSupported || !owner || !couple) return
    let alive = true
    const controller = new AbortController()
    let deferred: ReturnType<typeof setTimeout> | undefined
    const identity = { owner, couple },
      active = () =>
        alive &&
        !controller.signal.aborted &&
        navigator.onLine &&
        !document.hidden
    const run = async () => {
      if (!active()) return
      if (busy.current) {
        deferred ??= setTimeout(() => {
          deferred = undefined
          void run()
        }, 500)
        return
      }
      busy.current = true
      try {
        await (async () => {
          if (!active()) return
          const status = await phoneOperation(() => phone.status(identity))
          if (!status.enabled || !active()) return
          const device = await client
            .from('keepsake_devices')
            .select('*')
            .eq('user_id', owner)
            .maybeSingle()
          if (device.error) throw device.error
          if (!active()) return
          if (
            !device.data?.enabled ||
            device.data.device_id !== status.device
          ) {
            await phoneOperation(async () => {
              if (active())
                await phone.configure({ ...identity, enabled: false })
            })
            return
          }
          const args = {
            p_expected_user: owner,
            p_expected_couple: couple,
            p_device: status.device,
          }
          const result = await syncPhoneCopies(
            {
              async manifest() {
                const rows: Post[] = []
                let after: string | undefined
                for (;;) {
                  if (!active()) throw new Error('COPY_CANCELLED')
                  let request = client
                    .from('posts')
                    .select('*')
                    .eq('couple_id', couple)
                    .eq('keep', true)
                    .is('unsent_at', null)
                    .order('id')
                    .limit(500)
                  if (after) request = request.gt('id', after)
                  const page = await request
                  if (page.error) throw page.error
                  rows.push(...page.data)
                  if (page.data.length < 500) return rows
                  if (rows.length >= 10000)
                    throw new Error('COPY_MANIFEST_LIMIT')
                  after = page.data.at(-1)!.id
                }
              },
              local: () => phoneOperation(() => phoneItems(identity)),
              async receipts() {
                const result = await client
                  .from('keepsake_receipts')
                  .select('*')
                  .eq('user_id', owner)
                  .eq('device_id', status.device)
                if (result.error) throw result.error
                return result.data
              },
              async download(post) {
                const download = new AbortController(),
                  abort = () => download.abort()
                controller.signal.addEventListener('abort', abort, {
                  once: true,
                })
                const timer = setTimeout(abort, 30000)
                try {
                  if (!active()) throw new Error('COPY_CANCELLED')
                  const result = await client.storage
                    .from('media')
                    .download(
                      post.media_path!,
                      {},
                      { signal: download.signal, cache: 'no-store' },
                    )
                  if (result.error) throw result.error
                  return result.data
                } finally {
                  clearTimeout(timer)
                  controller.signal.removeEventListener('abort', abort)
                }
              },
              write: (metadata, data) =>
                phoneOperation(() =>
                  writePhoneCopy(identity, metadata, data, active),
                ),
              remove: (id) =>
                phoneOperation(() => phone.remove({ ...identity, id })),
              async acknowledge(copy) {
                const result = await client.rpc('ack_keepsake_copy', {
                  ...args,
                  p_post: copy.id,
                  p_revision: copy.revision,
                  p_bytes: copy.bytes,
                  p_sha256: copy.sha256,
                })
                if (result.error) throw result.error
              },
              async forget(id) {
                const result = await client.rpc('forget_keepsake_copy', {
                  ...args,
                  p_post: id,
                })
                if (result.error) throw result.error
              },
            },
            active,
          )
          if (alive)
            query.setQueryData(['phone-sync', owner, couple], {
              ...result,
              error: null,
              at: Date.now(),
            })
        })()
      } catch (error) {
        if (alive)
          query.setQueryData(['phone-sync', owner, couple], {
            error:
              error instanceof Error &&
              error.message.includes('PHONE_STORAGE_FULL')
                ? 'full'
                : 'retry',
            at: Date.now(),
          })
      } finally {
        busy.current = false
        if (alive)
          void query.invalidateQueries({
            queryKey: ['phone-copies', owner, couple],
          })
      }
    }
    const resume = () => {
        void run()
      },
      stop = () => {
        alive = false
        controller.abort()
      },
      retry = () => setRestart((v) => v + 1),
      visibility = () => {
        if (document.hidden) stop()
        else retry()
      }
    window.addEventListener('online', retry)
    window.addEventListener('orbit-keepsakes-sync', retry)
    window.addEventListener('orbit-keepsakes-stop', stop)
    window.addEventListener('orbit-signing-out', stop)
    window.addEventListener('orbit-signout-failed', retry)
    document.addEventListener('visibilitychange', visibility)
    const timer = setInterval(resume, 300000)
    resume()
    return () => {
      stop()
      clearInterval(timer)
      clearTimeout(deferred)
      window.removeEventListener('online', retry)
      window.removeEventListener('orbit-keepsakes-sync', retry)
      window.removeEventListener('orbit-keepsakes-stop', stop)
      window.removeEventListener('orbit-signing-out', stop)
      window.removeEventListener('orbit-signout-failed', retry)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [client, owner, couple, revision, query, restart])
  return null
}

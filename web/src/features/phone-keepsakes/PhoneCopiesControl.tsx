import { useState } from 'react'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Smartphone,
  Cloud,
  RefreshCw,
  ArrowUpRight,
  CheckCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import type { Post } from '@/lib/posts'
import { phone, phoneCopiesSupported, phoneOperation } from './native'
import { usePhoneCopies } from './usePhoneCopies'
import { copySources } from '@/lib/memory-sides'
import { verifiedPair, verifiedUser } from './model'
import './phone-keepsakes.css'
export function PhoneCopiesControl() {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    state = usePhoneCopies(),
    query = useQueryClient()
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const sync = useQuery<{ error?: string | null; skipped?: number }>({
    queryKey: ['phone-sync', session?.user.id, space?.couple.id],
    queryFn: skipToken,
    enabled: false,
  })
  const enabled = state.data?.local?.enabled ?? false
  async function change() {
    if (!space || !session || busy) return
    setBusy(true)
    setError('')
    const identity = { owner: session.user.id, couple: space.couple.id }
    window.dispatchEvent(new Event('orbit-keepsakes-stop'))
    try {
      await phoneOperation(async () => {
        const local = await phone.status(identity)
        const result = await client.rpc('set_keepsake_device', {
          p_expected_user: identity.owner,
          p_expected_couple: identity.couple,
          p_device: local.device,
          p_enabled: !enabled,
        })
        if (result.error) throw result.error
        await phone.configure({ ...identity, enabled: !enabled })
      })
      setConfirm(false)
      await query.invalidateQueries({ queryKey: ['phone-copies'] })
    } catch {
      setError('Couldn’t change phone storage. Try again when connected.')
    } finally {
      setBusy(false)
      window.dispatchEvent(new Event('orbit-keepsakes-sync'))
    }
  }
  return (
    <section className="phone-copy-control" aria-label="Phone storage">
      <div className="phone-copy-heading">
        <Smartphone size={22} aria-hidden="true" />
        <div>
          <h2>On this phone</h2>
          <p>
            {enabled
              ? 'Keepsakes sync while Orbit is open.'
              : phoneCopiesSupported
                ? 'Keep once. Save on both phones.'
                : 'Private phone copies are available in the Android app.'}
          </p>
        </div>
      </div>
      {phoneCopiesSupported && (
        <div className="phone-copy-actions">
          <button
            className="text-button"
            disabled={busy || state.isPending || !!state.error}
            onClick={() => setConfirm(true)}
          >
            {enabled ? 'Turn off' : 'Set up'}
          </button>
          {enabled && (
            <>
              <Link to="/offline">
                Open library <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <button
                className="icon-button"
                aria-label="Sync phone keepsakes"
                onClick={() =>
                  window.dispatchEvent(new Event('orbit-keepsakes-sync'))
                }
              >
                <RefreshCw size={18} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}
      {enabled && (
        <p className="phone-copy-usage">
          {Math.ceil((state.data?.local?.used ?? 0) / 1048576)} / 256 MB ·
          Private to Orbit
        </p>
      )}
      <p className="phone-copy-cloud">
        <Cloud size={15} aria-hidden="true" /> Cloud originals stay saved.
      </p>
      {(error || state.error) && (
        <p role="status">
          {error || 'Storage status is unavailable. Try again when connected.'}
        </p>
      )}
      {enabled && sync.data?.error && (
        <p role="status">
          {sync.data.error === 'full'
            ? 'Phone storage is full. Saved copies are safe; new ones are waiting.'
            : 'Sync paused. We’ll retry while Orbit is open and connected.'}
        </p>
      )}
      {enabled && !!sync.data?.skipped && (
        <p role="status">
          Some files are larger than 16 MB or the library is full. Their cloud
          copies stay saved.
        </p>
      )}
      {confirm && (
        <ConfirmSheet
          title={enabled ? 'Remove phone copies?' : 'Save keepsakes here?'}
          description={
            enabled
              ? 'This removes private copies from this phone. Your cloud keepsakes and the other phone stay saved.'
              : 'Either of you can tap Keep. Each opted-in phone downloads its own copy while Orbit is open. Up to 256 MB, with files up to 16 MB each. This becomes your keepsake phone; any previous phone stops syncing. Signing out or uninstalling removes these copies. Removed keepsakes disappear here after the next sync.'
          }
          confirmLabel={enabled ? 'Remove copies' : 'Use this phone'}
          error={error}
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            void change()
          }}
        />
      )}
    </section>
  )
}
export function PhoneCopyBadge({ post }: { post: Post }) {
  const { data: space } = useSpace(),
    state = usePhoneCopies()
  if (!space || !state.data || !post.keep) return null
  const both = verifiedPair(
    post,
    [space.self.user_id, ...(space.partner ? [space.partner.user_id] : [])],
    state.data.devices,
    state.data.receipts,
  )
  const own = copySources(post).every((source) =>
    verifiedUser(
      source,
      space.self.user_id,
      state.data.devices,
      state.data.receipts,
    ),
  )
  const label = both
    ? 'Copies last verified on both phones'
    : own
      ? 'Your copy verified · Waiting for the other phone'
      : 'Waiting for phone copies'
  if (!state.data.devices.some((d) => d.enabled)) return null
  return (
    <span className="phone-copy-badge" title={label} aria-label={label}>
      {both ? (
        <CheckCheck size={15} aria-hidden="true" />
      ) : (
        <Smartphone size={15} aria-hidden="true" />
      )}
      <span>
        {both
          ? 'Both phones verified'
          : own
            ? 'Waiting for other phone'
            : 'Not on both phones yet'}
      </span>
    </span>
  )
}

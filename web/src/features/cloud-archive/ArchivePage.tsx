import { useEffect, useRef, useState } from 'react'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  Archive,
  ArrowDownToLine,
  CloudUpload,
  CloudOff,
  FileCheck2,
  Check,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { BackLink } from '@/components/ui/JourneyLink'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { copySources } from '@/lib/memory-sides'
import type { Post } from '@/lib/posts'
import { buildBackup, readBackup, type CloudArchive } from './backup'
import { archiveSupported, saveVerifiedBackup } from './native'
import { verifyMemoryCopies } from './verify'
import { archiveRows } from './pages'
import './archive.css'
const pending = [
  'proposed',
  'queued',
  'removing',
  'archived',
  'restoring',
  'restore_cancelling',
]
export default function ArchivePage() {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const [chosen, setChosen] = useState<string | null>(null)
  const data = useQuery({
    queryKey: ['cloud-archives', session?.user.id, space?.couple.id],
    enabled: !!space,
    refetchInterval: 30000,
    queryFn: async ({ signal }) => {
      const [archives, proofs] = await Promise.all([
        archiveRows(
          (from, to) =>
            client
              .from('memory_archives')
              .select('*')
              .order('post_id')
              .range(from, to)
              .abortSignal(signal),
          signal,
        ),
        archiveRows(
          (from, to) =>
            client
              .from('memory_archive_proofs')
              .select('*')
              .order('post_id')
              .order('user_id')
              .range(from, to)
              .abortSignal(signal),
          signal,
        ),
      ])
      return {
        archives: archives.filter((a) =>
          pending.includes(a.state),
        ) as unknown as CloudArchive[],
        proofs,
      }
    },
  })
  const candidates = useInfiniteQuery({
    queryKey: ['archive-candidates', session?.user.id, space?.couple.id],
    enabled: !!space,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const r = await client
        .from('posts')
        .select('*')
        .eq('keep', true)
        .is('unsent_at', null)
        .order('created_at', { ascending: false })
        .order('id')
        .range(pageParam, pageParam + 99)
        .abortSignal(signal)
      if (r.error) throw r.error
      return r.data
    },
    getNextPageParam: (last, pages) =>
      last.length === 100 ? pages.length * 100 : undefined,
  })
  const posts =
    candidates.data?.pages
      .flat()
      .filter((p) => copySources(p).some((s) => s.media_path)) ?? []
  return (
    <div className="page archive-page">
      <BackLink fallback="/keepsakes" />
      <header className="archive-heading">
        <Archive aria-hidden="true" />
        <div>
          <h1>Cloud archives</h1>
          <p>Keep the memory. Make room.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Refresh archives"
          onClick={() => {
            void data.refetch()
            void candidates.refetch()
          }}
        >
          <RefreshCw size={18} />
        </button>
      </header>
      <details className="archive-guide">
        <summary>
          Before removing cloud files{' '}
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <p>
          Both of you need verified phone copies and a separate Orbit ZIP
          backup. Each person saves and checks their backup, then approves. The
          person who shared the memory makes the final choice.
        </p>
        <p>
          ZIPs contain personal photos, audio and any saved locations. Save
          yours somewhere safe, independently of Orbit. Signing out or
          uninstalling removes app-private phone copies.
        </p>
        <p>
          Approvals expire after 15 minutes. Nothing is removed automatically.
        </p>
      </details>
      {data.isPending && <p role="status">Loading archives…</p>}
      {data.error && <p role="alert">Couldn’t load archives. Try again.</p>}
      <div className="archive-shelf">
        {data.data?.archives.map((a) => (
          <ArchiveMemory
            key={a.archive_id}
            archive={a}
            post={posts.find((p) => p.id === a.post_id)}
            approved={data.data.proofs
              .filter(
                (p) =>
                  p.post_id === a.post_id &&
                  p.archive_id === a.archive_id &&
                  p.approved &&
                  Date.now() - Date.parse(p.verified_at) < 900000,
              )
              .map((p) => p.user_id)}
          />
        ))}
      </div>
      {(!!posts.length || candidates.hasNextPage) && (
        <details className="archive-choose">
          <summary>
            Choose a keepsake <ChevronDown size={18} aria-hidden="true" />
          </summary>
          {posts
            .filter((p) => !data.data?.archives.some((a) => a.post_id === p.id))
            .map((post) => (
              <button
                className="archive-pick"
                key={post.id}
                onClick={() => setChosen(post.id)}
                aria-pressed={chosen === post.id}
              >
                <span>{post.body?.trim() || 'A kept memory'}</span>
                <time dateTime={post.created_at}>
                  {new Intl.DateTimeFormat('en-IN', {
                    dateStyle: 'medium',
                  }).format(new Date(post.created_at))}
                </time>
              </button>
            ))}
          {candidates.hasNextPage && (
            <button
              className="text-button"
              disabled={candidates.isFetchingNextPage}
              onClick={() => void candidates.fetchNextPage()}
            >
              Earlier keepsakes
            </button>
          )}
        </details>
      )}
      {posts
        .filter(
          (p) =>
            p.id === chosen &&
            !data.data?.archives.some((a) => a.post_id === p.id),
        )
        .map((post) => (
          <ArchiveMemory key={post.id} post={post} approved={[]} />
        ))}
      {candidates.error && (
        <button
          className="text-button"
          onClick={() => void candidates.refetch()}
        >
          Couldn’t load keepsakes. Retry
        </button>
      )}
      {!data.isPending &&
        !data.error &&
        !data.data?.archives.length &&
        !candidates.isPending &&
        !candidates.error &&
        !posts.length && <p>No cloud files to archive yet.</p>}
      <Link className="text-button" to="/offline">
        Open phone library
      </Link>
      <button
        className="text-button"
        onClick={() =>
          void query.invalidateQueries({ queryKey: ['kept-memories'] })
        }
      >
        Refresh keepsakes
      </button>
    </div>
  )
}
export function ArchiveMemory({
  archive,
  post,
  approved,
}: {
  archive?: CloudArchive
  post?: Post
  approved: string[]
}) {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient(),
    operation = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(''),
    [message, setMessage] = useState(''),
    [independent, setIndependent] = useState(false),
    [confirm, setConfirm] = useState(false)
  const id = archive?.post_id ?? post!.id,
    owner = session?.user.id,
    couple = space?.couple.id
  const snapshot = archive
      ? (JSON.parse(archive.snapshot) as { post: Post })
      : null,
    root = post ?? snapshot?.post
  const requirements = useQuery({
    queryKey: ['archive-requirements', id, owner, couple, archive?.archive_id],
    enabled: !!owner && !!couple,
    refetchInterval: 30000,
    queryFn: async () => {
      const r = await client.rpc('archive_requirements', {
        p_expected_user: owner!,
        p_expected_couple: couple!,
        p_post: id,
      })
      if (r.error) throw r.error
      return r.data as {
        phones: boolean
        backups: boolean
        can_queue: boolean
        owner: boolean
      }
    },
  })
  useEffect(() => () => operation.current?.abort(), [owner, couple])
  async function run(
    label: string,
    work: (active: () => boolean) => Promise<void>,
  ) {
    if (operation.current || !owner || !couple) return
    const ctrl = new AbortController()
    operation.current = ctrl
    setBusy(label)
    setMessage('')
    const stop = () => ctrl.abort()
    window.addEventListener('orbit-signing-out', stop)
    const active = () => !ctrl.signal.aborted
    try {
      await work(active)
      if (active()) {
        setMessage(
          label === 'Saving backup'
            ? 'Backup read back and verified. Your approval is saved.'
            : label === 'Restoring'
              ? 'Cloud files restored.'
              : label === 'Removing cloud files'
                ? 'Cloud files removed. Your phone copies and ZIP backups stay saved.'
                : 'Done.',
        )
        setConfirm(false)
        setIndependent(false)
      }
    } catch (error) {
      if (active()) {
        const text =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : ''
        setMessage(
          text.includes('FRESH_PHONE')
            ? 'Both phones need to check this memory first. Open this page on each phone and try again.'
            : text.includes('CHANGED')
              ? 'This memory changed. Cancel the proposal and choose the keepsake again.'
              : text.includes('CANCELLED')
                ? 'Cancelled. Your cloud files are unchanged.'
                : text.includes('UPDATE_PHONE')
                  ? 'Use the latest Android app with phone copies enabled.'
                  : text.includes('WRONG_BACKUP')
                    ? 'That ZIP doesn’t match this memory. Choose its Orbit archive backup.'
                    : text.includes('QUOTA')
                      ? 'Cloud storage is full. Make room before restoring.'
                      : 'Couldn’t finish. Your current state is saved; check your connection and retry.',
        )
      }
    } finally {
      window.removeEventListener('orbit-signing-out', stop)
      if (operation.current === ctrl) {
        operation.current = null
        setBusy('')
      }
      for (const key of [
        'cloud-archives',
        'archive-candidates',
        'archive-requirements',
        'kept-memories',
        'phone-copies',
        'storage-summary',
        'posts',
      ])
        void query.invalidateQueries({ queryKey: [key] })
    }
  }
  const args = {
    p_expected_user: owner!,
    p_expected_couple: couple!,
    p_post: id,
  }
  async function backup(active: () => boolean) {
    if (!root || !independent || !archiveSupported())
      throw new Error('UPDATE_PHONE_REQUIRED')
    const identity = { owner: owner!, couple: couple! },
      verified = await verifyMemoryCopies(client, identity, root, active)
    const proposed = await client.rpc('prepare_memory_archive', args)
    if (proposed.error) throw proposed.error
    const a = proposed.data as unknown as CloudArchive
    const zip = await buildBackup(
      a,
      async (file) => {
        if (!active()) throw new Error('BACKUP_CANCELLED')
        const r = await client.storage.from('media').download(file.path)
        if (r.error) throw r.error
        return new Uint8Array(await r.data.arrayBuffer())
      },
      verified.hashes,
    )
    const proof = await saveVerifiedBackup(identity, a.archive_id, zip, active)
    if (!active()) throw new Error('BACKUP_CANCELLED')
    const result = await client.rpc('approve_memory_archive', {
      ...args,
      p_archive: a.archive_id,
      p_device: verified.device,
      p_snapshot_sha: a.snapshot_sha,
      p_zip_sha: proof.sha256,
      p_zip_bytes: proof.bytes,
      p_files: zip.files.map((f) => ({ ...f })),
      p_independent_backup: true,
    })
    if (result.error) throw result.error
  }
  async function edge(
    action: string,
    restore?: string,
    source?: string,
    body?: Uint8Array,
  ) {
    const auth = await client.auth.getSession()
    const token = auth.data.session?.access_token
    if (auth.data.session?.user.id !== owner || !token)
      throw new Error('ACCOUNT_CHANGED')
    const url = new URL(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/archive`,
    )
    url.search = new URLSearchParams({
      action,
      post: id,
      ...(restore ? { restore } : {}),
      ...(source ? { source } : {}),
    }).toString()
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: body ? new Uint8Array(body) : undefined,
      signal: operation.current?.signal,
    })
    if (!r.ok) throw new Error('ARCHIVE_RETRY')
    if (action === 'process') {
      const result = (await r.json()) as { completed: number }
      if (result.completed !== 1) throw new Error('ARCHIVE_RETRY')
    }
  }
  const ready = archive?.state === 'proposed',
    cloudGone =
      archive &&
      ['archived', 'restoring', 'restore_cancelling'].includes(archive.state),
    date = root?.created_at ?? archive?.kept_at
  return (
    <article className="archive-memory">
      <div className="archive-memory-heading">
        {cloudGone ? (
          <CloudOff size={22} aria-hidden="true" />
        ) : (
          <FileCheck2 size={22} aria-hidden="true" />
        )}
        <div>
          <time dateTime={date}>
            {date
              ? new Intl.DateTimeFormat('en-IN', {
                  dateStyle: 'medium',
                }).format(new Date(date))
              : 'Kept memory'}
          </time>
          <h2>{root?.body?.trim() || 'A kept memory'}</h2>
        </div>
      </div>
      {archive && (
        <span className="archive-state">
          {
            (
              {
                proposed: 'Backup approvals',
                queued: 'Waiting to remove',
                removing: 'Removing cloud files',
                archived: 'Saved off cloud',
                restoring: 'Restore in progress',
                restore_cancelling: 'Cancelling restore',
              } as Record<string, string>
            )[archive.state]
          }
        </span>
      )}
      {(!archive || ready) && (
        <>
          <div className="archive-checks">
            <span>
              <Check size={15} aria-hidden="true" />
              {requirements.data?.phones
                ? 'Both phones checked'
                : 'Both phones need a fresh check'}
            </span>
            <span>
              <FileCheck2 size={15} aria-hidden="true" />
              {approved.length} / 2 backup approvals
            </span>
          </div>
          {archiveSupported() ? (
            <>
              <label className="archive-ack">
                <input
                  type="checkbox"
                  checked={independent}
                  disabled={!!busy}
                  onChange={(e) => setIndependent(e.target.checked)}
                />
                <span>I’ll keep this ZIP independently of Orbit.</span>
              </label>
              <button
                className="text-button"
                disabled={!!busy || !independent}
                onClick={() => void run('Saving backup', backup)}
              >
                <ArrowDownToLine size={18} aria-hidden="true" />
                Save & verify my backup
              </button>
            </>
          ) : (
            <p className="muted small">
              Save and approve backups in the updated Android app. You can
              restore a ZIP here.
            </p>
          )}
          {ready && requirements.data?.owner && (
            <button
              className="text-button"
              disabled={!!busy || !requirements.data.can_queue}
              onClick={() => setConfirm(true)}
            >
              <CloudOff size={18} aria-hidden="true" />
              Remove cloud files
            </button>
          )}
          {ready && (
            <button
              className="text-button"
              disabled={!!busy}
              onClick={() =>
                void run('Cancelling', async () => {
                  const r = await client.rpc('cancel_memory_archive', {
                    ...args,
                    p_archive: archive.archive_id,
                  })
                  if (r.error) throw r.error
                })
              }
            >
              Cancel proposal
            </button>
          )}
        </>
      )}
      {archive?.state === 'queued' && (
        <>
          <button
            className="text-button"
            disabled={!!busy}
            onClick={() =>
              void run('Removing cloud files', () => edge('process'))
            }
          >
            Finish removal
          </button>
          <button
            className="text-button"
            disabled={!!busy}
            onClick={() =>
              void run('Cancelling', async () => {
                const r = await client.rpc('cancel_memory_archive', {
                  ...args,
                  p_archive: archive.archive_id,
                })
                if (r.error) throw r.error
              })
            }
          >
            Cancel removal
          </button>
        </>
      )}
      {archive?.state === 'removing' && (
        <button
          className="text-button"
          disabled={!!busy}
          onClick={() =>
            void run('Removing cloud files', () => edge('process'))
          }
        >
          Retry removal
        </button>
      )}
      {cloudGone && (
        <>
          <Link className="text-button" to={`/offline?memory=${id}`}>
            Open phone copy
          </Link>
          {archive.state !== 'restore_cancelling' && (
            <label className="text-button archive-import">
              <CloudUpload size={18} aria-hidden="true" />
              {archive.state === 'restoring'
                ? 'Resume from ZIP'
                : 'Restore from ZIP'}
              <input
                aria-label="Choose Orbit archive ZIP"
                type="file"
                accept=".zip,application/zip"
                disabled={!!busy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file)
                    void run('Restoring', async (active) => {
                      const files = await readBackup(file, archive)
                      if (!active()) throw new Error('BACKUP_CANCELLED')
                      const start = await client.rpc('begin_memory_restore', {
                        ...args,
                        p_archive: archive.archive_id,
                        p_snapshot_sha: archive.snapshot_sha,
                      })
                      if (start.error) throw start.error
                      const r = start.data as {
                        restore_id: string
                        targets: { source: string }[]
                      }
                      for (const target of r.targets) {
                        if (!active()) throw new Error('BACKUP_CANCELLED')
                        await edge(
                          'asset',
                          r.restore_id,
                          target.source,
                          files.get(target.source)!,
                        )
                      }
                      await edge('finish', r.restore_id)
                    })
                }}
              />
            </label>
          )}
          {archive.restore_id &&
            ['restoring', 'restore_cancelling'].includes(archive.state) && (
              <button
                className="text-button"
                disabled={!!busy}
                onClick={() =>
                  void run('Cancelling restore', () =>
                    edge('cancel', archive.restore_id!),
                  )
                }
              >
                Cancel restore
              </button>
            )}
        </>
      )}
      {busy && <p role="status">{busy}…</p>}
      {message && <p role="status">{message}</p>}
      {confirm && archive && (
        <ConfirmSheet
          title="Remove this memory’s cloud files?"
          description="Both backups and phone copies have been checked. This removes every cloud photo, thumbnail and voice file in this memory. Its details stay in Orbit. To put files back, you’ll need its Orbit ZIP backup."
          confirmLabel="Remove cloud files"
          busy={!!busy}
          error={message}
          onCancel={() => setConfirm(false)}
          onConfirm={() =>
            void run('Removing cloud files', async () => {
              const queued = await client.rpc('queue_memory_archive', {
                ...args,
                p_archive: archive.archive_id,
                p_snapshot_sha: archive.snapshot_sha,
              })
              if (queued.error) throw queued.error
              await edge('process')
            })
          }
        />
      )}
    </article>
  )
}

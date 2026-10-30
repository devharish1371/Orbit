import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LockKeyhole, MailOpen } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useNow } from '@/hooks/useNow'
import { Button } from '@/components/ui/Button'
import { memories as text } from '@/copy/memories'
import { useCapsules } from './useMemories'
export default function CapsulesPage() {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient(),
    capsules = useCapsules(),
    now = useNow()
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  const [draft, setDraft] = useState(() => crypto.randomUUID())
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget,
      data = new FormData(form),
      unlock = new Date(String(data.get('unlock')))
    if (
      !Number.isFinite(unlock.getTime()) ||
      unlock.getTime() <= Date.now() ||
      unlock.getTime() > Date.now() + 20 * 366 * 86400000
    ) {
      setMessage(text.invalidTime)
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const result = await client.rpc('create_capsule', {
        p_id: draft,
        p_title: String(data.get('title')),
        p_body: String(data.get('body')),
        p_unlock_at: unlock.toISOString(),
      })
      if (result.error) throw result.error
      form.reset()
      setDraft(crypto.randomUUID())
      setMessage(text.sealed)
      await query.invalidateQueries({ queryKey: ['capsules'] })
    } catch {
      setMessage(text.failed)
    } finally {
      setBusy(false)
    }
  }
  async function change(id: string, open: boolean) {
    if (!open && !window.confirm(text.cancelConfirm)) return
    setBusy(true)
    setMessage('')
    try {
      const result = await client.rpc(
        open ? 'open_capsule' : 'cancel_capsule',
        { p_id: id },
      )
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['capsules'] })
    } catch {
      setMessage(text.failed)
    } finally {
      setBusy(false)
    }
  }
  const format = (value: string) =>
    new Intl.DateTimeFormat('en-IN', {
      timeZone: space?.couple.timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  return (
    <div className="page memories-page">
      <Link className="back-link" to="/us">
        ← Us
      </Link>
      <header className="page-heading">
        <p className="eyebrow">For another day</p>
        <h1>{text.capsules}</h1>
      </header>
      <form
        className="glass memory-section"
        onSubmit={(event) => {
          void submit(event)
        }}
        onChange={() => setDraft(crypto.randomUUID())}
      >
        <h2>{text.newCapsule}</h2>
        <p className="muted small">{text.capsuleHint}</p>
        <label htmlFor="capsule-title">{text.titleLabel}</label>
        <input id="capsule-title" name="title" required maxLength={80} />
        <label htmlFor="capsule-body">{text.bodyLabel}</label>
        <textarea
          id="capsule-body"
          name="body"
          required
          maxLength={4000}
          rows={5}
        />
        <label htmlFor="capsule-unlock">{text.unlockLabel}</label>
        <input
          id="capsule-unlock"
          name="unlock"
          type="datetime-local"
          required
        />
        <p className="muted small">
          Time shown in this device’s timezone. Saved dates below use{' '}
          {space?.couple.timezone}.
        </p>
        <Button disabled={busy}>{text.seal}</Button>
      </form>
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
      {capsules.isPending && <p role="status">Loading capsules…</p>}
      {capsules.error && (
        <button
          className="text-button"
          onClick={() => {
            void capsules.refetch()
          }}
        >
          {text.failed} Retry
        </button>
      )}
      {capsules.data?.length === 0 && (
        <section className="glass memory-section muted">
          {text.capsuleEmpty}
        </section>
      )}
      {capsules.data?.map((row) => {
        const own = row.author_id === session?.user.id,
          locked = Date.parse(row.unlock_at) > now
        const showBody = own || !!row.opened_at
        return (
          <article
            className={`glass memory-section capsule-card ${showBody ? 'capsule-open' : ''}`}
            key={row.id}
          >
            {showBody ? (
              <MailOpen aria-hidden="true" />
            ) : (
              <LockKeyhole aria-hidden="true" />
            )}
            <p className="eyebrow">
              {locked
                ? text.future
                : row.opened_at
                  ? text.opened
                  : text.unopened}
            </p>
            <h2>{row.title}</h2>
            <time dateTime={row.unlock_at}>{format(row.unlock_at)}</time>
            {showBody && <p className="post-body">{row.body}</p>}
            {own && locked && (
              <button
                disabled={busy}
                className="text-button"
                onClick={() => {
                  void change(row.id, false)
                }}
              >
                {text.cancelCapsule}
              </button>
            )}
            {!own && !row.opened_at && (
              <Button
                disabled={busy}
                onClick={() => {
                  void change(row.id, true)
                }}
              >
                {text.open}
              </Button>
            )}
          </article>
        )
      })}
    </div>
  )
}

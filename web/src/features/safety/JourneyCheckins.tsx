import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock3, LockKeyhole, Plus, Timer, Users, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useNow } from '@/hooks/useNow'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Button } from '@/components/ui/Button'
import type { Database } from '@/lib/database.types'
import { deliveryLabels, safetyError, useJourneys } from './useSafety'
type Journey = Database['public']['Tables']['safety_journeys']['Row']
function clock(value: string, zone: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
function JourneyEditor({ onClose }: { onClose: () => void }) {
  const { client } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const [destination, setDestination] = useState(''),
    [minutes, setMinutes] = useState(30),
    [shared, setShared] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const request = useRef<{
      id: string
      request: string
      deadline: string
      destination: string
      shared: boolean
      minutes: number
    } | null>(null),
    inFlight = useRef(false)
  const [confirm, setConfirm] = useState(false)
  async function save() {
    if (!space || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    const previous = request.current
    if (
      !previous ||
      previous.destination !== destination.trim() ||
      previous.shared !== shared ||
      previous.minutes !== minutes
    )
      request.current = {
        id: crypto.randomUUID(),
        request: crypto.randomUUID(),
        deadline: new Date(Date.now() + minutes * 60000).toISOString(),
        destination: destination.trim(),
        shared,
        minutes,
      }
    const draft = request.current!
    try {
      const result = await client.rpc('save_safety_journey', {
        p_expected_user: space.self.user_id,
        p_expected_couple: space.couple.id,
        p_id: draft.id,
        p_version: null,
        p_request: draft.request,
        p_action: 'start',
        p_destination: draft.destination,
        p_deadline: draft.deadline,
        p_share: draft.shared,
      })
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['safety-journeys'] })
      onClose()
    } catch (e) {
      setError(safetyError(e))
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  return (
    <DialogSheet
      title="New check-in"
      onClose={onClose}
      dismissible={!busy}
      className="safety-editor"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (shared) setConfirm(true)
          else void save()
        }}
      >
        <fieldset disabled={busy}>
          <label htmlFor="journey-destination">Where are you heading?</label>
          <input
            id="journey-destination"
            required
            maxLength={100}
            autoFocus
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Home, a café…"
          />
          <span className="safety-field-label">Check in within</span>
          <div
            className="safety-duration"
            role="group"
            aria-label="Check-in deadline"
          >
            {[15, 30, 60, 120].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={minutes === n}
                onClick={() => setMinutes(n)}
              >
                {n < 60 ? `${n} min` : `${n / 60} hr`}
              </button>
            ))}
          </div>
          <label className="safety-consent">
            <input
              type="checkbox"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
            />
            <span>Share this timer and an overdue reminder</span>
          </label>
          <p className="muted small">
            {shared
              ? 'Visible while sharing is live. Your partner must also allow safety reminders.'
              : 'Only you can see this timer.'}
          </p>
          {error && !confirm && <p role="alert">{error}</p>}
          <Button disabled={busy || !destination.trim()}>
            {busy ? 'Saving…' : 'Start check-in'}
          </Button>
        </fieldset>
      </form>
      {confirm && (
        <ConfirmSheet
          title="Share this check-in?"
          description="Your partner can see the destination and deadline while sharing is live. If you don’t check in, Orbit can send a reminder. It may be delayed or missed."
          confirmLabel="Share and start"
          busy={busy}
          error={error}
          onCancel={() => {
            setConfirm(false)
            setError('')
          }}
          onConfirm={() => {
            void save()
          }}
        />
      )}
    </DialogSheet>
  )
}
function JourneyCard({ item }: { item: Journey }) {
  const { client } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient(),
    now = useNow()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [cancel, setCancel] = useState(false)
  const pending = useRef<{
      key: string
      request: string
      deadline: string | null
    } | null>(null),
    inFlight = useRef(false)
  const own = item.user_id === space?.self.user_id,
    active = item.state === 'active',
    late = Date.parse(item.deadline) <= now
  const delivery = useQuery({
    queryKey: ['safety-delivery', item.user_id, item.id, item.version],
    enabled: own && active && !!space,
    refetchInterval: 30000,
    queryFn: async () => {
      const result = await client.rpc('safety_journey_delivery', {
        p_expected_user: space!.self.user_id,
        p_expected_couple: space!.couple.id,
        p_id: item.id,
      })
      if (result.error) throw result.error
      return result.data as { status: string }
    },
  })
  async function act(action: 'check_in' | 'extend' | 'cancel') {
    if (!space || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    const key = `${item.version}:${action}`
    if (pending.current?.key !== key)
      pending.current = {
        key,
        request: crypto.randomUUID(),
        deadline:
          action === 'extend'
            ? new Date(
                Math.max(now, Date.parse(item.deadline)) + 15 * 60000,
              ).toISOString()
            : null,
      }
    try {
      const result = await client.rpc('save_safety_journey', {
        p_expected_user: space.self.user_id,
        p_expected_couple: space.couple.id,
        p_id: item.id,
        p_version: item.version,
        p_request: pending.current.request,
        p_action: action,
        p_deadline: pending.current.deadline ?? undefined,
      })
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['safety-journeys'] })
      await query.invalidateQueries({ queryKey: ['safety-delivery'] })
      setCancel(false)
    } catch (e) {
      setError(safetyError(e))
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  const name = own
    ? 'Your check-in'
    : space?.self.partner_nickname ||
      space?.partner?.nickname ||
      space?.partner?.display_name ||
      'Partner'
  const progress = Math.max(
    0,
    Math.min(
      1,
      (now - Date.parse(item.created_at)) /
        (Date.parse(item.deadline) - Date.parse(item.created_at)),
    ),
  )
  return (
    <article className={`safety-journey ${late && active ? 'is-overdue' : ''}`}>
      <div className="safety-journey-top">
        <span>{name}</span>
        {item.share_overdue ? (
          <Users size={16} aria-label="Shared timer" />
        ) : (
          <LockKeyhole size={16} aria-label="Private timer" />
        )}
      </div>
      <div className="safety-journey-body">
        <svg className="checkin-dial" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="33" />
          <circle
            cx="40"
            cy="40"
            r="33"
            pathLength="100"
            strokeDasharray={`${progress * 100} 100`}
            transform="rotate(-90 40 40)"
          />
          <path d={active ? 'M40 20v20l13 8' : 'm27 40 9 9 18-20'} />
        </svg>
        <div>
          <h3>{item.destination}</h3>
          <p>
            {active
              ? late
                ? 'No check-in yet'
                : 'Check in by'
              : item.state === 'checked_in'
                ? 'Checked in'
                : 'Cancelled'}{' '}
            {active && (
              <time dateTime={item.deadline}>
                {clock(item.deadline, space?.couple.timezone ?? 'Asia/Kolkata')}
              </time>
            )}
          </p>
          {active && !late && (
            <span className="safety-countdown">
              {Math.max(
                1,
                Math.ceil((Date.parse(item.deadline) - now) / 60000),
              )}{' '}
              min left
            </span>
          )}
        </div>
      </div>
      {active && own && (
        <>
          <div className="safety-journey-actions">
            <Button
              disabled={busy}
              onClick={() => {
                void act('check_in')
              }}
            >
              <Check size={18} aria-hidden="true" />
              I’m here
            </Button>
            <button
              className="text-button"
              disabled={
                busy ||
                Math.max(now, Date.parse(item.deadline)) + 900000 >
                  now + 86400000
              }
              onClick={() => {
                void act('extend')
              }}
            >
              <Plus size={16} aria-hidden="true" />
              15 min
            </button>
            <button
              className="icon-button"
              disabled={busy}
              onClick={() => setCancel(true)}
              aria-label="Cancel check-in"
            >
              <X size={18} />
            </button>
          </div>
          <p className="safety-delivery" role="status">
            {delivery.error
              ? 'Reminder status unavailable'
              : delivery.data
                ? (deliveryLabels[delivery.data.status] ??
                  'Reminder status unavailable')
                : 'Checking reminder status…'}
          </p>
        </>
      )}
      {error && !cancel && <p role="alert">{error}</p>}
      {cancel && (
        <ConfirmSheet
          title="Cancel this check-in?"
          description="This closes the timer and stops any overdue reminder that hasn’t been sent."
          confirmLabel="Cancel check-in"
          busy={busy}
          error={error}
          onCancel={() => {
            setCancel(false)
            setError('')
          }}
          onConfirm={() => {
            void act('cancel')
          }}
        />
      )}
    </article>
  )
}
export function JourneyCheckins() {
  const journeys = useJourneys(),
    { data: space } = useSpace(),
    [editing, setEditing] = useState(false)
  const active = journeys.data?.filter((j) => j.state === 'active') ?? [],
    recent =
      journeys.data?.filter((j) => j.state !== 'active').slice(0, 3) ?? []
  const ownActive = active.some((j) => j.user_id === space?.self.user_id)
  return (
    <section className="safety-checkins">
      <div className="safety-section-heading">
        <h2>
          <Timer size={20} aria-hidden="true" />
          Check-ins
        </h2>
        {!ownActive && active.length > 0 && (
          <button
            className="icon-button"
            aria-label="New check-in"
            disabled={journeys.isPending || !!journeys.error}
            onClick={() => setEditing(true)}
          >
            <Plus size={20} />
          </button>
        )}
      </div>
      {journeys.isPending ? (
        <p role="status">Loading check-ins…</p>
      ) : journeys.error ? (
        <button
          className="text-button"
          onClick={() => {
            void journeys.refetch()
          }}
        >
          Couldn’t load check-ins. Retry
        </button>
      ) : active.length ? (
        active.map((j) => <JourneyCard key={j.id} item={j} />)
      ) : (
        <div className="safety-empty">
          <Clock3 size={34} aria-hidden="true" />
          <p>No active check-in</p>
          <Button className="button-secondary" onClick={() => setEditing(true)}>
            Set a timer
          </Button>
        </div>
      )}
      {!!recent.length && (
        <details className="safety-recent">
          <summary>Recent check-ins</summary>
          {recent.map((j) => (
            <JourneyCard key={j.id} item={j} />
          ))}
        </details>
      )}
      {editing && <JourneyEditor onClose={() => setEditing(false)} />}
    </section>
  )
}

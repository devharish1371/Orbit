import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, CalendarPlus, Check, MapPin, Pencil, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useNow } from '@/hooks/useNow'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { ChoiceSelect } from '@/components/ui/ChoiceSelect'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Button } from '@/components/ui/Button'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import {
  planConfirmed,
  planCalendar,
  planningError,
  type Plan,
} from '@/lib/plans'
import { savePlanCalendar } from '@/native/privacy'
export function PlanCard({
  plan,
  onEdit,
  lead,
}: {
  plan: Plan
  onEdit: () => void
  lead: number | null
}) {
  const { client } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient(),
    now = useNow()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [cancel, setCancel] = useState(false),
    [reminder, setReminder] = useState(false),
    [calendar, setCalendar] = useState(false)
  const [minutes, setMinutes] = useState(String(lead ?? ''))
  if (!space) return null
  const ids = [
      space.self.user_id,
      ...(space.partner ? [space.partner.user_id] : []),
    ],
    confirmed = planConfirmed(plan, ids),
    closed = plan.cancelled || Date.parse(plan.starts_at) <= now,
    accepted = plan.accepted_by.includes(space.self.user_id),
    own = space.self.user_id === plan.created_by
  const day = new Intl.DateTimeFormat('en-IN', {
      timeZone: plan.timezone,
      day: 'numeric',
    }).format(new Date(plan.starts_at)),
    month = new Intl.DateTimeFormat('en-IN', {
      timeZone: plan.timezone,
      month: 'short',
    }).format(new Date(plan.starts_at))
  const date = new Intl.DateTimeFormat('en-IN', {
    timeZone: plan.timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(plan.starts_at))
  const identity = {
    p_expected_user: space.self.user_id,
    p_expected_couple: space.couple.id,
  }
  async function respond(accept: boolean) {
    setBusy(true)
    setError('')
    try {
      const result = await client.rpc('respond_plan', {
        p_id: plan.id,
        p_version: plan.version,
        p_accept: accept,
        ...identity,
      })
      if (result.error) throw result.error
      setCancel(false)
      await query.invalidateQueries({ queryKey: ['plans'] })
    } catch (e) {
      setError(planningError(e))
    } finally {
      setBusy(false)
    }
  }
  async function saveReminder() {
    setBusy(true)
    setError('')
    try {
      const result = await client.rpc('set_plan_reminder', {
        p_id: plan.id,
        p_version: plan.version,
        p_minutes: minutes === '' ? null : Number(minutes),
        ...identity,
      })
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['plan-reminders'] })
      setReminder(false)
    } catch (e) {
      setError(planningError(e))
    } finally {
      setBusy(false)
    }
  }
  async function calendarFile() {
    setBusy(true)
    setError('')
    try {
      await savePlanCalendar(planCalendar(plan, confirmed), plan.id)
      setCalendar(false)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        setError('Couldn’t save the calendar file.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className={`plan-entry ${closed ? 'plan-past' : ''}`}>
      <div className="plan-date" aria-hidden="true">
        <span>{month}</span>
        <strong>{day}</strong>
        <i />
      </div>
      <div className="plan-entry-body">
        <div className="plan-state">
          {plan.cancelled ? (
            'Cancelled'
          ) : closed ? (
            'Past plan'
          ) : confirmed ? (
            <>
              <Check size={12} aria-hidden="true" />
              Confirmed
            </>
          ) : accepted ? (
            'Awaiting reply'
          ) : (
            'A plan for us'
          )}
        </div>
        <h2>{plan.title}</h2>
        <time dateTime={plan.starts_at}>
          {date} <span>· {plan.timezone}</span>
        </time>
        {plan.venue && (
          <a
            className="plan-venue"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plan.venue)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin size={14} aria-hidden="true" />
            {plan.venue}
          </a>
        )}
        {plan.notes && <p className="plan-notes">{plan.notes}</p>}
        <div className="plan-actions">
          {!closed && !accepted && (
            <Button
              disabled={busy}
              onClick={() => {
                void respond(true)
              }}
            >
              Count me in
            </Button>
          )}
          {!closed && (
            <>
              <button
                className="icon-button"
                aria-label={`Reminder for ${plan.title}`}
                title={lead ? 'Reminder on' : 'Reminder off'}
                data-enabled={lead !== null}
                onClick={() => {
                  setMinutes(String(lead ?? ''))
                  setError('')
                  setReminder(true)
                }}
              >
                <Bell size={18} />
              </button>
              {own && (
                <button
                  className="icon-button"
                  aria-label={`Edit ${plan.title}`}
                  disabled={busy}
                  onClick={onEdit}
                >
                  <Pencil size={17} />
                </button>
              )}
              <button
                className="icon-button"
                aria-label={`Cancel ${plan.title}`}
                disabled={busy}
                onClick={() => {
                  setError('')
                  setCancel(true)
                }}
              >
                <X size={18} />
              </button>
            </>
          )}
          <button
            className="icon-button"
            aria-label={`Calendar file for ${plan.title}`}
            onClick={() => {
              setError('')
              setCalendar(true)
            }}
          >
            <CalendarPlus size={18} />
          </button>
        </div>
        {error && !cancel && !reminder && !calendar && (
          <p role="alert">{error}</p>
        )}
      </div>
      {cancel && (
        <ConfirmSheet
          title="Cancel this plan?"
          description="It stays in your history. Pending reminders will stop."
          confirmLabel="Cancel plan"
          onCancel={() => setCancel(false)}
          onConfirm={() => {
            void respond(false)
          }}
          busy={busy}
          error={error}
        />
      )}
      {reminder && (
        <DialogSheet
          title="Remind me"
          onClose={() => setReminder(false)}
          dismissible={!busy}
          className="planning-editor"
        >
          <ChoiceSelect
            label="Reminder"
            value={minutes}
            options={[
              { value: '', label: 'Off' },
              { value: '10', label: '10 minutes before' },
              { value: '30', label: '30 minutes before' },
              { value: '60', label: '1 hour before' },
              { value: '1440', label: '1 day before' },
            ]}
            onChange={setMinutes}
            disabled={busy}
          />
          <p className="planning-disclosure">
            For you, once both confirm. Uses your quiet hours and enabled
            Android notifications.
          </p>
          <Link className="text-button" to="/notifications">
            Notification settings
          </Link>
          {error && <p role="alert">{error}</p>}
          <Button
            disabled={busy}
            onClick={() => {
              void saveReminder()
            }}
          >
            Save reminder
          </Button>
        </DialogSheet>
      )}
      {calendar && (
        <DialogSheet
          title="Save to calendar"
          onClose={() => setCalendar(false)}
          dismissible={!busy}
          className="planning-editor"
        >
          <p>
            Save a calendar file for this plan. Later changes won’t sync
            automatically.
          </p>
          {error && <p role="alert">{error}</p>}
          <Button
            disabled={busy}
            onClick={() => {
              void calendarFile()
            }}
          >
            {busy ? 'Saving…' : 'Save file'}
          </Button>
        </DialogSheet>
      )}
    </article>
  )
}

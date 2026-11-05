import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Gauge, Check, BellOff } from 'lucide-react'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { Button } from '@/components/ui/Button'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { ChoiceSelect } from '@/components/ui/ChoiceSelect'
import { useAuth } from '@/hooks/useAuth'
import { speedSupported, safety } from './native'
export function SpeedReminders() {
  const { session } = useAuth(),
    query = useQueryClient(),
    owner = session?.user.id
  const state = useQuery({
    queryKey: ['safety-speed', owner],
    enabled: !!owner && speedSupported,
    refetchInterval: 15000,
    queryFn: () => safety.status({ owner: owner! }),
  })
  const [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [threshold, setThreshold] = useState(80),
    [error, setError] = useState('')
  async function configure(enabled: boolean) {
    if (!owner || busy) return
    setBusy(true)
    setError('')
    try {
      const value = await safety.configure({
        owner,
        enabled,
        threshold: enabled ? threshold : (state.data?.threshold ?? 80),
      })
      query.setQueryData(['safety-speed', owner], value)
      setConfirm(false)
    } catch (e) {
      setError(
        e &&
          typeof e === 'object' &&
          'message' in e &&
          String(e.message).includes('TRACKING_REQUIRED')
          ? 'Start tracking and allow notifications in Tracking health first.'
          : 'Couldn’t change this setting. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function dismiss() {
    if (!owner || !state.data?.pendingId) return
    setBusy(true)
    try {
      const value = await safety.dismiss({ owner, id: state.data.pendingId })
      query.setQueryData(['safety-speed', owner], value)
    } catch {
      setError('Couldn’t dismiss this reminder. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="safety-speed">
      <h2>
        <Gauge size={20} aria-hidden="true" />
        Speed reminders
      </h2>
      {!speedSupported ? (
        <p className="muted small">
          Local speed reminders are available in the Android app.
        </p>
      ) : state.isPending ? (
        <p role="status">Loading speed settings…</p>
      ) : state.error ? (
        <button
          className="text-button"
          onClick={() => {
            void state.refetch()
          }}
        >
          Couldn’t load speed settings. Retry
        </button>
      ) : (
        state.data && (
          <>
            {!state.data.supported && (
              <p className="muted small">
                Speed uncertainty is unavailable on this Android version.
              </p>
            )}
            <div className="safety-speed-status">
              <span>
                {state.data.enabled
                  ? `${state.data.threshold} km/h · ${state.data.running ? 'on this phone' : 'tracking stopped'}`
                  : 'Off on this phone'}
              </span>
              <Button
                className="button-secondary"
                disabled={busy || !state.data.supported}
                onClick={() => {
                  if (state.data.enabled) void configure(false)
                  else setConfirm(true)
                }}
              >
                {state.data.enabled ? 'Turn off' : 'Set up'}
              </Button>
            </div>
            {state.data.enabled && !state.data.notifications && (
              <p className="safety-note">
                <BellOff size={16} aria-hidden="true" />
                Notifications are blocked.
              </p>
            )}
            {state.data.pendingId && (
              <div className="safety-local-prompt">
                <Gauge size={28} aria-hidden="true" />
                <h3>Speed reminder</h3>
                {state.data.pendingAt > 0 && (
                  <time dateTime={new Date(state.data.pendingAt).toISOString()}>
                    {new Date(state.data.pendingAt).toLocaleString()}
                  </time>
                )}
                <p>
                  A sustained estimate passed your chosen threshold. It doesn’t
                  identify who is driving.
                </p>
                <Button
                  disabled={busy}
                  onClick={() => {
                    void dismiss()
                  }}
                >
                  <Check size={18} aria-hidden="true" />
                  Dismiss
                </Button>
                <Link className="text-button" to="/activity">
                  Ask for a call
                </Link>
              </div>
            )}
            <Link className="text-button" to="/tracking">
              Tracking health
            </Link>
          </>
        )
      )}
      {error && !confirm && <p role="alert">{error}</p>}
      <details className="safety-details">
        <summary>How it works</summary>
        <p>
          Uses fresh native speed estimates with uncertainty for at least 45
          seconds. The reminder stays on this phone. It can miss events, and a
          phone may be on a bus or train. No road-limit or driving recognition.
        </p>
        <p>
          Works only with tracking running and live sharing. Pause and Surprise
          stop the estimate window. Review reminders only when safely stopped.
        </p>
      </details>
      {confirm && (
        <DialogSheet
          title="A reminder for this phone"
          onClose={() => {
            setConfirm(false)
            setError('')
          }}
          dismissible={!busy}
          className="safety-editor"
        >
          <p className="muted">
            Uses existing location sharing. No extra tracking starts and nothing
            is sent to your partner. Review only when safely stopped.
          </p>
          <label htmlFor="speed-threshold">Remind above</label>
          <ChoiceSelect
            id="speed-threshold"
            label="Remind above"
            value={String(threshold)}
            disabled={busy}
            onChange={(value) => setThreshold(Number(value))}
            options={[60, 80, 100, 120].map((n) => ({
              value: String(n),
              label: `${n} km/h`,
            }))}
          />
          {error && <p role="alert">{error}</p>}
          <Button
            disabled={busy}
            onClick={() => {
              void configure(true)
            }}
          >
            {busy ? 'Saving…' : 'Enable reminder'}
          </Button>
        </DialogSheet>
      )}
    </section>
  )
}

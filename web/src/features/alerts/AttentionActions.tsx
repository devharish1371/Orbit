import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { copy } from '@/copy/en'
type Attention = 'nudge' | 'call_request' | 'sos'
export function AttentionActions() {
  const { client } = useAuth()
  const { data: space } = useSpace()
  const query = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState('')
  async function send(type: Attention) {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const result = await client.rpc('send_attention', {
        p_type: type,
        p_id: crypto.randomUUID(),
      })
      if (result.error) throw result.error
      setMessage(copy.alerts.requestSaved)
      setConfirm(false)
      await query.invalidateQueries({ queryKey: ['activity'] })
    } catch (error) {
      setMessage(
        error &&
          typeof error === 'object' &&
          'message' in error &&
          String(error.message).includes('ATTENTION_COOLDOWN')
          ? copy.alerts.cooldown
          : copy.alerts.failed,
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section
      className="glass settings-section attention-actions"
      aria-label={copy.alerts.stayClose}
    >
      <div className="section-title">
        <h2>{copy.alerts.stayClose}</h2>
        <Link className="card-link" to="/activity">
          {copy.alerts.activity}
        </Link>
      </div>
      <div className="attention-buttons">
        <Button
          type="button"
          className="button-secondary"
          disabled={busy || !space?.partner}
          onClick={() => {
            void send('nudge')
          }}
        >
          {copy.alerts.nudge}
        </Button>
        <Button
          type="button"
          className="button-secondary"
          disabled={busy || !space?.partner}
          onClick={() => {
            void send('call_request')
          }}
        >
          {copy.alerts.callMe}
        </Button>
        <Button
          type="button"
          className="button-secondary sos-button"
          disabled={busy || !space?.partner}
          onClick={() => setConfirm(true)}
        >
          {copy.alerts.sos}
        </Button>
      </div>
      {confirm && (
        <div
          className="sos-confirm"
          role="group"
          aria-label={copy.alerts.confirmTitle}
        >
          <p>{copy.alerts.confirmTitle}</p>
          <p className="muted small">{copy.alerts.sosHint}</p>
          <div className="attention-buttons">
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                void send('sos')
              }}
            >
              {copy.alerts.sendSos}
            </Button>
            <Button
              type="button"
              className="button-secondary"
              onClick={() => setConfirm(false)}
            >
              {copy.map.cancel}
            </Button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
    </section>
  )
}

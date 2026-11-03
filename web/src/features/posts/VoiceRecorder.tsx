import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { beginVoice } from '@/lib/media'
import type { Attachment } from '@/lib/posts'
import { copy } from '@/copy/en'
import { Button } from '@/components/ui/Button'
import { useBackLayer } from '@/app/backLayers'
export function VoiceRecorder({
  onReady,
  onBusy,
  compact = false,
  disabled = false,
  studio = false,
}: {
  onReady: (note: Attachment) => void
  onBusy: (busy: boolean) => void
  compact?: boolean
  disabled?: boolean
  studio?: boolean
}) {
  const [state, setState] = useState<'idle' | 'starting' | 'recording'>('idle'),
    [seconds, setSeconds] = useState(0),
    [level, setLevel] = useState(0),
    [error, setError] = useState(false)
  const abort = useRef<AbortController | null>(null),
    capture = useRef<Awaited<ReturnType<typeof beginVoice>> | null>(null)
  useEffect(() => () => abort.current?.abort(), [])
  function stopOrCancel() {
    if (state === 'recording') capture.current?.stop()
    else if (state === 'starting') {
      abort.current?.abort()
      setState('idle')
      onBusy(false)
    }
  }
  useBackLayer(state !== 'idle', stopOrCancel)
  async function start() {
    if (state !== 'idle') return
    const controller = new AbortController()
    abort.current = controller
    setState('starting')
    setError(false)
    setSeconds(0)
    onBusy(true)
    try {
      capture.current = await beginVoice(controller.signal, {
        ready: (note) => {
          setState('idle')
          onBusy(false)
          onReady(note)
        },
        sample: (value, time) => {
          if (!controller.signal.aborted) {
            setLevel(value)
            setSeconds(time)
          }
        },
        error: () => {
          if (!controller.signal.aborted) {
            setState('idle')
            setError(true)
            onBusy(false)
          }
        },
      })
      if (!controller.signal.aborted) setState('recording')
    } catch {
      if (!controller.signal.aborted) {
        setState('idle')
        setError(true)
        onBusy(false)
      }
    }
  }
  return (
    <div
      className={`voice-recorder ${compact ? 'compact-recorder' : ''} ${studio ? 'studio-recorder' : ''}`}
      data-state={state}
    >
      {!compact && !studio && (
        <p className="muted small">{copy.posts.voiceHint}</p>
      )}
      <div className="voice-capture">
        <Button
          className={compact ? 'icon-button' : 'button-secondary'}
          type="button"
          disabled={disabled}
          aria-label={
            state === 'idle'
              ? copy.posts.record
              : state === 'starting'
                ? copy.posts.cancel
                : copy.posts.stop
          }
          onClick={() => {
            if (state !== 'idle') stopOrCancel()
            else void start()
          }}
        >
          {state === 'idle' ? (
            <Mic size={18} aria-hidden="true" />
          ) : (
            <Square size={16} aria-hidden="true" />
          )}
          {(!compact || studio) &&
            (state === 'idle'
              ? copy.posts.record
              : state === 'starting'
                ? copy.posts.cancel
                : copy.posts.stop)}
        </Button>
        {((!compact && !studio) || state !== 'idle') && (
          <span role="status" className="record-time">
            {Math.floor(seconds / 60)}:
            {String(Math.floor(seconds) % 60).padStart(2, '0')}
          </span>
        )}
        {studio && state === 'recording' ? (
          <span className="studio-levels" aria-hidden="true">
            {[0.35, 0.6, 0.9, 1, 0.85, 0.55, 0.3].map((weight, i) => (
              <i
                key={i}
                style={{
                  transform: `scaleY(${Math.max(0.12, level * weight)})`,
                }}
              />
            ))}
          </span>
        ) : (
          !studio &&
          (!compact || state !== 'idle') && (
            <span
              className="record-level"
              style={{ transform: `scaleY(${Math.max(0.1, level)})` }}
              aria-hidden="true"
            />
          )
        )}
      </div>
      {error && <p role="alert">{copy.posts.voiceFailed}</p>}
    </div>
  )
}

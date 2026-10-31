import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { copy } from '@/copy/en'

const stamp = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`

/** Uses the stored amplitude envelope; never downloads/decodes audio just to draw it. */
export function AudioPlayer({
  src,
  blob,
  waveform,
  duration = 0,
  label,
  onError,
}: {
  src?: string
  blob?: Blob
  waveform?: number[] | null
  duration?: number | null
  label: string
  onError?: () => void
}) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [failed, setFailed] = useState(false)
  const [time, setTime] = useState(0)
  const [measured, setMeasured] = useState(0)
  const [rate, setRate] = useState(1)
  const length = measured || (Number.isFinite(duration) ? duration || 0 : 0)
  const progress = length ? Math.min(1, time / length) : 0
  const bars = waveform?.length
    ? waveform
    : Array.from({ length: 36 }, () => 0.12)
  useEffect(() => {
    const element = audio.current
    if (!element) return
    const local = blob ? URL.createObjectURL(blob) : undefined
    element.src = local ?? src ?? ''
    const pause = () => {
      if (document.hidden) element.pause()
    }
    const exclusive = (event: Event) => {
      if (event.target instanceof HTMLMediaElement && event.target !== element)
        element.pause()
    }
    document.addEventListener('visibilitychange', pause)
    document.addEventListener('play', exclusive, true)
    return () => {
      element.pause()
      element.removeAttribute('src')
      if (local) URL.revokeObjectURL(local)
      document.removeEventListener('visibilitychange', pause)
      document.removeEventListener('play', exclusive, true)
    }
  }, [src, blob])
  async function toggle() {
    const element = audio.current
    if (!element) return
    if (!element.paused) {
      element.pause()
      return
    }
    setFailed(false)
    setWaiting(true)
    try {
      if (element.error) element.load()
      await element.play()
    } catch {
      setFailed(true)
    } finally {
      setWaiting(false)
    }
  }
  return (
    <div
      className="orbit-audio"
      role="group"
      aria-label={label}
      data-playing={playing}
    >
      <audio
        ref={audio}
        preload="none"
        onEmptied={() => {
          setTime(0)
          setMeasured(0)
          setPlaying(false)
          setWaiting(false)
          setRate(1)
          if (audio.current) audio.current.playbackRate = 1
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false)
          setWaiting(false)
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onEnded={() => {
          setPlaying(false)
          setWaiting(false)
        }}
        onTimeUpdate={() => setTime(audio.current?.currentTime ?? 0)}
        onDurationChange={() => {
          const value = audio.current?.duration ?? 0
          if (Number.isFinite(value) && value > 0) setMeasured(value)
        }}
        onError={() => {
          setFailed(true)
          setPlaying(false)
          setWaiting(false)
          onError?.()
        }}
      />
      <button
        type="button"
        className="audio-toggle"
        onClick={() => {
          void toggle()
        }}
        aria-label={
          failed
            ? copy.posts.audioRetry
            : playing
              ? copy.posts.audioPause
              : copy.posts.audioPlay
        }
        aria-busy={waiting}
      >
        {failed ? (
          <RotateCcw size={19} />
        ) : playing ? (
          <Pause size={20} fill="currentColor" />
        ) : (
          <Play size={20} fill="currentColor" />
        )}
      </button>
      <div className="audio-track">
        <div
          className="audio-wave"
          style={{ '--played': `${progress * 100}%` } as CSSProperties}
        >
          <div className="audio-bars" aria-hidden="true">
            {bars.map((value, index) => (
              <i
                key={index}
                style={{
                  height: `${Math.max(12, Math.min(100, value * 100))}%`,
                  opacity: index / bars.length <= progress ? 1 : 0.35,
                }}
              />
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={length || 1}
            step={0.1}
            value={Math.min(time, length || 1)}
            disabled={!length}
            aria-label={copy.posts.audioSeek}
            aria-valuetext={`${stamp(time)} / ${stamp(length)}`}
            onChange={(event) => {
              if (!audio.current) return
              const value = Number(event.target.value)
              audio.current.currentTime = value
              setTime(value)
            }}
          />
        </div>
        <div className="audio-caption">
          <span>
            {waiting
              ? copy.posts.audioLoading
              : failed
                ? copy.posts.audioFailed
                : copy.posts.voiceLabel}
          </span>
          <span>{stamp(time || length)}</span>
        </div>
      </div>
      <button
        type="button"
        className="audio-rate"
        aria-label={copy.posts.audioSpeed.replace('{rate}', String(rate))}
        onClick={() => {
          const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1
          setRate(next)
          if (audio.current) audio.current.playbackRate = next
        }}
      >
        {rate}×
      </button>
    </div>
  )
}

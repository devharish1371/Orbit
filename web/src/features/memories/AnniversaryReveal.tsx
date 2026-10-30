import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useNow } from '@/hooks/useNow'
import { isAnniversary, localDay } from '@/lib/memories'
import { memories as text } from '@/copy/memories'
function Reveal({ close }: { close: () => void }) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement
    const contain = (event: FocusEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest('.anniversary-reveal')
      )
        button.current?.focus()
    }
    document.addEventListener('focusin', contain)
    button.current?.focus()
    return () => {
      document.removeEventListener('focusin', contain)
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus()
    }
  }, [])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let active = true
    void import('canvas-confetti').then(({ default: confetti }) => {
      if (active)
        void confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.6 },
          disableForReducedMotion: true,
          colors: ['#FF6B8A', '#A98EFF', '#3DE0C5'],
        })
    })
    return () => {
      active = false
    }
  }, [])
  return (
    <div
      className="anniversary-reveal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-title"
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          event.preventDefault()
          button.current?.focus()
        }
        if (event.key === 'Escape') close()
      }}
    >
      <div className="reveal-orbit" aria-hidden="true">
        ✦
      </div>
      <p className="eyebrow">Happy anniversary</p>
      <h1 id="reveal-title">{text.revealTitle}</h1>
      <p>{text.revealBody}</p>
      <button ref={button} className="button" onClick={close}>
        {text.revealClose}
      </button>
    </div>
  )
}
export function AutomaticReveal() {
  const { pathname } = useLocation()
  const { data: space } = useSpace(),
    { session } = useAuth(),
    now = useNow()
  const [dismissed, setDismissed] = useState('')
  const anniversary = space?.couple.anniversary
  if (
    pathname === '/reveal' ||
    !space ||
    !anniversary ||
    !isAnniversary(anniversary, new Date(now), space.couple.timezone)
  )
    return null
  const key = `orbit-reveal:${session?.user.id}:${localDay(new Date(now), space.couple.timezone)}`
  let seen = false
  try {
    seen = localStorage.getItem(key) === 'seen'
  } catch {
    /* Dismissal works in memory. */
  }
  if (seen || dismissed === key) return null
  return (
    <Reveal
      close={() => {
        setDismissed(key)
        try {
          localStorage.setItem(key, 'seen')
        } catch {
          /* optional local persistence */
        }
      }}
    />
  )
}
export default function ReplayReveal() {
  const [closed, setClosed] = useState(false)
  return closed ? (
    <div className="page">
      <Link className="button" to="/us">
        {text.revealClose}
      </Link>
    </div>
  ) : (
    <Reveal close={() => setClosed(true)} />
  )
}

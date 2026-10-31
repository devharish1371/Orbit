import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Pause, Play } from 'lucide-react'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { Avatar } from './Avatar'
import { useSpace } from '@/hooks/useSpace'
import { copy } from '@/copy/en'

export function OrbitPortraits() {
  const { data } = useSpace()
  const scene = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(true)
  const [hidden, setHidden] = useState(document.hidden)
  const [held, setHeld] = useState(false)
  useEffect(() => {
    const visibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', visibility)
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) =>
            setVisible(!!entry?.isIntersecting),
          )
    if (scene.current) observer?.observe(scene.current)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      observer?.disconnect()
    }
  }, [])
  if (!data) return null
  const { self, partner } = data
  return (
    <div
      className="portrait-universe"
      ref={scene}
      data-running={!paused && visible && !hidden && !held}
      style={
        {
          '--self-color': self.color,
          '--partner-color': partner?.color ?? '#FF6B8A',
        } as CSSProperties
      }
      onPointerDownCapture={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onPointerLeave={() => setHeld(false)}
    >
      <div className="portrait-motion-track">
        <Link
          className="portrait-orb portrait-self"
          to="/profile"
          aria-label={`${copy.profile.title}: ${copy.posts.you}`}
        >
          <Avatar
            name={self.display_name}
            color={self.color}
            path={self.avatar_path}
            large
          />
        </Link>
        <Link
          className="portrait-orb portrait-partner"
          to="/chat"
          aria-label={copy.nav.chat}
        >
          <Avatar
            name={partner?.display_name ?? '?'}
            color={partner?.color ?? '#FF6B8A'}
            path={partner?.avatar_path}
            large
          />
        </Link>
      </div>
      <button
        className="orbit-motion-toggle"
        type="button"
        aria-label={paused ? 'Animate orbit' : 'Pause orbit'}
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
      >
        {paused ? (
          <Play size={13} aria-hidden="true" />
        ) : (
          <Pause size={13} aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

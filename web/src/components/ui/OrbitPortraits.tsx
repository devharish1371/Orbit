import { useRef, type CSSProperties } from 'react'
import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'
import { useSpace } from '@/hooks/useSpace'
import { copy } from '@/copy/en'

export function OrbitPortraits() {
  const { data } = useSpace()
  const scene = useRef<HTMLDivElement>(null)
  if (!data) return null
  const { self, partner } = data
  return (
    <div
      className="portrait-universe"
      ref={scene}
      style={
        {
          '--self-color': self.color,
          '--partner-color': partner?.color ?? '#FF6B8A',
        } as CSSProperties
      }
      onPointerMove={(event) => {
        if (
          event.pointerType !== 'mouse' ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        )
          return
        const box = event.currentTarget.getBoundingClientRect()
        scene.current?.style.setProperty(
          '--orbit-lean',
          `${((event.clientX - box.left) / box.width - 0.5) * 7}deg`,
        )
      }}
      onPointerLeave={() =>
        scene.current?.style.setProperty('--orbit-lean', '0deg')
      }
    >
      <div className="portrait-paths" aria-hidden="true">
        <svg viewBox="0 0 360 210" fill="none">
          <ellipse
            cx="180"
            cy="105"
            rx="152"
            ry="65"
            transform="rotate(-19 180 105)"
          />
          <ellipse
            cx="180"
            cy="105"
            rx="124"
            ry="88"
            transform="rotate(18 180 105)"
          />
          <path d="M72 143C135 165 216 59 284 62" strokeDasharray="2 7" />
          <circle cx="39" cy="80" r="4" />
          <circle cx="312" cy="139" r="3" />
          <path d="M263 166v12m-6-6h12M115 30v8m-4-4h8" />
        </svg>
      </div>
      <Link
        className="portrait-orb portrait-self"
        to="/profile"
        aria-label={copy.profile.title}
      >
        <Avatar
          name={self.display_name}
          color={self.color}
          path={self.avatar_path}
          large
        />
        <span>{copy.posts.you}</span>
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
        <span className="portrait-spark" aria-hidden="true">
          ✦
        </span>
      </Link>
      <span className="orbit-knot" aria-hidden="true">
        <Heart size={19} fill="currentColor" />
      </span>
    </div>
  )
}

import type { CSSProperties } from 'react'
export function CollectionMark({ tone }: { tone: string }) {
  return (
    <span
      className="collection-mark"
      data-tone={tone}
      aria-hidden="true"
      style={
        {
          '--collection-tilt':
            tone === 'tide' ? '-20deg' : tone === 'rose' ? '18deg' : '-8deg',
        } as CSSProperties
      }
    >
      <svg viewBox="0 0 100 80" fill="none">
        <path
          d="M12 47c0-18 51-36 71-22 22 16-33 47-56 38-21-8-5-40 25-43 30-3 41 19 27 34"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M21 25c24-14 63-1 60 18-3 20-52 30-64 13"
          stroke="currentColor"
          strokeOpacity=".25"
          strokeWidth="6"
        />
        <circle cx="27" cy="60" r="4" fill="currentColor" />
        <circle cx="79" cy="29" r="3" fill="currentColor" />
      </svg>
    </span>
  )
}

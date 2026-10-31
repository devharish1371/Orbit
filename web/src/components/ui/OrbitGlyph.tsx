import type { SVGProps } from 'react'

export type OrbitDestination = 'home' | 'map' | 'moments' | 'chat' | 'us'

/** Paired forms are the common grammar, including at navigation-icon size. */
export function OrbitGlyph({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: OrbitDestination }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {name === 'home' && (
        <>
          <ellipse
            cx="16"
            cy="16"
            rx="14"
            ry="7"
            transform="rotate(-32 16 16)"
            opacity=".5"
          />
          <circle className="glyph-body" cx="10" cy="19" r="5" />
          <circle className="glyph-body" cx="22" cy="12" r="5" />
        </>
      )}
      {name === 'map' && (
        <>
          <path d="M8 15c0 0-5-5-5-8a5 5 0 0 1 10 0c0 3-5 8-5 8ZM24 29s-5-5-5-8a5 5 0 0 1 10 0c0 3-5 8-5 8Z" />
          <circle cx="8" cy="7" r="1" />
          <circle cx="24" cy="21" r="1" />
          <path d="M8 20c0 6 10-10 16-10" strokeDasharray="2 4" />
        </>
      )}
      {name === 'moments' && (
        <>
          <rect
            x="4"
            y="3"
            width="20"
            height="24"
            rx="5"
            transform="rotate(-8 14 15)"
            opacity=".4"
          />
          <rect
            className="glyph-body"
            x="9"
            y="6"
            width="20"
            height="24"
            rx="5"
            transform="rotate(6 19 18)"
          />
          <path d="m12 23 5-6 4 4 3-3" />
          <circle cx="23" cy="13" r="2" />
        </>
      )}
      {name === 'chat' && (
        <>
          <path d="M4 20 2 25l7-2h9a9 9 0 0 0 0-18H11a9 9 0 0 0-7 15Z" />
          <path d="M15 26h7l7 3-2-6a8 8 0 0 0-1-10" opacity=".5" />
          <path d="M10 14h.1M15 14h.1M20 14h.1" strokeWidth="3" />
        </>
      )}
      {name === 'us' && (
        <>
          <ellipse
            className="glyph-body"
            cx="11"
            cy="16"
            rx="8"
            ry="11"
            transform="rotate(-25 11 16)"
          />
          <ellipse
            className="glyph-body"
            cx="21"
            cy="16"
            rx="8"
            ry="11"
            transform="rotate(25 21 16)"
          />
          <path d="m13 16 3 3 3-3" />
        </>
      )}
    </svg>
  )
}

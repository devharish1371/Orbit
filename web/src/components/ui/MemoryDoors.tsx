import { ArrowUpRight, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { memories as text } from '@/copy/memories'

export function MemoryDoors({ days }: { days: number | null }) {
  return (
    <div className="memory-doors">
      <Link className="memory-door door-keepsakes" to="/keepsakes">
        <div className="polaroid-stack" aria-hidden="true">
          <i />
          <i />
          <div>
            <svg viewBox="0 0 100 90" fill="none">
              <circle cx="73" cy="25" r="12" fill="var(--primary)" />
              <path
                d="M0 78L35 34L67 70L84 53L100 72V90H0Z"
                fill="var(--secondary)"
                opacity=".6"
              />
              <path
                d="M0 90L27 67L48 85L74 57L100 90Z"
                fill="var(--primary)"
                opacity=".55"
              />
            </svg>
          </div>
          <span>✦</span>
        </div>
        <span className="door-label">
          <strong>{text.keepsakes}</strong>
          <ArrowUpRight size={18} />
        </span>
      </Link>
      <Link className="memory-door door-capsules" to="/capsules">
        <div className="capsule-object" aria-hidden="true">
          <span className="capsule-note">
            <Heart size={22} />
          </span>
          <span className="capsule-pocket" />
          <span className="capsule-flap" />
          <span className="capsule-seal">
            <Heart size={14} fill="currentColor" />
          </span>
        </div>
        <span className="door-label">
          <strong>{text.capsules}</strong>
          <ArrowUpRight size={18} />
        </span>
      </Link>
      <Link className="memory-door door-timeline" to="/timeline">
        <div>
          <span className="eyebrow">{text.timeline}</span>
          {days !== null && (
            <p className="door-days">
              <strong>{days}</strong>
              <span>{text.daysTogether}</span>
            </p>
          )}
        </div>
        <div className="timeline-object" aria-hidden="true">
          <i />
          <i />
          <Heart size={25} />
        </div>
        <ArrowUpRight className="door-arrow" size={18} aria-hidden="true" />
      </Link>
    </div>
  )
}

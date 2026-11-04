import { CalendarDays, ArrowUpRight } from 'lucide-react'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { usePlans } from './usePlanning'
import { useNow } from '@/hooks/useNow'
import './plans.css'
export function NextPlan() {
  const plans = usePlans(),
    now = useNow()
  const next = plans.data
    ?.filter((p) => !p.cancelled && Date.parse(p.starts_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0]
  return (
    <Link className="next-plan" to="/plans">
      <span className="next-plan-symbol">
        <CalendarDays size={24} aria-hidden="true" />
      </span>
      <div>
        <span>Our plans</span>
        <strong>{next?.title ?? 'Plan something'}</strong>
        {next && (
          <time dateTime={next.starts_at}>
            {new Intl.DateTimeFormat('en-IN', {
              timeZone: next.timezone,
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(next.starts_at))}
          </time>
        )}
      </div>
      <ArrowUpRight size={19} aria-hidden="true" />
    </Link>
  )
}

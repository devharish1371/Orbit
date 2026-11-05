import { BackLink } from '@/components/ui/JourneyLink'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useAuth } from '@/hooks/useAuth'
import { JourneyCheckins } from './JourneyCheckins'
import { SpeedReminders } from './SpeedReminders'
import './safety.css'
export default function SafetyPage() {
  const { session } = useAuth()
  return (
    <div className="page safety-page" key={session?.user.id}>
      <BackLink fallback="/settings" />
      <SectionHeading title="Safety" kind="map" />
      <JourneyCheckins />
      <SpeedReminders />
      <details className="safety-details">
        <summary>Before you rely on a reminder</summary>
        <p>
          Timers need an online server confirmation. An overdue timer means no
          confirmed check-in, not an accident. Reminders can be delayed or
          missed and don’t call emergency services.
        </p>
        <p>
          Shared timers and overdue alerts require your consent, live sharing
          and your partner’s safety-notification opt-in. Quiet hours apply. Sent
          notifications cannot be recalled.
        </p>
      </details>
    </div>
  )
}

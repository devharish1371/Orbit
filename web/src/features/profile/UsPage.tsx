import { SectionHeading } from '@/components/ui/SectionHeading'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { ArrowUpRight, Heart } from 'lucide-react'
import { useSpace } from '@/hooks/useSpace'
import { Avatar } from '@/components/ui/Avatar'
import { copy } from '@/copy/en'

import { MemoryDoors } from '@/components/ui/MemoryDoors'
import { storyDays } from '@/lib/memories'
import { useNow } from '@/hooks/useNow'
import { DailyQuestion } from '@/features/memories/DailyQuestion'
export default function UsPage() {
  const { data } = useSpace()
  const now = useNow()
  if (!data) return null
  const { self, partner } = data
  return (
    <div className="page us-page">
      <SectionHeading title={copy.profile.hubTitle} kind="us" />
      <section className="us-bond">
        <div className="bond-portraits">
          <Link to="/profile" aria-label={copy.profile.edit}>
            <Avatar
              name={self.display_name}
              color={self.color}
              large
              path={self.avatar_path}
            />
          </Link>
          <span aria-hidden="true">
            <Heart size={17} />
          </span>
          {partner && (
            <Avatar
              name={partner.display_name}
              color={partner.color}
              large
              path={partner.avatar_path}
            />
          )}
        </div>
        <h2>
          {self.nickname || self.display_name} <em>&</em>{' '}
          {self.partner_nickname ||
            partner?.nickname ||
            partner?.display_name ||
            '…'}
        </h2>
        <div className="bond-actions">
          <Link className="card-link" to="/profile">
            {copy.profile.edit}
            <ArrowUpRight size={15} />
          </Link>
          <Link className="card-link" to="/settings">
            {copy.profile.shared}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
      <MemoryDoors
        days={
          data.couple.anniversary
            ? storyDays(
                data.couple.anniversary,
                new Date(now),
                data.couple.timezone,
              )
            : null
        }
      />
      <DailyQuestion />
    </div>
  )
}

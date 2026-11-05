import { SectionHeading } from '@/components/ui/SectionHeading'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { Heart } from 'lucide-react'
import { useSpace } from '@/hooks/useSpace'
import { Avatar } from '@/components/ui/Avatar'
import { copy } from '@/copy/en'

import { SharedShelf } from '@/features/personal/SharedShelf'
import { OnThisDay } from '@/features/personal/OnThisDay'
import { StatusLine } from '@/features/personal/StatusLine'
import { storyDays } from '@/lib/memories'
import { useNow } from '@/hooks/useNow'
import { NextPlan } from '@/features/plans/NextPlan'
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
          <div className="bond-person">
            <StatusLine user={self.user_id} editable bubble />
            <Link
              to={`/person/${self.user_id}`}
              aria-description="View profile"
            >
              <Avatar
                name={self.display_name}
                color={self.color}
                large
                path={self.avatar_path}
              />
              <strong>{self.nickname || self.display_name}</strong>
            </Link>
          </div>
          <span aria-hidden="true">
            <Heart size={17} />
          </span>
          {partner && (
            <div className="bond-person">
              <StatusLine user={partner.user_id} bubble />
              <Link
                to={`/person/${partner.user_id}`}
                aria-description="View profile"
              >
                <Avatar
                  name={partner.display_name}
                  color={partner.color}
                  large
                  path={partner.avatar_path}
                />
                <strong>
                  {self.partner_nickname ||
                    partner.nickname ||
                    partner.display_name}
                </strong>
              </Link>
            </div>
          )}
        </div>
      </section>
      <NextPlan />
      <OnThisDay />
      <SharedShelf
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
    </div>
  )
}

import { BackLink } from '@/components/ui/JourneyLink'
import { ThemePicker } from '@/components/ui/ThemePicker'
import { OrbitGlyph } from '@/components/ui/OrbitGlyph'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { copy } from '@/copy/en'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { validDate, validMeetUrl } from '@/config/couple.config'
import { Button } from '@/components/ui/Button'
import { StorageStatus } from '@/features/posts/StorageStatus'
import { ExportMemories } from '@/features/memories/ExportMemories'
import { PrivacySettings } from './PrivacySettings'

export default function SettingsPage() {
  const { data: space } = useSpace()
  const { client, signOut } = useAuth()
  const query = useQueryClient()
  const { theme, setTheme } = useTheme()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [themeBusy, setThemeBusy] = useState(false)
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!space) return
    const form = new FormData(event.currentTarget)
    const anniversary = String(form.get('anniversary') ?? '')
    const meet = String(form.get('meet') ?? '').trim()
    if (anniversary && !validDate(anniversary)) {
      setMessage(copy.settings.invalidDate)
      return
    }
    if (meet && !validMeetUrl(meet)) {
      setMessage(copy.settings.invalidMeet)
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const { error } = await client
        .from('couples')
        .update({ anniversary: anniversary || null, meet_url: meet || null })
        .eq('id', space.couple.id)
      if (error) throw error
      await query.invalidateQueries({ queryKey: ['space'] })
      setMessage(copy.common.saved)
    } catch {
      setMessage(copy.settings.failed)
    } finally {
      setBusy(false)
    }
  }
  async function changeTheme(value: Theme) {
    if (!space || themeBusy) return
    const previous = theme
    setThemeBusy(true)
    setTheme(value)
    try {
      const result = await client
        .from('members')
        .update({ theme_mode: value })
        .eq('user_id', space.self.user_id)
        .select('user_id')
        .single()
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['space'] })
    } catch {
      setTheme(previous)
      setMessage(copy.settings.failed)
    } finally {
      setThemeBusy(false)
    }
  }
  return (
    <div className="page settings-page">
      <BackLink fallback="/" />
      <SectionHeading title={copy.settings.title} kind="us" />
      <Link className="profile-settings-link" to="/tracking">
        <OrbitGlyph name="map" width={26} height={26} />
        <strong>{copy.tracking.title}</strong>
        <span aria-hidden="true">↗</span>
      </Link>
      <Link className="profile-settings-link" to="/notifications">
        <OrbitGlyph name="chat" width={26} height={26} />
        <strong>{copy.alerts.notificationTitle}</strong>
        <span aria-hidden="true">↗</span>
      </Link>
      <Link className="profile-settings-link" to="/activity">
        <OrbitGlyph name="moments" width={26} height={26} />
        <strong>{copy.alerts.activity}</strong>
        <span aria-hidden="true">↗</span>
      </Link>
      <section className="glass settings-section">
        <h2>{copy.common.theme}</h2>
        <ThemePicker
          value={theme}
          disabled={themeBusy}
          onChange={(value) => {
            void changeTheme(value)
          }}
        />
      </section>
      <Link className="profile-settings-link" to="/profile">
        <OrbitGlyph name="us" width={26} height={26} />
        <strong>{copy.profile.appearanceLink}</strong>
        <span aria-hidden="true">↗</span>
      </Link>
      <form
        className="glass settings-section"
        onSubmit={(event) => {
          void save(event)
        }}
        noValidate
      >
        <label htmlFor="anniversary">{copy.settings.anniversary}</label>
        <input
          id="anniversary"
          name="anniversary"
          type="date"
          defaultValue={space?.couple.anniversary ?? ''}
        />
        <label htmlFor="meet">{copy.settings.meet}</label>
        <input
          id="meet"
          name="meet"
          type="url"
          placeholder={copy.settings.meetPlaceholder}
          defaultValue={space?.couple.meet_url ?? ''}
        />

        <Button disabled={busy}>
          {busy ? copy.common.saving : copy.common.save}
        </Button>
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
      </form>
      <StorageStatus />
      <PrivacySettings />
      <ExportMemories />
      <details className="settings-about">
        <summary>About Orbit</summary>
        <p className="muted small">
          Version {__ORBIT_BUILD__ === 'local' ? 'Preview' : __ORBIT_BUILD__}
        </p>
      </details>
      <section className="settings-section">
        <Button
          className="button-secondary"
          type="button"
          onClick={() => {
            void signOut().catch(() => setMessage(copy.alerts.failed))
          }}
        >
          <LogOut size={17} aria-hidden="true" />
          {copy.common.signOut}
        </Button>
        <p className="muted small">{copy.settings.signOutHint}</p>
      </section>
    </div>
  )
}

import { ComfortControls } from './ComfortControls'
import { BackLink } from '@/components/ui/JourneyLink'
import { ThemePicker } from '@/components/ui/ThemePicker'
import { OrbitGlyph } from '@/components/ui/OrbitGlyph'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  LogOut,
  Palette,
  Heart,
  Shield,
  HardDrive,
  Smartphone,
} from 'lucide-react'
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
import { SettingsGroup } from './SettingsGroup'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'

export default function SettingsPage() {
  const { data: space } = useSpace()
  const { client, signOut } = useAuth()
  const query = useQueryClient()
  const { theme, setTheme } = useTheme()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [themeBusy, setThemeBusy] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false),
    [logoutBusy, setLogoutBusy] = useState(false)
  async function logout() {
    setLogoutBusy(true)
    setMessage('')
    try {
      await signOut()
    } catch {
      setMessage(copy.alerts.failed)
    } finally {
      setLogoutBusy(false)
    }
  }
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
      <Link className="profile-settings-link" to="/profile">
        <OrbitGlyph name="us" width={26} height={26} />
        <strong>{copy.profile.appearanceLink}</strong>
        <span aria-hidden="true">↗</span>
      </Link>
      <SettingsGroup title="Appearance" icon={<Palette size={21} />}>
        <section className="glass settings-section">
          <ThemePicker
            value={theme}
            disabled={themeBusy}
            onChange={(value) => {
              void changeTheme(value)
            }}
          />
        </section>
        <ComfortControls />
      </SettingsGroup>
      <SettingsGroup title="Our details" icon={<Heart size={21} />}>
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
      </SettingsGroup>
      <SettingsGroup title="Device & alerts" icon={<Smartphone size={21} />}>
        <Link className="profile-settings-link" to="/tracking">
          <OrbitGlyph name="map" width={26} height={26} />
          <strong>{copy.tracking.title}</strong>
          <span aria-hidden="true">↗</span>
        </Link>
        <Link className="profile-settings-link" to="/safety">
          <OrbitGlyph name="map" width={26} height={26} />
          <strong>Safety &amp; check-ins</strong>
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
        <Link className="profile-settings-link" to="/widget">
          <OrbitGlyph name="home" width={26} height={26} />
          <strong>Your widget</strong>
          <span aria-hidden="true">↗</span>
        </Link>
      </SettingsGroup>
      <SettingsGroup title="Privacy" icon={<Shield size={21} />}>
        <PrivacySettings heading={false} />
      </SettingsGroup>
      <SettingsGroup title="Storage & backup" icon={<HardDrive size={21} />}>
        <StorageStatus />
        <Link className="profile-settings-link" to="/keepsakes">
          <OrbitGlyph name="moments" width={24} height={24} />
          <strong>Keepsakes & phone copies</strong>
          <span aria-hidden="true">↗</span>
        </Link>
        <Link className="profile-settings-link" to="/archives">
          <HardDrive size={23} aria-hidden="true" />
          <strong>Cloud archives</strong>
          <span aria-hidden="true">↗</span>
        </Link>
        <ExportMemories />
      </SettingsGroup>
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
          disabled={logoutBusy}
          onClick={() => {
            setLogoutConfirm(true)
          }}
        >
          <LogOut size={17} aria-hidden="true" />
          {copy.common.signOut}
        </Button>
      </section>
      {logoutConfirm && (
        <ConfirmSheet
          title="Log out?"
          description="Pending texts and private phone copies will be removed from this device. Cloud-archived memories may have no cloud originals. Keep their separate ZIP backups before logging out. Sent messages stay saved."
          confirmLabel="Log out"
          onCancel={() => setLogoutConfirm(false)}
          onConfirm={() => {
            void logout()
          }}
          busy={logoutBusy}
          error={message}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { isAndroid, nativePrivacy, type PrivacyState } from '@/native/privacy'
export function PrivacySettings() {
  const [state, setState] = useState<PrivacyState | null>(null),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    if (isAndroid())
      void nativePrivacy
        .status()
        .then((value) => {
          if (active) setState(value)
        })
        .catch(() => {
          if (active)
            setMessage(
              'Privacy controls are unavailable. Update the Android app and try again.',
            )
        })
    return () => {
      active = false
    }
  }, [])
  async function configure(enabled: boolean, screenshots: boolean) {
    setBusy(true)
    setMessage('')
    try {
      setState(await nativePrivacy.configure({ enabled, screenshots }))
    } catch {
      setMessage(
        'The change wasn’t saved. Confirm your device screen lock to change app lock.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="glass memory-section">
      <h2>Privacy</h2>
      {!isAndroid() ? (
        <p className="muted small">
          App lock and screenshot protection are available in the Android app.
          On the web, use your device’s screen lock and sign out on shared
          devices.
        </p>
      ) : (
        <>
          {!state && !message && <p role="status">Loading privacy controls…</p>}
          {state && (
            <>
              <label className="privacy-toggle">
                <input
                  type="checkbox"
                  checked={state.enabled}
                  disabled={busy || !state.available}
                  onChange={(event) => {
                    void configure(event.target.checked, state.screenshots)
                  }}
                />
                Lock Orbit
              </label>
              <p className="muted small">
                Use device biometrics or your device PIN, pattern or password.
                Locks at launch and after one minute away. App previews and
                screenshots are hidden while app lock is enabled.
              </p>
              {!state.available && (
                <p className="muted small">
                  Set up a secure screen lock in Android Settings to enable
                  this.
                </p>
              )}
              <label className="privacy-toggle">
                <input
                  type="checkbox"
                  checked={state.screenshots}
                  disabled={busy}
                  onChange={(event) => {
                    void configure(state.enabled, event.target.checked)
                  }}
                />
                Block screenshots and app previews
              </label>
              <p className="muted small">
                This setting applies to this device. It doesn’t change your
                partner’s device or stop location sharing.
              </p>
            </>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  )
}

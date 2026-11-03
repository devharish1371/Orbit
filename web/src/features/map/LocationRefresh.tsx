import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Check, Clock3 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useNow } from '@/hooks/useNow'
import { nativeTracking, tracker } from '@/native/tracker'
import { useLocationSharing } from '@/features/location/LocationContext'
import { refreshState } from '@/lib/location-refresh'
import type { Database } from '@/lib/database.types'
import { useLiveData } from './LiveContext'
type Member = Database['public']['Tables']['members']['Row']
export function LocationRefresh({
  member,
  recordedAt,
}: {
  member: Member
  recordedAt?: string
}) {
  const { client } = useAuth()
  const { data } = useSpace()
  const live = useLiveData()
  const sharing = useLocationSharing()
  const query = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checkedAt, setNow] = useState(Date.now)
  const clock = useNow()
  const now = Math.max(clock, checkedAt)
  const own = member.user_id === data?.self.user_id
  const request = live.refreshRequests.data?.find(
    (row) => row.user_id === member.user_id,
  )
  const state = refreshState(request, member, recordedAt, now)
  const waiting = state === 'waiting'
  const refetchLocations = live.locations.refetch
  useEffect(() => {
    // Poll only during this bounded request; Realtime normally supplies the fix sooner.
    if (!waiting) return
    const tick = setInterval(() => {
      setNow(Date.now())
      if (!document.hidden) void refetchLocations()
    }, 5000)
    return () => clearInterval(tick)
  }, [waiting, refetchLocations])
  async function refresh() {
    setError('')
    setBusy(true)
    try {
      const result = await client.rpc('request_location_refresh', {
        p_user_id: member.user_id,
      })
      if (result.error) throw result.error
      query.setQueryData(
        ['location-refresh', data?.couple.id],
        (old: typeof live.refreshRequests.data) => [
          ...(old ?? []).filter((row) => row.user_id !== member.user_id),
          result.data,
        ],
      )
      setNow(Date.now())
      if (own && nativeTracking && sharing.enabled) {
        // A failure to wake locally does not discard the server request.
        await tracker.refreshLocation().catch(() => {})
      }
      const latest = await live.locations.refetch()
      if (latest.error) setError('Request sent. Reconnecting to the map…')
    } catch {
      setError(
        'Couldn’t request an update. Check your connection and try again.',
      )
    } finally {
      setBusy(false)
    }
  }
  const paused = member.share_mode === 'paused'
  const detail = paused
    ? 'Sharing is paused.'
    : error ||
      (own && !sharing.enabled && waiting
        ? 'Turn on location sharing on this device, or open Orbit on your sharing phone.'
        : waiting
          ? own
            ? 'Waiting for a fresh GPS fix…'
            : 'Waiting for their phone…'
          : state === 'updated'
            ? member.share_mode === 'surprise'
              ? 'Approximate location updated.'
              : 'New location received.'
            : state === 'unavailable'
              ? 'No new fix yet. The phone may be offline or unable to get GPS.'
              : member.share_mode === 'surprise'
                ? 'Updates stay approximate in Surprise mode.'
                : '')
  return (
    <div className="location-refresh" data-state={state}>
      <button
        className="location-refresh-button"
        title={detail || 'Refresh location'}
        aria-label={
          busy
            ? 'Requesting…'
            : waiting
              ? 'Updating location'
              : 'Refresh location'
        }
        disabled={paused || busy || waiting}
        onClick={() => {
          void refresh()
        }}
      >
        {state === 'updated' && !busy ? (
          <Check size={18} aria-hidden="true" />
        ) : (
          <RefreshCw
            size={18}
            aria-hidden="true"
            className={busy || waiting ? 'refresh-turning' : undefined}
          />
        )}
        <span className="sr-only">
          {busy
            ? 'Requesting…'
            : waiting
              ? 'Updating location'
              : 'Refresh location'}
        </span>
      </button>
      {detail && (
        <p role="status">
          {state === 'unavailable' && <Clock3 size={12} aria-hidden="true" />}
          <span className="sr-only">{detail}</span>
          <span aria-hidden="true">
            {error
              ? 'Try again'
              : paused
                ? 'Paused'
                : waiting
                  ? own && !sharing.enabled
                    ? 'Sharing is off'
                    : 'Waiting…'
                  : state === 'updated'
                    ? 'Updated'
                    : state === 'unavailable'
                      ? 'No new fix'
                      : ''}
          </span>
        </p>
      )}
    </div>
  )
}

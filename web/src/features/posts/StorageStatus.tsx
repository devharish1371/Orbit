import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { copy } from '@/copy/en'
import { useStorageUsage } from './usePosts'
export function StorageStatus() {
  const usage = useStorageUsage(),
    { client, session } = useAuth(),
    { data: space } = useSpace()
  const cleanup = useQuery({
    queryKey: ['cleanup-status', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const result = await client
        .from('retention_runs')
        .select('ran_at,error,posts_deleted,files_deleted')
        .order('ran_at', { ascending: false })
        .limit(1)
      if (result.error) throw result.error
      return result.data[0] ?? null
    },
  })
  const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)
  return (
    <section className="glass settings-section storage-status">
      <h2>{copy.posts.storageTitle}</h2>
      {usage.data ? (
        <>
          <div className="storage-number">
            <strong>{mb(usage.data.kept_bytes)} MB</strong>
            <span className="muted">
              / {mb(usage.data.quota_bytes)} MB {copy.posts.keepsakes}
            </span>
          </div>
          <meter
            min={0}
            max={usage.data.quota_bytes}
            value={usage.data.kept_bytes}
            aria-label={copy.posts.quota}
          />
          <p className="muted small">
            {copy.posts.totalStorage.replace(
              '{size}',
              mb(usage.data.total_bytes),
            )}
          </p>
          <p className="muted small">
            {copy.posts.expiringCount.replace(
              '{count}',
              String(usage.data.expiring_soon),
            )}
          </p>
        </>
      ) : (
        <button
          className="text-button"
          type="button"
          onClick={() => {
            void usage.refetch()
          }}
        >
          {usage.error ? copy.common.retry : copy.common.loading}
        </button>
      )}
      <p className="muted small">
        {cleanup.data
          ? `${copy.posts.lastCleanup}: ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: space?.couple.timezone }).format(new Date(cleanup.data.ran_at))}${cleanup.data.error ? ' · ' + copy.posts.cleanupDelayed : ''}`
          : cleanup.error
            ? copy.posts.cleanupUnavailable
            : copy.posts.cleanupPending}
      </p>
      <p className="muted small">{copy.posts.cleanupHint}</p>
    </section>
  )
}

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
function Photo({ path }: { path: string }) {
  const { client } = useAuth()
  const query = useQuery({
    queryKey: ['avatar', path],
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      const result = await client.storage
        .from('media')
        .createSignedUrl(path, 3600)
      if (result.error) throw result.error
      return result.data.signedUrl
    },
  })
  return query.data ? (
    <img
      src={query.data}
      alt=""
      decoding="async"
      loading="lazy"
      onError={(event) => {
        event.currentTarget.hidden = true
      }}
    />
  ) : null
}
export function Avatar({
  name,
  color,
  large = false,
  path,
}: {
  name: string
  color: string
  large?: boolean
  path?: string | null
}) {
  return (
    <span
      className={`avatar ${large ? 'avatar-large' : ''}`}
      style={{ '--person-color': color } as React.CSSProperties}
      aria-hidden="true"
    >
      {name.trim().slice(0, 1).toUpperCase()}
      {path && <Photo key={path} path={path} />}
    </span>
  )
}

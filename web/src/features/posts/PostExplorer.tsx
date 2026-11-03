import { Search, X } from 'lucide-react'
import { useState } from 'react'
export type PostFilter = 'all' | 'text' | 'photo' | 'voice'
export function PostExplorer({
  search,
  onSearch,
  kind,
  onKind,
  chat,
}: {
  search: string
  onSearch: (value: string) => void
  kind: PostFilter
  onKind: (value: PostFilter) => void
  chat: boolean
}) {
  const [open, setOpen] = useState(false)
  const active = !!search || kind !== 'all'
  return (
    <section
      className="post-explorer"
      aria-label={chat ? 'Find messages' : 'Explore moments'}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <button
        className="explorer-toggle"
        type="button"
        aria-expanded={open}
        aria-label={chat ? 'Find a message' : 'Find moments'}
        title={chat ? 'Find a message' : 'Find moments'}
        onClick={() => setOpen(!open)}
      >
        <Search size={17} />
        {active && <span className="filter-dot" aria-label="Filters applied" />}
      </button>
      <div className="explorer-panel" hidden={!open}>
        <div className="explorer-search">
          <Search size={18} aria-hidden="true" />
          <input
            autoComplete="off"
            type="search"
            aria-label={chat ? 'Search messages' : 'Search moments'}
            placeholder={chat ? 'Search messages' : 'Search moments'}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            maxLength={120}
          />
          {search && (
            <button
              type="button"
              className="icon-button"
              aria-label="Clear search"
              onClick={() => onSearch('')}
            >
              <X size={17} />
            </button>
          )}
        </div>
        <div className="explorer-kinds">
          {(['all', 'photo', 'voice', 'text'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => onKind(value)}
            >
              {
                {
                  all: 'Everything',
                  photo: 'Photos',
                  voice: 'Voice',
                  text: 'Text',
                }[value]
              }
            </button>
          ))}
        </div>
        {active && (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              onSearch('')
              onKind('all')
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  )
}

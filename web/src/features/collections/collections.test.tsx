import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CollectionEditor } from './CollectionEditor'
import { CollectionPicker } from './CollectionPicker'
import { CollectionShelf } from './CollectionShelf'
import { collectionIndex, type Collection, type CollectionDraft } from './model'
import type { Post } from '@/lib/posts'
const api = vi.hoisted(() => ({
  rpc: vi.fn(),
  links: {
    data: [] as { collection_id: string }[],
    isPending: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    client: { rpc: api.rpc },
    session: { user: { id: 'own' } },
  }),
}))
vi.mock('./useCollections', () => ({ useCollectionLinks: () => api.links }))
const collection = {
  id: '11111111-1111-4111-8111-111111111111',
  couple_id: 'couple',
  created_by: 'own',
  name: 'Our weekends',
  tone: 'iris',
  version: 3,
  archived: false,
  created_at: '2026-11-05T00:00:00Z',
  kept_count: 2,
} as Collection
const initial: CollectionDraft = {
  id: collection.id,
  owner: 'draft-owner',
  couple: 'draft-couple',
  version: null,
  name: 'Small trips',
  tone: 'tide',
  archived: false,
}
beforeEach(() => {
  api.rpc.mockReset()
  api.links.data = []
  api.links.isPending = false
  api.links.error = null
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
function Editor({ saved = vi.fn() }: { saved?: (id: string) => void }) {
  const [draft, setDraft] = useState(initial)
  return (
    <QueryClientProvider client={new QueryClient()}>
      <CollectionEditor
        draft={draft}
        onChange={setDraft}
        onClose={() => {}}
        onSaved={saved}
      />
    </QueryClientProvider>
  )
}
test('failed collection save retains typed name/color and retries with the same ID and original account', async () => {
  api.rpc
    .mockResolvedValueOnce({ error: new Error('offline') })
    .mockResolvedValueOnce({ data: { id: collection.id }, error: null })
  const saved = vi.fn()
  render(<Editor saved={saved} />)
  const user = userEvent.setup()
  expect(screen.getByLabelText('Name')).toHaveFocus()
  await user.type(screen.getByLabelText('Name'), ' together')
  await user.click(screen.getByRole('button', { name: 'Rose' }))
  await user.click(screen.getByRole('button', { name: 'Save collection' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Your changes are still here',
  )
  expect(screen.getByLabelText('Name')).toHaveValue('Small trips together')
  expect(screen.getByRole('button', { name: 'Rose' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await user.click(screen.getByRole('button', { name: 'Save collection' }))
  expect(api.rpc).toHaveBeenLastCalledWith(
    'save_memory_collection',
    expect.objectContaining({
      p_id: collection.id,
      p_expected_user: 'draft-owner',
      p_expected_couple: 'draft-couple',
      p_name: 'Small trips together',
      p_tone: 'rose',
      p_version: null,
    }),
  )
  expect(saved).toHaveBeenCalledWith(collection.id)
})
test('pending save blocks duplicate clicks and sheet dismissal', async () => {
  let finish!: (value: unknown) => void
  api.rpc.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  render(<Editor />)
  await userEvent.click(screen.getByRole('button', { name: 'Save collection' }))
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  expect(
    screen.getByRole('button', { name: 'Close new collection' }),
  ).toBeDisabled()
  await act(async () => finish({ data: { id: collection.id }, error: null }))
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Save collection' }),
    ).toBeEnabled(),
  )
})
test('picker binds the Keep instance and leaves failed membership unchanged for retry', async () => {
  api.rpc.mockResolvedValue({ error: { message: 'KEEPSAKE_CHANGED' } })
  const post = {
    id: 'post',
    couple_id: 'couple',
    keep: true,
    kept_at: '2026-11-05T00:00:00Z',
  } as Post
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CollectionPicker
        post={post}
        collections={[collection]}
        onClose={() => {}}
        onNew={() => {}}
      />
    </QueryClientProvider>,
  )
  const entry = screen.getByRole('button', { name: 'Our weekends, 2 saved' })
  await userEvent.click(entry)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This changed elsewhere',
  )
  expect(entry).toHaveAttribute('aria-pressed', 'false')
  expect(api.rpc).toHaveBeenCalledWith(
    'set_collection_post',
    expect.objectContaining({
      p_post: 'post',
      p_kept_at: post.kept_at,
      p_expected_user: 'own',
      p_expected_couple: 'couple',
      p_version: 3,
      p_add: true,
    }),
  )
})
test('picker cannot toggle while its actual membership is unknown', async () => {
  api.links.error = new Error('offline')
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CollectionPicker
        post={{ id: 'post' } as Post}
        collections={[collection]}
        onClose={() => {}}
        onNew={() => {}}
      />
    </QueryClientProvider>,
  )
  expect(
    screen.getByRole('button', { name: 'Our weekends, 2 saved' }),
  ).toBeDisabled()
  expect(api.rpc).not.toHaveBeenCalled()
})
test('only collection creators see edit/archive controls; archive returns to all without modifying posts', async () => {
  api.rpc.mockResolvedValue({
    data: { ...collection, archived: true, version: 4 },
    error: null,
  })
  const select = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CollectionShelf
        collections={[
          collection,
          {
            ...collection,
            id: 'partner',
            created_by: 'other',
            name: 'Their collection',
          },
        ]}
        selected={collection.id}
        loading={false}
        failed={false}
        onRetry={() => {}}
        onSelect={select}
        onNew={() => {}}
        onEdit={() => {}}
      />
    </QueryClientProvider>,
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Manage collections' }),
  )
  expect(
    screen.queryByRole('button', { name: 'Archive Their collection' }),
  ).not.toBeInTheDocument()
  await userEvent.click(
    screen.getByRole('button', { name: 'Archive Our weekends' }),
  )
  expect(select).toHaveBeenCalledWith(null)
  expect(api.rpc).toHaveBeenCalledExactlyOnceWith(
    'save_memory_collection',
    expect.objectContaining({
      p_version: 3,
      p_archived: true,
      p_expected_user: 'own',
    }),
  )
})
test('malformed summary counts fail closed instead of rendering fake collection totals', () => {
  expect(collectionIndex([collection])).toEqual([collection])
  for (const invalid of [
    null,
    {},
    [{ ...collection, kept_count: -1 }],
    [{ ...collection, tone: 'alien' }],
    [{ ...collection, version: null }],
  ])
    expect(() => collectionIndex(invalid)).toThrow('COLLECTIONS_UNAVAILABLE')
})

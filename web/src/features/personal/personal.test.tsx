import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import type { MemberStatus } from './model'
import { activeStatus, shortStatus } from './model'
import { StatusEditor } from './StatusEditor'
import { StatusLine } from './StatusLine'
import { SharedShelf } from './SharedShelf'
import { OnThisDay } from './OnThisDay'
const state = vi.hoisted(() => ({
  owner: 'me',
  now: Date.parse('2026-11-05T00:00:00Z'),
  rpc: vi.fn(),
  statuses: [] as unknown[],
  memories: [] as unknown[],
  collections: [] as unknown[],
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: state.owner } },
    client: { rpc: state.rpc },
  }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: state.owner },
      couple: { id: 'couple', timezone: 'Asia/Kolkata' },
    },
  }),
}))
vi.mock('@/hooks/useNow', () => ({ useNow: () => state.now }))
vi.mock('./usePersonal', () => ({
  useStatuses: () => ({ data: state.statuses }),
  useOnThisDay: () => ({ data: { pages: [state.memories] } }),
}))
vi.mock('@/features/collections/useCollections', () => ({
  useCollections: () => ({ data: state.collections }),
}))
vi.mock('@/hooks/usePrivateMedia', () => ({
  usePrivateMedia: () => ({ data: undefined }),
}))
vi.mock('@/features/posts/usePosts', () => ({
  usePostReactions: () => ({ data: [] }),
  useQuotedPosts: () => ({ data: [] }),
}))
const current: MemberStatus = {
  user_id: 'me',
  couple_id: 'couple',
  message: 'Coffee first',
  emoji: '☕',
  version: 3,
  expires_at: '2099-11-05T01:00:00Z',
}
function wrap(node: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  state.owner = 'me'
  state.statuses = []
  state.memories = []
  state.collections = []
  state.rpc.mockReset()
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
test('status disappears at its deadline and emoji-only status has a readable alternative', () => {
  const item = { ...current, expires_at: new Date(state.now).toISOString() }
  expect(activeStatus(item, state.now)).toBeNull()
  state.statuses = [item]
  const view = wrap(<StatusLine user="me" />)
  expect(view.container).toBeEmptyDOMElement()
  state.statuses = [{ ...current, message: '' }]
  view.rerender(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <StatusLine user="me" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(screen.getByText('Coffee')).toBeVisible()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
test('save carries original account/version and preserves changes after a stale-device failure', async () => {
  state.rpc.mockResolvedValue({ error: { message: 'STATUS_CHANGED' } })
  const close = vi.fn()
  wrap(<StatusEditor current={current} onClose={close} />)
  const user = userEvent.setup()
  const field = screen.getByLabelText('What’s up?')
  await user.clear(field)
  await user.type(field, 'After class')
  await user.click(screen.getByRole('button', { name: '24h' }))
  await user.click(screen.getByRole('button', { name: 'Save status' }))
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('another device'),
  )
  expect(field).toHaveValue('After class')
  expect(close).not.toHaveBeenCalled()
  expect(state.rpc).toHaveBeenCalledWith(
    'set_member_status',
    expect.objectContaining({
      p_expected_user: 'me',
      p_expected_couple: 'couple',
      p_version: 3,
      p_message: 'After class',
      p_hours: 24,
    }),
  )
})
test('clear uses a versioned empty tombstone and closes only after acknowledgement', async () => {
  let accept!: (value: unknown) => void
  state.rpc.mockImplementation(
    () =>
      new Promise((resolve) => {
        accept = resolve
      }),
  )
  const close = vi.fn()
  wrap(<StatusEditor current={current} onClose={close} />)
  await userEvent.click(screen.getByRole('button', { name: 'Clear status' }))
  expect(close).not.toHaveBeenCalled()
  expect(
    screen.getByRole('button', { name: 'Close your status' }),
  ).toBeDisabled()
  expect(state.rpc).toHaveBeenCalledWith(
    'set_member_status',
    expect.objectContaining({
      p_version: 3,
      p_hours: 0,
      p_emoji: '',
      p_message: '',
    }),
  )
  await act(async () => accept({ error: null, data: {} }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
})
test('a changed account cannot submit a draft from the prior account', async () => {
  const view = wrap(<StatusEditor current={current} onClose={vi.fn()} />)
  state.owner = 'other'
  view.rerender(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <StatusEditor current={current} onClose={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Save status' }))
  await waitFor(() => expect(screen.getByRole('alert')).toBeVisible())
  expect(state.rpc).not.toHaveBeenCalled()
})
test('the shared shelf links to the chosen active collection without archived items', () => {
  state.collections = [
    { id: 'one', name: 'Weekends', tone: 'iris', kept_count: 2 },
    {
      id: 'old',
      name: 'Archived',
      tone: 'tide',
      kept_count: 1,
      archived: true,
    },
  ]
  wrap(<SharedShelf days={359} />)
  expect(
    screen.getByRole('link', { name: 'Open Weekends, 2 saved' }),
  ).toHaveAttribute('href', '/keepsakes?collection=one')
  expect(screen.queryByText('Archived')).not.toBeInTheDocument()
  expect(screen.getByText('359 days together')).toBeVisible()
})
test('on-this-day stays absent without real results and uses actual retained years', () => {
  const view = wrap(<OnThisDay />)
  expect(view.container).toBeEmptyDOMElement()
  state.memories = [
    {
      id: 'past',
      created_at: '2025-11-05T00:00:00Z',
      kind: 'text',
      body: 'That rainy walk',
      thumb_path: null,
    },
  ]
  view.rerender(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OnThisDay />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(screen.getByText('2025')).toBeVisible()
  expect(
    screen.getByRole('link', {
      name: 'Open memory from 2025: That rainy walk',
    }),
  ).toHaveAttribute('href', '/on-this-day')
})

test('thought previews shorten four-word lines and keep a full-text profile destination', () => {
  expect(shortStatus('One two three')).toBe('One two three')
  expect(shortStatus('One two three four')).toBe('One two three…')
  state.statuses = [
    {
      ...current,
      user_id: 'partner',
      message: 'Taking the scenic route today',
    },
  ]
  wrap(<StatusLine user="partner" bubble />)
  expect(screen.getByText('Taking the scenic…')).toBeVisible()
  expect(
    screen.getByRole('link', {
      name: 'View full status: Taking the scenic route today',
    }),
  ).toHaveAttribute('href', '/person/partner')
})

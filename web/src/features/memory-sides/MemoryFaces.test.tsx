import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, test, vi } from 'vitest'
import type { Post } from '@/lib/posts'
import { MemoryFaces } from './MemoryFaces'
import { SideEditor } from './SideEditor'
const f = vi.hoisted(() => ({ rpc: vi.fn(), close: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    client: {
      rpc: (...args: unknown[]) => ({ abortSignal: () => f.rpc(...args) }),
    },
  }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: 'me', display_name: 'Rowan', color: '#A98EFF' },
      partner: { user_id: 'other', display_name: 'Sage' },
      couple: { id: 'room' },
    },
  }),
}))
vi.mock('@/hooks/usePrivateMedia', () => ({
  usePrivateMedia: () => ({
    data: 'https://fixture.invalid/voice',
    refetch: vi.fn(),
  }),
}))
vi.mock('@/features/posts/PostMedia', () => ({
  PostMedia: () => <div>Front photo</div>,
}))
vi.mock('@/components/ui/AudioPlayer', () => ({
  AudioPlayer: ({ label }: { label: string }) => <button>{label}</button>,
}))
vi.mock('@/features/posts/VoiceRecorder', () => ({
  VoiceRecorder: () => <button>Record your voice</button>,
}))
const post = {
  id: 'root',
  keep: true,
  kept_at: '2026-11-06T00:00:00Z',
  kind: 'photo',
  memory_sides: [
    {
      id: 'voice',
      author_id: 'other',
      kind: 'voice',
      body: 'The back',
      path: 'voice.webm',
      bytes: 3,
      version: 1,
    },
  ],
} as unknown as Post
function mount(element: React.ReactNode) {
  return render(
    <StrictMode>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: 0 } },
          })
        }
      >
        <MemoryRouter>{element}</MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
}
beforeEach(() => {
  f.close.mockReset()
  f.rpc.mockReset().mockResolvedValue({ data: post, error: null })
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
test('explicit turn reveals the voice without autoplay; front returns and profiles remain linked', async () => {
  const u = userEvent.setup()
  mount(<MemoryFaces post={post} />)
  expect(screen.queryByText('The back')).not.toBeInTheDocument()
  await u.click(screen.getByRole('button', { name: 'Voices & sides' }))
  expect(screen.getByText('The back')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Voice on this memory' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Sage' })).toHaveAttribute(
    'href',
    '/person/other',
  )
  await u.click(screen.getByRole('button', { name: 'Front' }))
  expect(screen.queryByText('The back')).not.toBeInTheDocument()
})
test('failed save preserves words and request identity, then closes on acknowledged retry in StrictMode', async () => {
  const u = userEvent.setup()
  f.rpc.mockResolvedValueOnce({ error: { message: 'offline' } })
  mount(<SideEditor post={post} onClose={f.close} />)
  await u.type(screen.getByLabelText('Your words'), 'Our side')
  await u.click(screen.getByRole('button', { name: 'Save your side' }))
  await screen.findByRole('alert')
  expect(f.close).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Your words')).toHaveValue('Our side')
  const first = f.rpc.mock.calls[0]?.[1]
  await u.click(screen.getByRole('button', { name: 'Save your side' }))
  await waitFor(() => expect(f.close).toHaveBeenCalledOnce())
  expect(f.rpc.mock.calls[1]?.[1]).toEqual(first)
  expect(first).toMatchObject({
    p_expected_user: 'me',
    p_expected_couple: 'room',
    p_kept_at: post.kept_at,
    p_version: null,
    p_side: expect.objectContaining({ kind: 'text', body: 'Our side' }),
  })
})
test('removing an existing side requires confirmation and sends only its owner version', async () => {
  const u = userEvent.setup()
  mount(
    <SideEditor
      post={post}
      own={
        {
          id: 'mine',
          author_id: 'me',
          kind: 'text',
          body: 'Words',
          version: 4,
        } as never
      }
      onClose={f.close}
    />,
  )
  await u.click(screen.getByRole('button', { name: 'Remove your side' }))
  expect(f.rpc).not.toHaveBeenCalled()
  await u.click(
    screen.getAllByRole('button', { name: 'Remove your side' }).at(-1)!,
  )
  await waitFor(() =>
    expect(f.rpc).toHaveBeenCalledWith(
      'write_memory_side',
      expect.objectContaining({
        p_version: 4,
        p_side: null,
        p_expected_user: 'me',
      }),
    ),
  )
})

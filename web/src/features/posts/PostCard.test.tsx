import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, vi } from 'vitest'
import { PostCard } from './PostCard'
import type { Post } from '@/lib/posts'
const f = vi.hoisted(() => ({
  rpc: vi.fn().mockResolvedValue({ error: null }),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ client: { rpc: f.rpc }, session: { user: { id: 'me' } } }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { display_name: 'Me' },
      partner: { display_name: 'Partner' },
      couple: { timezone: 'Asia/Kolkata' },
    },
  }),
}))
test('chat keeps reactions and unsend behind message options, with confirmation before unsend', async () => {
  const now = Date.now(),
    post = {
      id: 'message',
      author_id: 'me',
      channel: 'chat',
      kind: 'text',
      body: 'Hello',
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + 86400000).toISOString(),
      keep: false,
      lat: null,
      lng: null,
    } as Post
  const view = render(
    <QueryClientProvider client={new QueryClient()}>
      <PostCard post={post} reactions={[]} now={now} />
    </QueryClientProvider>,
  )
  expect(screen.queryByRole('button', { name: '❤️' })).not.toBeInTheDocument()
  fireEvent.contextMenu(view.container.querySelector('article')!)
  await userEvent.click(screen.getByRole('button', { name: '❤️' }))
  await waitFor(() =>
    expect(f.rpc).toHaveBeenCalledWith('set_post_reaction', {
      p_id: 'message',
      p_emoji: '❤️',
    }),
  )
  f.rpc.mockClear()
  await userEvent.click(screen.getByRole('button', { name: 'Message options' }))
  await userEvent.click(screen.getByRole('button', { name: 'Unsend' }))
  expect(f.rpc).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Unsend for both' }))
  await waitFor(() =>
    expect(f.rpc).toHaveBeenCalledWith('request_unsend', { p_id: 'message' }),
  )
})

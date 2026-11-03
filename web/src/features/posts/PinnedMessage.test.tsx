import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, test, vi } from 'vitest'
import { PinnedMessage } from './PinnedMessage'
import type { Post } from '@/lib/posts'
const rpc = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ client: { rpc } }) }))
beforeEach(() => rpc.mockClear())
const pin = {
  post_id: 'pinned',
  expires_at: new Date(Date.now() + 3600000).toISOString(),
}
const post = {
  id: 'pinned',
  body: 'Dinner at six',
  keep: false,
  unsent_at: null,
  expires_at: new Date(Date.now() + 7200000).toISOString(),
} as Post
test('a shared pin opens its message and removes only that pin when dismissed', async () => {
  const open = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PinnedMessage pin={pin} post={post} onOpen={open} />
    </QueryClientProvider>,
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Open pinned message: Dinner at six' }),
  )
  expect(open).toHaveBeenCalledWith('pinned')
  expect(rpc).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Unpin message' }))
  await waitFor(() =>
    expect(rpc).toHaveBeenCalledWith('set_chat_pin', {
      p_post_id: 'pinned',
      p_remove: true,
    }),
  )
})
test('an expired pin or unavailable original never displays cached content', () => {
  const view = render(
    <QueryClientProvider client={new QueryClient()}>
      <PinnedMessage
        pin={{ ...pin, expires_at: new Date(Date.now() - 1).toISOString() }}
        post={post}
        onOpen={vi.fn()}
      />
    </QueryClientProvider>,
  )
  expect(screen.queryByText('Dinner at six')).not.toBeInTheDocument()
  view.rerender(
    <QueryClientProvider client={new QueryClient()}>
      <PinnedMessage
        pin={pin}
        post={{ ...post, unsent_at: new Date().toISOString() }}
        onOpen={vi.fn()}
      />
    </QueryClientProvider>,
  )
  expect(screen.queryByText('Dinner at six')).not.toBeInTheDocument()
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { PostCard } from './PostCard'
import type { Post } from '@/lib/posts'
const f = vi.hoisted(() => ({
  rpc: vi.fn().mockResolvedValue({ error: null }),
}))
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
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
afterEach(() => {
  cleanup()
  f.rpc.mockClear()
})
test('Moments keeps the reaction palette out of the feed until requested', async () => {
  const now = Date.now(),
    post = {
      id: 'moment',
      author_id: 'other',
      channel: 'moment',
      kind: 'text',
      body: 'The long way home.',
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
  await userEvent.click(screen.getByRole('button', { name: 'React' }))
  expect(screen.getByRole('button', { name: '❤️' })).toBeVisible()
  expect(f.rpc).not.toHaveBeenCalled()
  fireEvent.keyDown(view.container.querySelector('article')!, { key: 'Escape' })
  expect(screen.queryByRole('button', { name: '❤️' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'React' })).toHaveFocus()
  await userEvent.click(screen.getByRole('button', { name: 'React' }))
  await userEvent.click(screen.getByRole('button', { name: '❤️' }))
  await waitFor(() =>
    expect(f.rpc).toHaveBeenCalledWith('set_post_reaction', {
      p_id: 'moment',
      p_emoji: '❤️',
    }),
  )
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: '❤️' }),
    ).not.toBeInTheDocument(),
  )
})
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
  await userEvent.click(screen.getByRole('button', { name: 'Message options' }))
  screen.getByRole('button', { name: 'Copy text' }).focus()
  await userEvent.keyboard('{Escape}')
  expect(screen.getByRole('button', { name: 'Message options' })).toHaveFocus()
  expect(
    screen.queryByRole('button', { name: 'Copy text' }),
  ).not.toBeInTheDocument()
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

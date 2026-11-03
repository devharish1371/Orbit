import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { ReplyPreview } from './ReplyPreview'
import type { Post } from '@/lib/posts'
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: { self: { user_id: 'me' }, partner: { display_name: 'Partner' } },
  }),
}))
const item = (values: Partial<Post> = {}) =>
  ({
    id: 'original',
    author_id: 'other',
    kind: 'text',
    body: 'A private original',
    keep: false,
    unsent_at: null,
    expires_at: new Date(Date.now() + 60000).toISOString(),
    ...values,
  }) as Post
test('a visible quote identifies the author and opens its original', async () => {
  const open = vi.fn()
  render(<ReplyPreview post={item()} onOpen={open} />)
  await userEvent.click(
    screen.getByRole('button', {
      name: /Open quoted message from Partner.*A private original/,
    }),
  )
  expect(open).toHaveBeenCalledWith('original')
})
test('expired and unsent originals never expose cached quote text', () => {
  const view = render(
    <ReplyPreview
      post={item({ expires_at: new Date(Date.now() - 1).toISOString() })}
    />,
  )
  expect(screen.queryByText('A private original')).not.toBeInTheDocument()
  expect(screen.getByText('Original message unavailable')).toBeVisible()
  view.rerender(
    <ReplyPreview
      post={item({ keep: true, unsent_at: new Date().toISOString() })}
    />,
  )
  expect(screen.queryByText('A private original')).not.toBeInTheDocument()
})

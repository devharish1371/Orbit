import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import type { Post } from '@/lib/posts'
import { PostMedia } from './PostMedia'
vi.mock('./usePosts', () => ({
  useSignedMedia: () => ({ data: '/fixture-photo.webp' }),
}))
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
})
const photo = {
  id: 'photo',
  kind: 'photo',
  media_path: 'fixture.webp',
  created_at: '2026-11-01T00:00:00Z',
  body: 'A saved photo',
} as Post
test('viewer zooms, closes and returns focus to its original photo', async () => {
  const user = userEvent.setup()
  render(<PostMedia post={photo} />)
  const trigger = screen.getByRole('button', { name: 'Open full photo' })
  await user.click(trigger)
  expect(screen.getByRole('dialog', { name: 'Shared photo' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Zoom photo' }))
  expect(screen.getByRole('button', { name: 'Fit photo' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await user.click(screen.getByRole('button', { name: 'Close photo' }))
  expect(trigger).toHaveFocus()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
test('cancel dismissal restores the source photo instead of leaving focus behind', async () => {
  render(<PostMedia post={photo} />)
  const trigger = screen.getByRole('button', { name: 'Open full photo' })
  await userEvent.click(trigger)
  fireEvent(
    screen.getByRole('dialog', { name: 'Shared photo' }),
    new Event('cancel', { bubbles: false, cancelable: true }),
  )
  expect(trigger).toHaveFocus()
})

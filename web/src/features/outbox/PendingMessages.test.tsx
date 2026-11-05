import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { OutboxContext } from './OutboxContext'
import { PendingMessages } from './PendingMessages'
import { pendingText } from './model'
test('pending copies remain distinct from sent messages and discard requires confirmation', async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
  const item = pendingText({
    id: crypto.randomUUID(),
    author: '11111111-1111-4111-8111-111111111111',
    couple: '22222222-2222-4222-8222-222222222222',
    body: 'Disposable pending',
    channel: 'chat',
    kind: 'text',
    ttl: 24,
    keep: false,
    place: null,
  })
  const discard = vi.fn().mockResolvedValue(undefined),
    retry = vi.fn()
  const value = {
    items: [item],
    sendingId: null,
    enqueue: vi.fn(),
    preview: vi.fn(),
    discard,
    retry,
  }
  const view = render(
    <OutboxContext.Provider value={value}>
      <PendingMessages sentIds={[]} />
    </OutboxContext.Provider>,
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Retry pending message' }),
  )
  expect(retry).toHaveBeenCalledWith(item.id)
  await userEvent.click(
    screen.getByRole('button', { name: 'Discard pending copy' }),
  )
  expect(discard).not.toHaveBeenCalled()
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Discard pending copy',
    }),
  )
  await waitFor(() => expect(discard).toHaveBeenCalledWith(item.id))
  view.rerender(
    <OutboxContext.Provider value={value}>
      <PendingMessages sentIds={[item.id]} />
    </OutboxContext.Provider>,
  )
  expect(screen.queryByText('Disposable pending')).not.toBeInTheDocument()
  view.rerender(
    <OutboxContext.Provider
      value={{
        ...value,
        items: [{ ...item, expiresAt: item.queuedAt - 60000 }],
      }}
    >
      <PendingMessages sentIds={[]} />
    </OutboxContext.Provider>,
  )
  expect(screen.queryByText('Disposable pending')).not.toBeInTheDocument()
})

test('pending media previews remain local, preserve captions and return focus without sending', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:pending-photo')
  URL.revokeObjectURL = vi.fn()
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
  const base = pendingText({
    id: crypto.randomUUID(),
    author: '11111111-1111-4111-8111-111111111111',
    couple: '22222222-2222-4222-8222-222222222222',
    channel: 'chat',
    kind: 'text',
    body: 'Waiting here',
    ttl: 24,
    keep: false,
    place: null,
  })
  const { version: _, ...fields } = base
  void _
  const item = {
    ...fields,
    version: 2 as const,
    kind: 'photo' as const,
    assets: [],
    photos: [
      {
        id: crypto.randomUUID(),
        caption: 'One',
        media: 0,
        thumb: 1,
        width: 2,
        height: 2,
      },
      {
        id: crypto.randomUUID(),
        caption: 'Two',
        media: 2,
        thumb: 3,
        width: 2,
        height: 2,
      },
    ],
  }
  const preview = vi.fn().mockResolvedValue({
      id: item.id,
      kind: 'photo',
      body: 'Waiting here',
      photos: item.photos.map((p) => ({
        id: p.id,
        caption: p.caption,
        attachment: {
          blob: new Blob(['photo'], { type: 'image/webp' }),
          extension: 'webp',
          width: 2,
          height: 2,
        },
      })),
    }),
    retry = vi.fn()
  render(
    <OutboxContext.Provider
      value={{
        items: [item],
        sendingId: null,
        preview,
        retry,
        enqueue: vi.fn(),
        discard: vi.fn(),
      }}
    >
      <PendingMessages sentIds={[]} />
    </OutboxContext.Provider>,
  )
  const trigger = screen.getByRole('button', {
    name: 'Preview pending 2 photos',
  })
  await userEvent.click(trigger)
  expect(await screen.findByText('One')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Next photo' }))
  expect(await screen.findByText('Two')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Close photo' }))
  expect(trigger).toHaveFocus()
  expect(retry).not.toHaveBeenCalled()
  expect(URL.revokeObjectURL).toHaveBeenCalled()
})

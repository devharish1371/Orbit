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

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { DialogSheet } from './DialogSheet'
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
test('sheet supplies an accessible name, Escape dismissal and return focus', async () => {
  const trigger = document.createElement('button')
  trigger.textContent = 'Reply'
  document.body.append(trigger)
  trigger.focus()
  const close = vi.fn()
  const view = render(
    <DialogSheet title="Replies" onClose={close}>
      <input aria-label="Reply" />
    </DialogSheet>,
  )
  expect(screen.getByRole('dialog', { name: 'Replies' })).toBeVisible()
  fireEvent(
    screen.getByRole('dialog'),
    new Event('cancel', { bubbles: true, cancelable: true }),
  )
  expect(close).toHaveBeenCalledTimes(1)
  await userEvent.click(screen.getByRole('button', { name: 'Close replies' }))
  expect(close).toHaveBeenCalledTimes(2)
  view.unmount()
  expect(document.activeElement).toBe(trigger)
  trigger.remove()
})
test('a pending operation prevents Escape and close dismissal until it settles', async () => {
  const close = vi.fn()
  const view = render(
    <DialogSheet title="Confirm" onClose={close} dismissible={false}>
      Pending
    </DialogSheet>,
  )
  fireEvent(
    screen.getByRole('dialog'),
    new Event('cancel', { cancelable: true }),
  )
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Close confirm' })).toBeDisabled()
  view.rerender(
    <DialogSheet title="Confirm" onClose={close}>
      Ready
    </DialogSheet>,
  )
  fireEvent(
    screen.getByRole('dialog'),
    new Event('cancel', { cancelable: true }),
  )
  expect(close).toHaveBeenCalledOnce()
})

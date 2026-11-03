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

import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { ImageViewer } from './ImageViewer'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
test('a failed full image keeps its preview and supports retry, zoom and focus-safe dismissal', async () => {
  const retry = vi.fn()
  function Fixture() {
    const trigger = useRef<HTMLButtonElement>(null),
      [open, setOpen] = useState(false)
    return (
      <>
        <button ref={trigger} onClick={() => setOpen(true)}>
          Open
        </button>
        {open && (
          <ImageViewer
            title="A photo"
            alt="Sky"
            src="/full.webp"
            preview={{ src: '/small.webp', width: 1200, height: 800 }}
            transitionName="orbit-photo-test"
            returnFocus={trigger}
            onRetry={retry}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    )
  }
  render(<Fixture />)
  await userEvent.click(screen.getByRole('button', { name: 'Open' }))
  const dialog = screen.getByRole('dialog'),
    full = within(dialog).getByRole('img', { name: 'Sky' })
  fireEvent.error(full)
  expect(
    within(dialog).getByRole('button', { name: 'Retry photo' }),
  ).toBeVisible()
  expect(dialog.querySelector('.viewer-preview')).toHaveAttribute(
    'src',
    '/small.webp',
  )
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Retry photo' }),
  )
  expect(retry).toHaveBeenCalledOnce()
  fireEvent.load(within(dialog).getByRole('img', { name: 'Sky' }))
  expect(
    within(dialog).queryByRole('button', { name: 'Retry photo' }),
  ).not.toBeInTheDocument()
  expect(within(dialog).getByRole('img', { name: 'Sky' })).toBeVisible()
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Zoom photo' }),
  )
  expect(
    within(dialog).getByRole('button', { name: 'Fit photo' }),
  ).toHaveAttribute('aria-pressed', 'true')
  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus()
})

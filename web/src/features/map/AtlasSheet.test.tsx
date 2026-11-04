import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { AtlasSheet } from './AtlasSheet'
function Fixture() {
  const [expanded, setExpanded] = useState(false)
  return (
    <AtlasSheet
      expanded={expanded}
      onExpand={setExpanded}
      summary={<button>Person</button>}
    >
      <button>Journey</button>
    </AtlasSheet>
  )
}
test('the sheet has a keyboard/click alternative to dragging and hides collapsed body controls', async () => {
  render(<Fixture />)
  expect(
    screen.queryByRole('button', { name: 'Journey' }),
  ).not.toBeInTheDocument()
  await userEvent.click(
    screen.getByRole('button', { name: 'Expand map details' }),
  )
  expect(screen.getByRole('button', { name: 'Journey' })).toBeVisible()
  const handle = screen.getByRole('button', { name: 'Collapse map details' })
  handle.focus()
  await userEvent.keyboard('{Enter}')
  expect(
    screen.queryByRole('button', { name: 'Journey' }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Expand map details' }),
  ).toHaveFocus()
})
test('a handle drag snaps once, preserves scrolling and leaves keyboard activation available', async () => {
  vi.stubGlobal('PointerEvent', MouseEvent)
  render(<Fixture />)
  const handle = screen.getByRole('button', { name: 'Expand map details' })
  handle.setPointerCapture = vi.fn()
  fireEvent.pointerDown(handle, { clientY: 200, button: 0 })
  fireEvent.pointerCancel(handle)
  expect(handle).toHaveAttribute('aria-expanded', 'false')
  // A real primary pointer carries these properties; preserve them in jsdom's MouseEvent shim.
  const pointer = (type: string, y: number) => {
    const event = new MouseEvent(type, { bubbles: true, clientY: y, button: 0 })
    Object.defineProperties(event, {
      isPrimary: { value: true },
      pointerId: { value: 1 },
    })
    fireEvent(handle, event)
  }
  pointer('pointerdown', 240)
  pointer('pointerup', 170)
  fireEvent.click(handle, { detail: 1 })
  expect(handle).toHaveAttribute('aria-expanded', 'true')
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Journey' }), {
    clientY: 170,
  })
  fireEvent.pointerUp(screen.getByRole('button', { name: 'Journey' }), {
    clientY: 240,
  })
  expect(handle).toHaveAttribute('aria-expanded', 'true')
  pointer('pointerdown', 170)
  pointer('pointerup', 240)
  fireEvent.click(handle, { detail: 1 })
  expect(handle).toHaveAttribute('aria-expanded', 'false')
  pointer('pointerdown', 240)
  pointer('pointerup', 170)
  // Some touch hosts suppress the trailing click after a drag. Enter must still work.
  handle.focus()
  await userEvent.keyboard('{Enter}')
  expect(handle).toHaveAttribute('aria-expanded', 'false')
  vi.unstubAllGlobals()
})

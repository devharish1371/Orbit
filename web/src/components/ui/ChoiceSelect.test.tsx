import { afterEach, beforeEach, expect, test } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ChoiceSelect } from './ChoiceSelect'
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
afterEach(cleanup)
function Harness() {
  const [value, setValue] = useState('day')
  return (
    <form data-testid="form">
      <ChoiceSelect
        label="Retention"
        name="retention"
        value={value}
        onChange={setValue}
        options={[
          { value: 'day', label: 'One day' },
          { value: 'blocked', label: 'Unavailable', disabled: true },
          { value: 'week', label: 'One week' },
        ]}
      />
    </form>
  )
}
test('choosing an option updates the form and returns focus to its trigger', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Retention: One day' })
  await user.click(trigger)
  expect(screen.getByRole('dialog', { name: 'Retention' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'One day' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'One week' }))
  expect(
    new FormData(screen.getByTestId('form') as HTMLFormElement).get(
      'retention',
    ),
  ).toBe('week')
  expect(trigger).toHaveFocus()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
})
test('arrow navigation skips disabled choices and closing keeps the current value', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Retention: One day' })
  await user.click(trigger)
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('button', { name: 'One week' })).toHaveFocus()
  await user.keyboard('{Home}')
  expect(screen.getByRole('button', { name: 'One day' })).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: 'Close choices' }))
  expect(trigger).toHaveFocus()
  expect(
    new FormData(screen.getByTestId('form') as HTMLFormElement).get(
      'retention',
    ),
  ).toBe('day')
})

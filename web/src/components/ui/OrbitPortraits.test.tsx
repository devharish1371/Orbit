import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { OrbitPortraits } from './OrbitPortraits'
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { display_name: 'You', color: '#7c5cff' },
      partner: { display_name: 'Partner', color: '#ff6b8a' },
    },
  }),
}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
test('orbit can pause and resume, stays still during touch and when the document is hidden', async () => {
  const user = userEvent.setup()
  const view = render(
    <MemoryRouter>
      <OrbitPortraits />
    </MemoryRouter>,
  )
  const scene = view.container.querySelector('.portrait-universe')!
  expect(scene).toHaveAttribute('data-running', 'true')
  await user.click(screen.getByRole('button', { name: 'Pause orbit' }))
  expect(scene).toHaveAttribute('data-running', 'false')
  await user.click(screen.getByRole('button', { name: 'Animate orbit' }))
  expect(scene).toHaveAttribute('data-running', 'true')
  fireEvent.pointerDown(screen.getByRole('link', { name: 'Chat' }))
  expect(scene).toHaveAttribute('data-running', 'false')
  fireEvent.pointerCancel(scene)
  expect(scene).toHaveAttribute('data-running', 'true')
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  fireEvent(document, new Event('visibilitychange'))
  expect(scene).toHaveAttribute('data-running', 'false')
})

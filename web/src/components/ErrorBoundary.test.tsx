import { expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppBoundary } from './ErrorBoundary'
const update = vi.hoisted(() => vi.fn())
vi.mock('./UpdatePrompt', () => ({
  UpdatePrompt: () => <button onClick={update}>Update Orbit</button>,
}))
it('keeps the update action usable when a lazy route fails', () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  function BrokenRoute(): never {
    throw new TypeError('Failed to fetch dynamically imported module')
  }
  try {
    render(
      <AppBoundary>
        <BrokenRoute />
      </AppBoundary>,
    )
    expect(
      screen.getByText(
        'We couldn’t load your space. Check your connection and try again.',
      ),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Update Orbit' }))
    expect(update).toHaveBeenCalledOnce()
  } finally {
    errors.mockRestore()
  }
})

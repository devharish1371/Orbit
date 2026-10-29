import { act, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { OfflineBanner } from './OfflineBanner'
test('announces offline state and clears it on reconnect', () => {
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  render(<OfflineBanner />)
  expect(screen.queryByRole('status')).toBeNull()
  online.mockReturnValue(false)
  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
  expect(screen.getByRole('status')).toHaveTextContent('You’re offline')
  online.mockReturnValue(true)
  act(() => {
    window.dispatchEvent(new Event('online'))
  })
  expect(screen.queryByRole('status')).toBeNull()
  online.mockRestore()
})

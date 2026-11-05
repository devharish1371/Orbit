import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, vi } from 'vitest'
import { FlowProvider } from '@/app/FlowProvider'
import { Composer } from './Composer'
const calls = vi.hoisted(() => ({ begin: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ client: {}, session: { user: { id: 'self' } } }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: 'self' },
      couple: { id: 'couple', retention_days: 7 },
    },
  }),
}))
vi.mock('@/features/map/LiveContext', () => ({
  useLiveData: () => ({ locations: { data: [] }, places: { data: [] } }),
}))
vi.mock('@/lib/media', () => ({
  beginVoice: calls.begin,
  preparePhoto: vi.fn(),
}))
test('the media shelf preserves typed text, never starts the microphone on mode selection, and cancel restores typing', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FlowProvider>
        <MemoryRouter>
          <Composer
            channel="chat"
            onTyping={() => {}}
            onStopTyping={() => {}}
          />
        </MemoryRouter>
      </FlowProvider>
    </QueryClientProvider>,
  )
  const input = screen.getByRole('textbox', { name: 'Your note' })
  await userEvent.type(input, 'Not sent yet')
  await userEvent.click(
    screen.getByRole('button', { name: 'More message options' }),
  )
  expect(screen.getByRole('group', { name: 'Message tools' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Choose photos' })).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Voice note' }))
  expect(calls.begin).not.toHaveBeenCalled()
  expect(input).toHaveValue('Not sent yet')
  expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Cancel voice note' }),
  )
  expect(input).toHaveValue('Not sent yet')
  expect(input).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled()
})

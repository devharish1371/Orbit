import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, vi } from 'vitest'
import { AttentionActions } from './AttentionActions'
const f = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ client: { rpc: f.rpc } }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({ data: { partner: { user_id: 'partner' } } }),
}))
function mount() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AttentionActions />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
test('urgent attention needs its explicit in-app confirmation and persists through the ownership RPC', async () => {
  f.rpc.mockReset().mockResolvedValue({ error: null })
  mount()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Need you' }))
  expect(f.rpc).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Send urgent alert' }))
  await waitFor(() =>
    expect(f.rpc).toHaveBeenCalledWith('send_attention', {
      p_type: 'sos',
      p_id: expect.any(String),
    }),
  )
  expect(await screen.findByRole('status')).toHaveTextContent(
    'notification will be attempted',
  )
})
test('a server cooldown is shown without claiming that delivery occurred', async () => {
  f.rpc
    .mockReset()
    .mockResolvedValue({ error: { message: 'ATTENTION_COOLDOWN' } })
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Thinking of you' }))
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Give them a moment',
  )
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, test, vi } from 'vitest'
import CapsulesPage from './CapsulesPage'
const rpc = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ client: { rpc }, session: { user: { id: 'me' } } }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({ data: { couple: { timezone: 'Asia/Kolkata' } } }),
}))
vi.mock('./useMemories', () => ({
  useCapsules: () => ({
    data: {
      pages: [
        [
          {
            id: 'capsule',
            author_id: 'me',
            title: 'Later',
            body: 'A saved note',
            unlock_at: '2040-01-01T00:00:00Z',
          },
        ],
      ],
    },
  }),
}))
beforeEach(() => {
  rpc.mockClear()
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
test('sealed capsule deletion requires an explicit confirmation and supports cancellation', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CapsulesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Delete this sealed capsule' }),
  )
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(rpc).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(rpc).not.toHaveBeenCalled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Delete this sealed capsule' }),
  )
  const dialog = screen.getByRole('dialog')
  await userEvent.click(
    dialog.querySelector('.button-danger') as HTMLButtonElement,
  )
  await waitFor(() =>
    expect(rpc).toHaveBeenCalledWith('cancel_capsule', { p_id: 'capsule' }),
  )
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
})

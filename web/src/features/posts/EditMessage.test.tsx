import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, test, vi } from 'vitest'
import { EditMessage } from './EditMessage'
import type { Post } from '@/lib/posts'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ client: { rpc } }) }))
beforeEach(() => {
  rpc.mockReset()
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
test('edit preserves the read version and the draft after a conflicting write', async () => {
  rpc
    .mockResolvedValueOnce({ error: { message: 'EDIT_CONFLICT' } })
    .mockResolvedValueOnce({ error: null })
  const close = vi.fn()
  const post = { id: 'message', body: 'A typo', edit_version: 3 } as Post
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EditMessage post={post} onClose={close} />
    </QueryClientProvider>,
  )
  await userEvent.clear(screen.getByRole('textbox', { name: 'Message' }))
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Message' }),
    'Corrected',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Save edit' }))
  await screen.findByRole('alert')
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox')).toHaveValue('Corrected')
  expect(rpc).toHaveBeenCalledWith('edit_chat_post', {
    p_id: 'message',
    p_body: 'Corrected',
    p_expected_version: 3,
  })
  await userEvent.click(screen.getByRole('button', { name: 'Save edit' }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
})

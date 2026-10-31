import { FlowProvider } from '@/app/FlowProvider'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import { Composer } from './Composer'
const f = vi.hoisted(() => ({
  share: vi.fn(),
  photo: vi.fn(),
  typing: vi.fn(),
  stopped: vi.fn(),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ client: {} }) }))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: 'me' },
      couple: { id: 'room', retention_days: 7 },
    },
  }),
}))
vi.mock('@/features/map/LiveContext', () => ({
  useLiveData: () => ({ places: { data: [] } }),
}))
vi.mock('@/lib/posts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/posts')>()),
  sharePost: f.share,
}))
vi.mock('@/lib/media', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/media')>()),
  preparePhoto: f.photo,
}))
afterEach(() => {
  vi.clearAllMocks()
})
function mount() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FlowProvider>
        <Composer channel="chat" onTyping={f.typing} onStopTyping={f.stopped} />
      </FlowProvider>
    </QueryClientProvider>,
  )
}
test('messenger input sends text with Enter and preserves Shift+Enter for a new line', async () => {
  f.share.mockResolvedValue({ id: 'sent' })
  mount()
  const user = userEvent.setup(),
    input = screen.getByRole('textbox', { name: 'Your note' })
  expect(screen.getByRole('button', { name: 'Record voice' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Note' })).not.toBeInTheDocument()
  await user.type(input, 'Hello{Shift>}{Enter}{/Shift}there')
  expect(f.share).not.toHaveBeenCalled()
  await user.keyboard('{Enter}')
  await waitFor(() => expect(f.share).toHaveBeenCalledTimes(1))
  expect(f.share.mock.calls[0]?.[1]).toMatchObject({
    channel: 'chat',
    kind: 'text',
    body: 'Hello\nthere',
  })
  await waitFor(() => expect(input).toHaveValue(''))
  expect(f.stopped).toHaveBeenCalled()
})
test('photo selection previews locally and sends only after the send button is pressed', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:local-preview')
  URL.revokeObjectURL = vi.fn()
  const attachment = {
    blob: new Blob(['photo'], { type: 'image/webp' }),
    extension: 'webp',
    width: 2,
    height: 2,
  }
  f.photo.mockResolvedValue(attachment)
  f.share.mockResolvedValue({ id: 'sent' })
  const view = mount()
  fireEvent.change(view.container.querySelector('input[type=file]')!, {
    target: {
      files: [new File(['input'], 'photo.png', { type: 'image/png' })],
    },
  })
  await screen.findByRole('img', { name: 'Your photo before sharing' })
  expect(f.share).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
  await waitFor(() =>
    expect(f.share).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'photo', attachment }),
    ),
  )
})
test('a failed send preserves the draft and permits an explicit retry', async () => {
  f.share.mockRejectedValue(new Error('offline'))
  mount()
  const input = screen.getByRole('textbox', { name: 'Your note' })
  await userEvent.type(input, 'Still here')
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Your draft is still here',
  )
  expect(input).toHaveValue('Still here')
})

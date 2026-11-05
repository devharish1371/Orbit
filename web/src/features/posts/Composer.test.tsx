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
function mount(channel: 'chat' | 'moment' = 'chat') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FlowProvider>
        <Composer
          channel={channel}
          onTyping={f.typing}
          onStopTyping={f.stopped}
        />
      </FlowProvider>
    </QueryClientProvider>,
  )
}
test('a failed chat send retains its draft and retry reuses the same id', async () => {
  f.share
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({ id: 'sent' })
  mount('chat')
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Your note' }),
    'Try once more',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
  await userEvent.click(
    await screen.findByRole('button', { name: 'Retry send' }),
  )
  await waitFor(() => expect(f.share).toHaveBeenCalledTimes(2))
  expect(f.share.mock.calls[0]![1].id).toBe(f.share.mock.calls[1]![1].id)
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''))
})
test('moment media tray previews and removes a photo without posting, and requires an explicit Post', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:moment-preview')
  URL.revokeObjectURL = vi.fn()
  const attachment = {
    blob: new Blob(['photo'], { type: 'image/webp' }),
    extension: 'webp',
    width: 2,
    height: 2,
  }
  f.photo.mockResolvedValue(attachment)
  f.share.mockResolvedValue({ id: 'sent' })
  mount('moment')
  expect(screen.getByRole('button', { name: 'Post moment' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Photo' }))
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  const select = () =>
    fireEvent.change(screen.getByLabelText('Choose photos'), {
      target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] },
    })
  select()
  await screen.findByRole('img', { name: 'Photo 1 preview' })
  expect(f.share).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: 'Your note' })).toHaveAttribute(
    'placeholder',
    'Add a caption…',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }))
  expect(
    screen.queryByRole('img', { name: 'Photo 1 preview' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Post moment' })).toBeDisabled()
  select()
  await screen.findByRole('img', { name: 'Photo 1 preview' })
  await userEvent.click(screen.getByRole('button', { name: 'Post moment' }))
  await waitFor(() =>
    expect(f.share).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        channel: 'moment',
        kind: 'photo',
        photos: [expect.objectContaining({ attachment, caption: '' })],
      }),
    ),
  )
})
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
  await screen.findByRole('img', { name: 'Photo 1 preview' })
  expect(f.share).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
  await waitFor(() =>
    expect(f.share).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        kind: 'photo',
        photos: [expect.objectContaining({ attachment, caption: '' })],
      }),
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
test('text treatment previews locally and is sent only with the explicit post', async () => {
  f.share.mockResolvedValue({ id: 'styled' })
  mount('moment')
  await userEvent.click(screen.getByRole('button', { name: 'Paper' }))
  expect(screen.getByRole('button', { name: 'Paper' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const input = screen.getByRole('textbox', { name: 'Your note' })
  await userEvent.type(input, 'A note in paper.')
  expect(f.share).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Post moment' }))
  await waitFor(() =>
    expect(f.share).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ noteStyle: 'paper', body: 'A note in paper.' }),
    ),
  )
})

test('photo sets retain captions and order across failed sends; edits get a fresh retry identity', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:photo')
  URL.revokeObjectURL = vi.fn()
  f.photo.mockImplementation(async (file: File) => ({
    blob: new Blob([file.name], { type: 'image/webp' }),
    extension: 'webp',
    width: 2,
    height: 2,
  }))
  f.share.mockRejectedValue(new Error('offline'))
  const view = mount()
  const input = view.container.querySelector('input[type=file]')!
  fireEvent.change(input, {
    target: {
      files: [
        new File(['a'], 'a.png', { type: 'image/png' }),
        new File(['b'], 'b.png', { type: 'image/png' }),
      ],
    },
  })
  await screen.findByRole('button', { name: 'Select photo 2' })
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Caption for photo 1' }),
    'A caption',
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Move photo later' }),
  )
  expect(
    screen.getByRole('textbox', { name: 'Caption for photo 2' }),
  ).toHaveValue('A caption')
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
  await screen.findByRole('button', { name: 'Retry send' })
  const first = f.share.mock.calls[0]![1]
  expect(first.photos.map((p: { caption: string }) => p.caption)).toEqual([
    '',
    'A caption',
  ])
  await userEvent.click(screen.getByRole('button', { name: 'Retry send' }))
  await waitFor(() => expect(f.share).toHaveBeenCalledTimes(2))
  expect(f.share.mock.calls[1]![1].id).toBe(first.id)
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Caption for photo 2' }),
    ' changed',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
  await waitFor(() => expect(f.share).toHaveBeenCalledTimes(3))
  expect(f.share.mock.calls[2]![1].id).not.toBe(first.id)
  const before = f.photo.mock.calls.length
  fireEvent.change(input, {
    target: {
      files: Array.from(
        { length: 5 },
        () => new File(['x'], 'x.png', { type: 'image/png' }),
      ),
    },
  })
  expect(await screen.findByText('Choose up to 6 photos.')).toBeVisible()
  expect(f.photo.mock.calls.length).toBe(before)
  expect(screen.getByRole('button', { name: 'Select photo 2' })).toBeVisible()
})

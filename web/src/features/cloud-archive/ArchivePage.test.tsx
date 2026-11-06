import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, test, vi } from 'vitest'
import type { Post } from '@/lib/posts'
import type { CloudArchive } from './backup'
import { ArchiveMemory } from './ArchivePage'
const f = vi.hoisted(() => ({
  rpc: vi.fn(),
  verify: vi.fn(),
  save: vi.fn(),
  build: vi.fn(),
  supported: true,
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'me' } },
    client: { rpc: f.rpc, storage: { from: () => ({ download: vi.fn() }) } },
  }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({ data: { couple: { id: 'room' } } }),
}))
vi.mock('./verify', () => ({ verifyMemoryCopies: f.verify }))
vi.mock('./native', () => ({
  archiveSupported: () => f.supported,
  saveVerifiedBackup: f.save,
}))
vi.mock('./backup', () => ({ buildBackup: f.build }))
const root = {
  id: 'root',
  kind: 'photo',
  keep: true,
  body: 'Afternoon by the sea',
  created_at: '2026-11-06T00:00:00Z',
} as Post
const archive = {
  post_id: 'root',
  archive_id: 'backup',
  snapshot: JSON.stringify({ post: root }),
  snapshot_sha: 'sha',
  state: 'proposed',
} as CloudArchive
function mount(a?: CloudArchive) {
  return render(
    <StrictMode>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: 0 } },
          })
        }
      >
        <MemoryRouter>
          <ArchiveMemory archive={a} post={root} approved={[]} />
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
}
beforeEach(() => {
  f.supported = true
  f.rpc.mockReset().mockImplementation(async (name: string) => ({
    data:
      name === 'archive_requirements'
        ? { phones: true, backups: false, can_queue: false, owner: true }
        : archive,
    error: null,
  }))
  f.verify.mockReset().mockResolvedValue({ hashes: new Map(), device: 'phone' })
  f.build.mockReset().mockResolvedValue({
    blob: new Blob(),
    sha256: 'hash',
    entries: [],
    files: [],
  })
  f.save.mockReset().mockResolvedValue({ sha256: 'hash', bytes: 100 })
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
test('backup needs an explicit independent-copy acknowledgement, successful readback, then server approval', async () => {
  const u = userEvent.setup()
  mount(archive)
  const save = screen.getByRole('button', { name: 'Save & verify my backup' })
  expect(save).toBeDisabled()
  expect(f.verify).not.toHaveBeenCalled()
  expect(
    await screen.findByRole('button', { name: 'Remove cloud files' }),
  ).toBeDisabled()
  await u.click(screen.getByRole('checkbox'))
  f.save.mockRejectedValueOnce(new Error('BACKUP_VERIFY_FAILED'))
  await u.click(save)
  await screen.findByText(/Couldn’t finish/)
  expect(f.rpc.mock.calls.some((c) => c[0] === 'approve_memory_archive')).toBe(
    false,
  )
  expect(screen.getByRole('checkbox')).toBeChecked()
  await u.click(save)
  await screen.findByText(
    'Backup read back and verified. Your approval is saved.',
  )
  expect(f.rpc).toHaveBeenCalledWith(
    'approve_memory_archive',
    expect.objectContaining({
      p_expected_user: 'me',
      p_expected_couple: 'room',
      p_independent_backup: true,
      p_device: 'phone',
    }),
  )
  expect(f.save).toHaveBeenCalledTimes(2)
})
test('browser cannot claim a native backup; cancellation does not queue removal', async () => {
  f.supported = false
  const u = userEvent.setup()
  mount(archive)
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  expect(screen.getByText(/updated Android app/)).toBeInTheDocument()
  await u.click(screen.getByRole('button', { name: 'Cancel proposal' }))
  await waitFor(() =>
    expect(f.rpc).toHaveBeenCalledWith(
      'cancel_memory_archive',
      expect.objectContaining({ p_archive: 'backup' }),
    ),
  )
  expect(f.rpc.mock.calls.some((c) => c[0] === 'queue_memory_archive')).toBe(
    false,
  )
})
test('saved-off-cloud memory opens a scoped phone library and never renders a broken cloud image', () => {
  mount({ ...archive, state: 'archived' })
  expect(screen.getByRole('link', { name: 'Open phone copy' })).toHaveAttribute(
    'href',
    '/offline?memory=root',
  )
  expect(screen.getByLabelText('Choose Orbit archive ZIP')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
})

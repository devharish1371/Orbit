import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import PersonPage from './PersonPage'
const signed = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://example.com/photo.webp' },
    error: null,
  }),
)
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    client: { storage: { from: () => ({ createSignedUrl: signed }) } },
  }),
}))
vi.mock('@/components/ui/Avatar', () => ({
  Avatar: () => <span aria-hidden="true">Portrait</span>,
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: 'a', display_name: 'Dev' },
      partner: {
        user_id: 'b',
        display_name: 'Vidya',
        nickname: 'V',
        color: '#e786a1',
        avatar_path: 'couple/b/avatar.webp',
        share_mode: 'live',
      },
      couple: {},
    },
  }),
}))
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
function open(id = 'b') {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/person/' + id]}>
        <Routes>
          <Route path="/person/:id" element={<PersonPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
test('partner profile is read-only and opens the full authorized profile photo', async () => {
  open()
  expect(screen.getByRole('heading', { name: 'V' })).toBeVisible()
  expect(screen.queryByText('Edit your profile')).not.toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Message' })).toHaveAttribute(
    'href',
    '/chat',
  )
  await userEvent.click(screen.getByRole('button', { name: 'View V’s photo' }))
  expect(await screen.findByRole('img', { name: 'V' })).toHaveAttribute(
    'src',
    'https://example.com/photo.webp',
  )
  expect(signed).toHaveBeenCalledWith('couple/b/avatar.webp', 3600)
})
test('unknown person IDs cannot load photos or become editable', () => {
  open('stranger')
  expect(
    screen.getByRole('heading', { name: 'Profile unavailable' }),
  ).toBeVisible()
  expect(signed).not.toHaveBeenCalled()
})

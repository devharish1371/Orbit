import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, test, vi } from 'vitest'
import { PhoneCopiesControl } from './PhoneCopiesControl'
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ client: {}, session: { user: { id: 'me' } } }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: { self: { user_id: 'me' }, couple: { id: 'room' } },
  }),
}))
vi.mock('./native', () => ({
  phoneCopiesSupported: true,
  phone: {},
  phoneOperation: vi.fn(),
}))
vi.mock('./usePhoneCopies', () => ({
  usePhoneCopies: () => ({
    data: { local: { enabled: true, used: 0 } },
    isPending: false,
    error: null,
  }),
}))
test('skipped archived copies never promise cloud originals still exist', () => {
  const query = new QueryClient()
  query.setQueryData(['phone-sync', 'me', 'room'], { skipped: 1 })
  render(
    <QueryClientProvider client={query}>
      <MemoryRouter>
        <PhoneCopiesControl />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(screen.getByRole('status')).toHaveTextContent(
    'Check Cloud archives before removing any other copy',
  )
  expect(
    screen.queryByText(/Their cloud copies stay saved/),
  ).not.toBeInTheDocument()
})

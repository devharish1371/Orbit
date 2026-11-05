import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import HomePage from './HomePage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const mode = vi.hoisted(() => ({ value: 'live' }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ client: {} }) }))
vi.mock('@/features/posts/ExpiringSoon', () => ({ ExpiringSoon: () => null }))
vi.mock('@/features/map/LiveContext', () => ({
  useLiveData: () => ({ locations: { data: [] } }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { display_name: 'Me', nickname: null },
      partner: {
        display_name: 'Partner',
        nickname: null,
        phone: '+919876543210',
        color: '#FF6B8A',
        share_mode: mode.value,
      },
      couple: {
        timezone: 'Asia/Kolkata',
        anniversary: '2025-11-11',
        meet_url: 'https://meet.google.com/abc-defg-hij',
      },
    },
  }),
}))
test('home connects to the partner and shared room without inventing location data', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-30T00:00:00Z'))
  try {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute(
      'href',
      'tel:+919876543210',
    )
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/919876543210',
    )
    expect(screen.getByRole('link', { name: 'Meet' })).toHaveAttribute(
      'href',
      'https://meet.google.com/abc-defg-hij',
    )
    expect(screen.getByText('12')).toBeVisible()
    expect(screen.getByText('Waiting for a first location')).toBeVisible()
  } finally {
    vi.useRealTimers()
  }
})

test('paused sharing has one labelled location icon and no repeated status rows', () => {
  mode.value = 'paused'
  try {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(
      screen.getAllByRole('link', { name: 'Location sharing paused' }),
    ).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: 'Location sharing paused' }),
    ).toHaveAttribute('href', '/map')
    expect(screen.queryByText('Sharing is paused')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Waiting for a first location'),
    ).not.toBeInTheDocument()
  } finally {
    mode.value = 'live'
  }
})

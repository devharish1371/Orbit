import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import HomePage from './HomePage'
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { display_name: 'Me', nickname: null },
      partner: {
        display_name: 'Partner',
        nickname: null,
        phone: '+919876543210',
        color: '#FF6B8A',
        share_mode: 'live',
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
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
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

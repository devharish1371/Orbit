import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PlanCard } from './PlanCard'
import type { Plan } from '@/lib/plans'
const api = vi.hoisted(() => ({ rpc: vi.fn(), calendar: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ client: { rpc: api.rpc } }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: 'b' },
      partner: { user_id: 'a' },
      couple: { id: 'room' },
    },
  }),
}))
vi.mock('@/hooks/useNow', () => ({
  useNow: () => Date.parse('2026-11-04T10:00:00Z'),
}))
vi.mock('@/native/privacy', () => ({ savePlanCalendar: api.calendar }))
vi.mock('@/components/ui/ChoiceSelect', () => ({
  ChoiceSelect: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (v: string) => void
  }) => (
    <select
      aria-label="Reminder"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Off</option>
      <option value="30">30 minutes before</option>
    </select>
  ),
}))
const plan = {
  id: '11111111-1111-4111-8111-111111111111',
  version: 1,
  couple_id: 'room',
  created_by: 'a',
  title: 'Picnic',
  notes: 'Tea',
  venue: 'Park',
  starts_at: '2026-11-11T13:30:00Z',
  timezone: 'Asia/Kolkata',
  updated_at: '2026-11-04T10:00:00Z',
  accepted_by: ['a'],
  cancelled: false,
} as Plan
beforeEach(() => {
  api.rpc.mockReset().mockResolvedValue({ error: null })
  api.calendar.mockReset().mockResolvedValue(undefined)
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
function setup() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PlanCard plan={plan} lead={null} onEdit={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
test('confirmation is versioned and never displayed as mutual before the server row refreshes', async () => {
  setup()
  await userEvent.click(screen.getByRole('button', { name: 'Count me in' }))
  expect(api.rpc).toHaveBeenCalledWith(
    'respond_plan',
    expect.objectContaining({
      p_version: 1,
      p_accept: true,
      p_expected_user: 'b',
    }),
  )
  expect(screen.queryByText('Confirmed')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Edit Picnic' }),
  ).not.toBeInTheDocument()
})
test('personal reminder stays off until explicitly saved; closing the choice does not write', async () => {
  setup()
  await userEvent.click(
    screen.getByRole('button', { name: 'Reminder for Picnic' }),
  )
  expect(screen.getByRole('combobox')).toHaveValue('')
  await userEvent.click(screen.getByRole('button', { name: 'Close remind me' }))
  expect(api.rpc).not.toHaveBeenCalled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Reminder for Picnic' }),
  )
  await userEvent.selectOptions(screen.getByRole('combobox'), '30')
  await userEvent.click(screen.getByRole('button', { name: 'Save reminder' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  expect(api.rpc).toHaveBeenCalledWith(
    'set_plan_reminder',
    expect.objectContaining({
      p_minutes: 30,
      p_expected_user: 'b',
      p_version: 1,
    }),
  )
})
test('calendar export needs its own explicit save and creates no invitation recipients', async () => {
  setup()
  await userEvent.click(
    screen.getByRole('button', { name: 'Calendar file for Picnic' }),
  )
  expect(api.calendar).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Save file' }))
  expect(api.calendar).toHaveBeenCalledWith(
    expect.stringContaining('STATUS:TENTATIVE'),
    plan.id,
  )
  expect(api.rpc).not.toHaveBeenCalled()
})

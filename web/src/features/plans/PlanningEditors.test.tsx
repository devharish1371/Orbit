import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PlanEditor } from './PlanningEditors'
import type { PlanDraft } from './PlanningContext'
const api = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ client: { rpc: api.rpc } }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: {
      self: { user_id: 'a' },
      partner: { display_name: 'Partner' },
      couple: { id: 'room' },
    },
  }),
}))
beforeEach(() => {
  api.rpc.mockReset()
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
function Fixture() {
  const [draft, setDraft] = useState<PlanDraft>({
    id: 'draft-id',
    version: null,
    title: 'A picnic',
    notes: 'Bring tea',
    venue: 'Park',
    starts: '2026-11-11T19:00',
    zone: 'Asia/Kolkata',
  })
  return (
    <QueryClientProvider client={new QueryClient()}>
      <PlanEditor
        draft={draft}
        onChange={setDraft}
        onClose={() => {}}
        onSaved={() => {}}
      />
    </QueryClientProvider>
  )
}
test('save binds the original account and converts couple time; a failed save keeps the edited draft retryable', async () => {
  api.rpc
    .mockResolvedValueOnce({ error: new Error('offline') })
    .mockResolvedValueOnce({ error: null })
  render(<Fixture />)
  expect(screen.getByLabelText('What’s the plan?')).toHaveFocus()
  fireEvent.input(screen.getByLabelText('When · Asia/Kolkata'), {
    target: { value: '2026-11-11T19:00' },
  })
  await userEvent.type(screen.getByLabelText('What’s the plan?'), ' outside')
  await userEvent.click(screen.getByRole('button', { name: 'Propose plan' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Your draft is still here',
  )
  expect(screen.getByLabelText('What’s the plan?')).toHaveValue(
    'A picnic outside',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Propose plan' }))
  expect(api.rpc).toHaveBeenLastCalledWith(
    'save_plan',
    expect.objectContaining({
      p_id: 'draft-id',
      p_title: 'A picnic outside',
      p_version: null,
      p_starts_at: '2026-11-11T13:30:00.000Z',
      p_expected_user: 'a',
      p_expected_couple: 'room',
    }),
  )
})
test('pending save blocks duplicate saves and sheet dismissal', async () => {
  let finish!: (value: { error: null }) => void
  api.rpc.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  render(<Fixture />)
  await userEvent.click(screen.getByRole('button', { name: 'Propose plan' }))
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Close new plan' })).toBeDisabled()
  finish({ error: null })
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Propose plan' })).toBeEnabled(),
  )
})

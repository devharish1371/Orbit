import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, test, vi } from 'vitest'
import { useState } from 'react'
import PlaceEditor from './PlaceEditor'
import type { PlaceDraft } from '@/lib/place'
const api = vi.hoisted(() => ({
  save: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    client: {
      from: () => ({
        insert: api.insert,
        update: api.update,
      }),
    },
  }),
}))
vi.mock('@/hooks/useSpace', () => ({
  useSpace: () => ({
    data: { self: { user_id: 'owner' }, couple: { id: 'couple' } },
  }),
}))
const initial: PlaceDraft = {
  name: 'A saved place',
  emoji: '🌙',
  lat: 12,
  lng: 80,
  radius_m: 150,
  notify_arrive: true,
  notify_leave: false,
}
beforeEach(() => {
  api.save.mockReset()
  api.insert
    .mockReset()
    .mockReturnValue({ select: () => ({ single: api.save }) })
  api.eq.mockReset().mockReturnValue({ select: () => ({ single: api.save }) })
  api.update.mockReset().mockReturnValue({ eq: api.eq })
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
function Fixture({ id }: { id?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <QueryClientProvider client={new QueryClient()}>
      <button onClick={() => setOpen(true)}>Open place</button>
      {open && (
        <PlaceEditor initial={initial} id={id} onClose={() => setOpen(false)} />
      )}
    </QueryClientProvider>
  )
}
test('cancel closes the focused place sheet and returns to its trigger without saving', async () => {
  render(<Fixture />)
  const trigger = screen.getByRole('button', { name: 'Open place' })
  await userEvent.click(trigger)
  expect(screen.getByRole('dialog')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
  expect(api.save).not.toHaveBeenCalled()
})
test.each([undefined, 'place-id'])(
  'a %s save blocks dismissal, preserves errors/draft and closes after success',
  async (id) => {
    let finish!: (value: { error: unknown }) => void
    api.save
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      .mockResolvedValueOnce({ error: null })
    render(<Fixture id={id} />)
    await userEvent.click(screen.getByRole('button', { name: 'Open place' }))
    const name = screen.getByLabelText('Place name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Our café')
    await userEvent.click(screen.getByRole('button', { name: 'Save place' }))
    expect(name).toBeDisabled()
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { cancelable: true }),
    )
    expect(screen.getByRole('dialog')).toBeVisible()
    finish({ error: new Error('network') })
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(name).toHaveValue('Our café')
    expect(name).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Save place' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    if (id) expect(api.eq).toHaveBeenCalledWith('id', id)
    else
      expect(api.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Our café',
          created_by: 'owner',
          couple_id: 'couple',
        }),
      )
  },
)

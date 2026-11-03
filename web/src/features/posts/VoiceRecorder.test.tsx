import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { VoiceRecorder } from './VoiceRecorder'
import { beginVoice } from '@/lib/media'
import { dismissBackLayer } from '@/app/backLayers'
const capture = vi.hoisted(() => ({ begin: vi.fn() }))
vi.mock('@/lib/media', () => ({ beginVoice: capture.begin }))
beforeEach(() => {
  capture.begin.mockReset()
})
test('Back stops recording into a local preview instead of sending or leaving it running', async () => {
  const note = { blob: new Blob(['voice']), extension: 'webm' as const },
    ready = vi.fn(),
    busy = vi.fn(),
    stop = vi.fn()
  capture.begin.mockImplementation(
    async (_signal: AbortSignal, events: Parameters<typeof beginVoice>[1]) => ({
      stop: () => {
        stop()
        events.ready(note)
      },
    }),
  )
  render(<VoiceRecorder compact onReady={ready} onBusy={busy} />)
  await userEvent.click(screen.getByRole('button', { name: 'Record voice' }))
  await screen.findByRole('button', { name: 'Stop recording' })
  act(() => {
    expect(dismissBackLayer()).toBe(true)
  })
  expect(stop).toHaveBeenCalledOnce()
  expect(ready).toHaveBeenCalledWith(note)
  expect(busy).toHaveBeenLastCalledWith(false)
  expect(screen.getByRole('button', { name: 'Record voice' })).toBeVisible()
})
test('Back cancels a pending microphone request and a late response cannot restart recording', async () => {
  let finish!: (value: { stop: () => void }) => void, signal!: AbortSignal
  const busy = vi.fn()
  capture.begin.mockImplementation((value: AbortSignal) => {
    signal = value
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  render(<VoiceRecorder compact onReady={vi.fn()} onBusy={busy} />)
  await userEvent.click(screen.getByRole('button', { name: 'Record voice' }))
  act(() => {
    expect(dismissBackLayer()).toBe(true)
  })
  expect(signal.aborted).toBe(true)
  await act(async () => finish({ stop: vi.fn() }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Record voice' })).toBeVisible(),
  )
  expect(busy).toHaveBeenLastCalledWith(false)
})

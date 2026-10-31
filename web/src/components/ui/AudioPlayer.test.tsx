import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function mediaMocks() {
  const play = vi
    .spyOn(HTMLMediaElement.prototype, 'play')
    .mockImplementation(function (this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', {
        configurable: true,
        value: false,
      })
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    })
  const pause = vi
    .spyOn(HTMLMediaElement.prototype, 'pause')
    .mockImplementation(function (this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { configurable: true, value: true })
      this.dispatchEvent(new Event('pause'))
    })
  return { play, pause }
}

test('voice controls play, pause, seek and cycle playback speed without native controls', async () => {
  const { play, pause } = mediaMocks()
  const view = render(
    <AudioPlayer
      src="/voice.webm"
      label="Voice"
      duration={20}
      waveform={[0.2, 0.7, 0.4]}
    />,
  )
  const audio = view.container.querySelector('audio')!
  expect(audio).not.toHaveAttribute('controls')
  await userEvent.click(screen.getByRole('button', { name: 'Play voice note' }))
  expect(play).toHaveBeenCalledOnce()
  await userEvent.click(
    screen.getByRole('button', { name: 'Pause voice note' }),
  )
  expect(pause).toHaveBeenCalled()
  fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } })
  expect(audio.currentTime).toBe(8)
  expect(screen.getByRole('slider')).toHaveAttribute(
    'aria-valuetext',
    '0:08 / 0:20',
  )
  for (const rate of [1.5, 2, 1]) {
    await userEvent.click(
      screen.getByRole('button', { name: /Playback speed/ }),
    )
    expect(audio.playbackRate).toBe(rate)
  }
})

test('another player and backgrounding pause playback; local blob URLs are released', async () => {
  mediaMocks()
  URL.createObjectURL = vi.fn(() => 'blob:test-voice')
  URL.revokeObjectURL = vi.fn()
  const view = render(
    <>
      <AudioPlayer blob={new Blob(['voice'])} label="Preview" />
      <AudioPlayer src="/other.webm" label="Other" />
    </>,
  )
  const [first, second] = view.container.querySelectorAll('audio')
  await userEvent.click(
    screen.getAllByRole('button', { name: 'Play voice note' })[0]!,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Play voice note' }))
  expect(first!.paused).toBe(true)
  expect(second!.paused).toBe(false)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  fireEvent(document, new Event('visibilitychange'))
  expect(second!.paused).toBe(true)
  view.unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-voice')
})

test('a rejected play can be retried, and unknown WebM duration uses the recording duration', async () => {
  const { play } = mediaMocks()
  play.mockRejectedValueOnce(new Error('not ready'))
  const view = render(
    <AudioPlayer src="/voice.webm" label="Voice" duration={12} />,
  )
  const audio = view.container.querySelector('audio')!
  Object.defineProperty(audio, 'duration', {
    configurable: true,
    value: Infinity,
  })
  fireEvent.durationChange(audio)
  expect(screen.getByRole('slider')).toHaveAttribute('max', '12')
  await userEvent.click(screen.getByRole('button', { name: 'Play voice note' }))
  await userEvent.click(
    await screen.findByRole('button', { name: 'Retry voice note' }),
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Pause voice note' }),
    ).toBeVisible(),
  )
  fireEvent.ended(audio)
  expect(screen.getByRole('button', { name: 'Play voice note' })).toBeVisible()
})

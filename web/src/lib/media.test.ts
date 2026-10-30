import { afterEach, expect, test, vi } from 'vitest'
import { beginVoice } from './media'
class Recorder {
  static isTypeSupported() {
    return true
  }
  static last: Recorder
  state = 'inactive'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  constructor() {
    Recorder.last = this
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    if (this.state === 'inactive') return
    this.state = 'inactive'
    this.ondataavailable?.({
      data: new Blob(['audio'], { type: 'audio/webm' }),
    })
    this.onstop?.()
  }
}
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
function setup() {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'performance',
    ],
  })
  const stop = vi.fn(),
    stream = { getTracks: () => [{ stop }] }
  vi.stubGlobal('MediaRecorder', Recorder)
  vi.stubGlobal('AudioContext', undefined)
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  })
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  const events = { ready: vi.fn(), sample: vi.fn(), error: vi.fn() }
  return { stop, stream, hidden, events }
}
test('voice automatically stops and releases the microphone at two minutes', async () => {
  const f = setup()
  await beginVoice(new AbortController().signal, f.events)
  await vi.advanceTimersByTimeAsync(120001)
  expect(Recorder.last.state).toBe('inactive')
  expect(f.stop).toHaveBeenCalled()
  expect(f.events.ready).toHaveBeenCalledWith(
    expect.objectContaining({ duration: 120, extension: 'webm' }),
  )
  expect(f.events.ready.mock.calls[0]?.[0].waveform.length).toBeLessThanOrEqual(
    60,
  )
  expect(vi.getTimerCount()).toBe(0)
})
test('backgrounding ends capture and abort discards an unfinished note', async () => {
  const f = setup()
  await beginVoice(new AbortController().signal, f.events)
  await vi.advanceTimersByTimeAsync(1000)
  f.hidden.mockReturnValue(true)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(f.stop).toHaveBeenCalled()
  expect(f.events.ready).toHaveBeenCalledTimes(1)
  f.hidden.mockReturnValue(false)
  const controller = new AbortController()
  f.events.ready.mockClear()
  await beginVoice(controller.signal, f.events)
  await vi.advanceTimersByTimeAsync(1000)
  controller.abort()
  expect(f.events.ready).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})
test('a permission result arriving after cancellation never starts capture', async () => {
  const f = setup()
  const controller = new AbortController()
  let resolve: (stream: MediaStream) => void = () => {}
  vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(
    () =>
      new Promise((value) => {
        resolve = value
      }),
  )
  const result = beginVoice(controller.signal, f.events)
  controller.abort()
  resolve(f.stream as unknown as MediaStream)
  await expect(result).rejects.toThrow('VOICE_CANCELLED')
  expect(f.stop).toHaveBeenCalled()
  expect(f.events.ready).not.toHaveBeenCalled()
})

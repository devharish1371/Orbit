import type { Attachment } from './posts'
export function validPhoto(file: Pick<File, 'type' | 'size'>) {
  return (
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) &&
    file.size > 0 &&
    file.size <= 20 * 1024 * 1024
  )
}
export function waveformBins(samples: number[], count = 60): number[] {
  if (!samples.length) return []
  return Array.from({ length: Math.min(count, samples.length) }, (_, index) => {
    const start = Math.floor(
        (index * samples.length) / Math.min(count, samples.length),
      ),
      end = Math.floor(
        ((index + 1) * samples.length) / Math.min(count, samples.length),
      )
    let max = 0
    for (let i = start; i < end; i++) max = Math.max(max, samples[i] ?? 0)
    return Math.round(Math.min(1, Math.max(0, max)) * 1000) / 1000
  })
}
async function webp(image: ImageBitmap, max: number, budget: number) {
  const scale = Math.min(1, max / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('PHOTO_UNAVAILABLE')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  let quality = 0.86
  for (let attempt = 0; attempt < 8; attempt++) {
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value?.type === 'image/webp'
            ? resolve(value)
            : reject(new Error('PHOTO_UNAVAILABLE')),
        'image/webp',
        quality,
      ),
    )
    if (blob.size <= budget)
      return { blob, width: canvas.width, height: canvas.height }
    if (quality > 0.5) quality -= 0.12
    else {
      const copy = document.createElement('canvas')
      copy.width = Math.max(1, Math.round(canvas.width * 0.8))
      copy.height = Math.max(1, Math.round(canvas.height * 0.8))
      const c = copy.getContext('2d')
      if (!c) throw new Error('PHOTO_UNAVAILABLE')
      c.drawImage(canvas, 0, 0, copy.width, copy.height)
      canvas.width = copy.width
      canvas.height = copy.height
      context.drawImage(copy, 0, 0)
    }
  }
  throw new Error('PHOTO_TOO_LARGE')
}
export async function preparePhoto(file: File): Promise<Attachment> {
  if (!validPhoto(file)) throw new Error('INVALID_PHOTO')
  const image = await createImageBitmap(file)
  try {
    const full = await webp(image, 1600, 250 * 1024),
      thumb = await webp(image, 400, 40 * 1024)
    return {
      blob: full.blob,
      thumb: thumb.blob,
      width: full.width,
      height: full.height,
      extension: 'webp',
    }
  } finally {
    image.close()
  }
}
export interface VoiceEvents {
  ready(note: Attachment): void
  sample(level: number, seconds: number): void
  error(): void
}
export async function beginVoice(
  signal: AbortSignal,
  events: VoiceEvents,
): Promise<{ stop(): void }> {
  if (
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === 'undefined'
  )
    throw new Error('VOICE_UNAVAILABLE')
  const mime = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ].find((value) => MediaRecorder.isTypeSupported(value))
  if (!mime) throw new Error('VOICE_UNAVAILABLE')
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  })
  const release = () => stream.getTracks().forEach((track) => track.stop())
  if (signal.aborted || document.hidden) {
    release()
    throw new Error('VOICE_CANCELLED')
  }
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      audioBitsPerSecond: 48000,
    })
  } catch (error) {
    release()
    throw error
  }
  const chunks: Blob[] = [],
    samples: number[] = []
  const started = performance.now()
  let context: AudioContext | undefined,
    analyser: AnalyserNode | undefined,
    bytes = 0
  try {
    context = new AudioContext()
    analyser = context.createAnalyser()
    analyser.fftSize = 256
    context.createMediaStreamSource(stream).connect(analyser)
    void context.resume().catch(() => {})
  } catch {
    /* Recording remains available without a live waveform. */
  }
  const timers: {
    interval?: ReturnType<typeof setInterval>
    timer?: ReturnType<typeof setTimeout>
  } = {}
  let failed = false
  const clean = () => {
    release()
    clearInterval(timers.interval)
    clearTimeout(timers.timer)
    document.removeEventListener('visibilitychange', hidden)
    signal.removeEventListener('abort', aborted)
    void context?.close().catch(() => {})
  }
  const stop = () => {
    if (recorder.state !== 'inactive') recorder.stop()
    release()
  }
  const hidden = () => {
    if (document.hidden) stop()
  }
  const aborted = () => {
    failed = true
    stop()
  }
  recorder.ondataavailable = (event) => {
    if (event.data.size) {
      chunks.push(event.data)
      bytes += event.data.size
      if (bytes > 4.5 * 1024 * 1024) {
        failed = true
        stop()
      }
    }
  }
  recorder.onerror = () => {
    failed = true
    stop()
    if (!signal.aborted) events.error()
  }
  recorder.onstop = () => {
    const duration = Math.min(120, (performance.now() - started) / 1000)
    clean()
    if (failed || signal.aborted) return
    const blob = new Blob(chunks, { type: mime.split(';')[0] })
    if (!blob.size || duration < 0.1) {
      events.error()
      return
    }
    events.ready({
      blob,
      extension: mime.startsWith('audio/webm')
        ? 'webm'
        : mime.startsWith('audio/ogg')
          ? 'ogg'
          : 'm4a',
      duration,
      waveform: waveformBins(samples),
    })
  }
  signal.addEventListener('abort', aborted, { once: true })
  document.addEventListener('visibilitychange', hidden)
  try {
    recorder.start(1000)
  } catch (error) {
    clean()
    throw error
  }
  timers.interval = setInterval(() => {
    const buffer = new Uint8Array(analyser?.fftSize ?? 256)
    analyser?.getByteTimeDomainData(buffer)
    const level = analyser
      ? Math.min(
          1,
          Math.sqrt(
            buffer.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) /
              buffer.length,
          ) * 4,
        )
      : 0
    samples.push(level)
    events.sample(level, (performance.now() - started) / 1000)
  }, 100)
  timers.timer = setTimeout(stop, 120000)
  return { stop }
}

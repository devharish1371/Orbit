import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from '@capacitor/core'
export interface PrivacyState {
  enabled: boolean
  screenshots: boolean
  locked: boolean
  available: boolean
}
interface PrivacyPlugin {
  status(): Promise<PrivacyState>
  configure(options: {
    enabled: boolean
    screenshots: boolean
  }): Promise<PrivacyState>
  unlock(): Promise<PrivacyState>
  addListener(
    event: 'locked',
    callback: () => void,
  ): Promise<PluginListenerHandle>
  beginExport(options: { filename: string }): Promise<{ cancelled: boolean }>
  appendExport(options: { chunk: string }): Promise<void>
  finishExport(): Promise<void>
  cancelExport(): Promise<void>
}
export const nativePrivacy = registerPlugin<PrivacyPlugin>('OrbitPrivacy')
export const isAndroid = () => Capacitor.getPlatform() === 'android'
export async function saveMemoryZip(blob: Blob, signal: AbortSignal) {
  const filename = `orbit-memories-${new Date().toISOString().slice(0, 10)}.zip`
  return savePrivateExport(blob, filename, signal)
}
export async function savePlanCalendar(content: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('INVALID_PLAN')
  return savePrivateExport(
    new Blob([content], { type: 'text/calendar;charset=utf-8' }),
    `orbit-plan-${id}.ics`,
    new AbortController().signal,
  )
}
async function savePrivateExport(
  blob: Blob,
  filename: string,
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  if (!isAndroid()) {
    const url = URL.createObjectURL(blob),
      link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return
  }
  try {
    const result = await nativePrivacy.beginExport({ filename })
    if (result.cancelled) throw new DOMException('Cancelled', 'AbortError')
    for (let offset = 0; offset < blob.size; offset += 256 * 1024) {
      signal.throwIfAborted()
      const bytes = new Uint8Array(
        await blob.slice(offset, offset + 256 * 1024).arrayBuffer(),
      )
      let value = ''
      for (let start = 0; start < bytes.length; start += 8192)
        value += String.fromCharCode(...bytes.subarray(start, start + 8192))
      await nativePrivacy.appendExport({ chunk: btoa(value) })
    }
    signal.throwIfAborted()
    await nativePrivacy.finishExport()
  } catch (error) {
    await nativePrivacy.cancelExport().catch(() => {})
    throw error
  }
}

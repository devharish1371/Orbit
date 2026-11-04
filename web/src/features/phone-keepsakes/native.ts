import { Capacitor, registerPlugin } from '@capacitor/core'
import {
  validCopy,
  type PhoneCopy,
  type PhoneIdentity,
  type PhoneStatus,
} from './model'
interface PhonePlugin {
  identity(): Promise<PhoneIdentity>
  status(options: PhoneIdentity): Promise<PhoneStatus>
  configure(options: PhoneIdentity & { enabled: boolean }): Promise<void>
  list(options: PhoneIdentity): Promise<{ items: PhoneCopy[] }>
  begin(
    options: PhoneIdentity & { metadata: object; bytes: number },
  ): Promise<void>
  append(options: PhoneIdentity & { base64: string }): Promise<void>
  finish(options: PhoneIdentity): Promise<PhoneCopy>
  remove(options: PhoneIdentity & { id: string }): Promise<void>
  open(options: PhoneIdentity & { id: string }): Promise<PhoneCopy>
  chunk(
    options: PhoneIdentity & { offset: number },
  ): Promise<{ base64: string }>
  close(options: PhoneIdentity): Promise<void>
}
export const phone = registerPlugin<PhonePlugin>('OrbitKeepsakes')
export const phoneCopiesSupported = Capacitor.isNativePlatform()
// The bridge has one bounded read/write buffer. Serialize readers, sync and preference changes.
let tail: Promise<unknown> = Promise.resolve()
export function phoneOperation<T>(work: () => Promise<T>): Promise<T> {
  const result = tail.then(work, work)
  tail = result.catch(() => {})
  return result
}
export async function phoneItems(identity: PhoneIdentity) {
  const { items } = await phone.list(identity)
  if (!items.every(validCopy)) throw new Error('PHONE_COPY_UNAVAILABLE')
  return items
}
function encoded(bytes: Uint8Array) {
  let value = ''
  for (const byte of bytes) value += String.fromCharCode(byte)
  return btoa(value)
}
export async function writePhoneCopy(
  identity: PhoneIdentity,
  metadata: object,
  data: Blob,
  active: () => boolean,
) {
  const check = () => {
    if (!active()) throw new Error('COPY_CANCELLED')
  }
  try {
    check()
    await phone.begin({ ...identity, metadata, bytes: data.size })
    for (let offset = 0; offset < data.size; offset += 196608) {
      check()
      const bytes = new Uint8Array(
        await data.slice(offset, offset + 196608).arrayBuffer(),
      )
      check()
      await phone.append({ ...identity, base64: encoded(bytes) })
    }
    check()
    const result = await phone.finish(identity)
    if (!validCopy(result)) throw new Error('PHONE_COPY_UNAVAILABLE')
    check()
    return result
  } finally {
    await phone.close(identity).catch(() => {})
  }
}
export async function readPhoneMedia(
  identity: PhoneIdentity,
  id: string,
  active: () => boolean,
) {
  return phoneOperation(async () => {
    try {
      const copy = await phone.open({ ...identity, id })
      if (!validCopy(copy)) throw new Error('PHONE_COPY_UNAVAILABLE')
      const parts: ArrayBuffer[] = []
      for (let offset = 0; offset < copy.bytes; offset += 196608) {
        if (!active()) throw new Error('COPY_CANCELLED')
        const { base64 } = await phone.chunk({ ...identity, offset })
        const binary = atob(base64),
          bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
        if (bytes.length !== Math.min(196608, copy.bytes - offset))
          throw new Error('PHONE_COPY_UNAVAILABLE')
        parts.push(bytes.buffer)
      }
      if (!active()) throw new Error('COPY_CANCELLED')
      return new Blob(parts, { type: copy.mime })
    } finally {
      await phone.close(identity).catch(() => {})
    }
  })
}

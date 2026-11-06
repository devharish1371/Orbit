import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PhoneIdentity } from '@/features/phone-keepsakes/model'
import type { EntryProof } from './backup'
interface ArchivePlugin {
  begin(
    options: PhoneIdentity & {
      archive: string
      bytes: number
      sha256: string
      entries: EntryProof[]
    },
  ): Promise<{ cancelled: boolean }>
  append(options: PhoneIdentity & { base64: string }): Promise<void>
  finish(options: PhoneIdentity): Promise<{ sha256: string; bytes: number }>
  cancel(): Promise<void>
}
const native = registerPlugin<ArchivePlugin>('OrbitArchive')
export const archiveSupported = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('OrbitArchive')
export async function saveVerifiedBackup(
  identity: PhoneIdentity,
  archive: string,
  backup: { blob: Blob; sha256: string; entries: EntryProof[] },
  active: () => boolean,
) {
  const check = () => {
    if (!active()) throw new Error('BACKUP_CANCELLED')
  }
  try {
    check()
    const picked = await native.begin({
      ...identity,
      archive,
      bytes: backup.blob.size,
      sha256: backup.sha256,
      entries: backup.entries,
    })
    check()
    if (picked.cancelled) throw new Error('BACKUP_CANCELLED')
    for (let offset = 0; offset < backup.blob.size; offset += 196608) {
      check()
      const bytes = new Uint8Array(
        await backup.blob.slice(offset, offset + 196608).arrayBuffer(),
      )
      let raw = ''
      for (const b of bytes) raw += String.fromCharCode(b)
      await native.append({ ...identity, base64: btoa(raw) })
    }
    check()
    const proof = await native.finish(identity)
    check()
    if (proof.bytes !== backup.blob.size || proof.sha256 !== backup.sha256)
      throw new Error('BACKUP_VERIFY_FAILED')
    return proof
  } finally {
    await native.cancel().catch(() => {})
  }
}

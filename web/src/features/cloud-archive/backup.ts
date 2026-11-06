import { crc32, MemoryZip } from '@/lib/zip'
export interface ArchiveFile {
  path: string
  bytes: number
  copy_id: string | null
  mime: string
}
export interface CloudArchive {
  post_id: string
  archive_id: string
  snapshot: string
  snapshot_sha: string
  files: ArchiveFile[]
  state: string
  revision: number
  kept_at: string
  restore_id: string | null
  restore_targets: unknown
}
export interface FileProof {
  path: string
  bytes: number
  sha256: string
  name: string
}
export interface EntryProof {
  name: string
  bytes: number
  sha256: string
}
export const ARCHIVE_LIMIT = 16 * 1024 * 1024
export async function digest(data: Uint8Array) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(data))),
    (n) => n.toString(16).padStart(2, '0'),
  ).join('')
}
const encode = new TextEncoder(),
  decode = new TextDecoder('utf-8', { fatal: true })
export async function buildBackup(
  archive: CloudArchive,
  download: (file: ArchiveFile) => Promise<Uint8Array>,
  originalHashes: Map<string, string>,
) {
  if (
    (await digest(encode.encode(archive.snapshot))) !== archive.snapshot_sha ||
    archive.files.length < 1 ||
    archive.files.length > 20
  )
    throw new Error('WRONG_BACKUP')
  const zip = new MemoryZip(),
    files: FileProof[] = [],
    entries: EntryProof[] = []
  let size = 0
  const add = async (name: string, data: Uint8Array) => {
    size += data.length
    if (size > ARCHIVE_LIMIT - 65536) throw new Error('BACKUP_SIZE_LIMIT')
    zip.add(name, data)
    entries.push({ name, bytes: data.length, sha256: await digest(data) })
  }
  await add('snapshot.json', encode.encode(archive.snapshot))
  for (const [index, file] of archive.files.entries()) {
    const data = await download(file),
      sha = await digest(data)
    if (
      data.length !== file.bytes ||
      (file.copy_id && originalHashes.get(file.copy_id) !== sha)
    )
      throw new Error('COPY_VERIFY_FAILED')
    const name = `media/${index}_${file.path.split('/').at(-1)!}`
    await add(name, data)
    files.push({ path: file.path, bytes: data.length, sha256: sha, name })
  }
  await add('files.json', encode.encode(JSON.stringify(files)))
  const blob = zip.finish()
  if (blob.size > ARCHIVE_LIMIT) throw new Error('BACKUP_SIZE_LIMIT')
  return {
    blob,
    files,
    entries,
    sha256: await digest(new Uint8Array(await blob.arrayBuffer())),
  }
}
/** Strict ZIP STORE reader. Central/local headers must agree, and all bytes are accounted for. */
export function readStoreZip(data: Uint8Array) {
  const bad = () => {
    throw new Error('INVALID_BACKUP')
  }
  if (data.length < 22 || data.length > ARCHIVE_LIMIT) bad()
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength),
    end = data.length - 22
  if (
    v.getUint32(end, true) !== 0x06054b50 ||
    v.getUint16(end + 4, true) ||
    v.getUint16(end + 6, true) ||
    v.getUint16(end + 20, true)
  )
    bad()
  const count = v.getUint16(end + 10, true),
    central = v.getUint32(end + 16, true)
  if (
    count < 3 ||
    count > 22 ||
    count !== v.getUint16(end + 8, true) ||
    central + v.getUint32(end + 12, true) !== end
  )
    bad()
  let cursor = central,
    local = 0
  const entries = new Map<string, Uint8Array>()
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || v.getUint32(cursor, true) !== 0x02014b50) bad()
    const flags = v.getUint16(cursor + 8, true),
      method = v.getUint16(cursor + 10, true),
      size = v.getUint32(cursor + 24, true),
      crc = v.getUint32(cursor + 16, true),
      n = v.getUint16(cursor + 28, true),
      extra = v.getUint16(cursor + 30, true),
      comment = v.getUint16(cursor + 32, true)
    if (
      flags !== 0x800 ||
      method ||
      v.getUint32(cursor + 20, true) !== size ||
      extra ||
      comment ||
      v.getUint16(cursor + 34, true) ||
      v.getUint32(cursor + 42, true) !== local ||
      cursor + 46 + n > end
    )
      bad()
    const name = decode.decode(data.subarray(cursor + 46, cursor + 46 + n))
    if (
      !/^[a-zA-Z0-9_./-]+$/.test(name) ||
      name.startsWith('/') ||
      name.split('/').some((s) => !s || s === '..' || s === '.') ||
      entries.has(name) ||
      local + 30 + n + size > central
    )
      bad()
    if (
      v.getUint32(local, true) !== 0x04034b50 ||
      v.getUint16(local + 6, true) !== flags ||
      v.getUint16(local + 8, true) !== method ||
      v.getUint32(local + 14, true) !== crc ||
      v.getUint32(local + 18, true) !== size ||
      v.getUint32(local + 22, true) !== size ||
      v.getUint16(local + 26, true) !== n ||
      v.getUint16(local + 28, true) ||
      decode.decode(data.subarray(local + 30, local + 30 + n)) !== name
    )
      bad()
    const bytes = data.slice(local + 30 + n, local + 30 + n + size)
    if (crc32(bytes) !== crc) bad()
    entries.set(name, bytes)
    local += 30 + n + size
    cursor += 46 + n
  }
  if (local !== central || cursor !== end) bad()
  return entries
}
export async function readBackup(blob: Blob, archive: CloudArchive) {
  if (blob.size > ARCHIVE_LIMIT) throw new Error('BACKUP_SIZE_LIMIT')
  const entries = readStoreZip(new Uint8Array(await blob.arrayBuffer())),
    snapshot = entries.get('snapshot.json'),
    index = entries.get('files.json')
  if (
    !snapshot ||
    !index ||
    decode.decode(snapshot) !== archive.snapshot ||
    (await digest(snapshot)) !== archive.snapshot_sha
  )
    throw new Error('WRONG_BACKUP')
  const parsed: unknown = JSON.parse(decode.decode(index))
  if (
    !Array.isArray(parsed) ||
    parsed.length !== archive.files.length ||
    entries.size !== parsed.length + 2
  )
    throw new Error('INVALID_BACKUP')
  const files = new Map<string, Uint8Array>(),
    names = new Set<string>()
  for (const expected of archive.files) {
    const rows = parsed.filter(
      (p: unknown) =>
        p && typeof p === 'object' && 'path' in p && p.path === expected.path,
    ) as FileProof[]
    if (rows.length !== 1) throw new Error('INVALID_BACKUP')
    const proof = rows[0]!,
      data = entries.get(proof.name)
    if (
      !data ||
      !proof.name.startsWith('media/') ||
      names.has(proof.name) ||
      proof.bytes !== expected.bytes ||
      data.length !== expected.bytes ||
      (await digest(data)) !== proof.sha256
    )
      throw new Error('INVALID_BACKUP')
    files.set(expected.path, data)
    names.add(proof.name)
  }
  return files
}

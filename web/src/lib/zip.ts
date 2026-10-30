// ZIP STORE format: already-compressed photos/audio need no second compression library.
const encoder = new TextEncoder()
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})
export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function header(length: number) {
  const bytes = new Uint8Array(length),
    view = new DataView(bytes.buffer)
  return {
    bytes,
    u16: (at: number, value: number) => view.setUint16(at, value, true),
    u32: (at: number, value: number) => view.setUint32(at, value, true),
  }
}
export class MemoryZip {
  private parts: BlobPart[] = []
  private directory: Uint8Array<ArrayBuffer>[] = []
  private offset = 0
  add(name: string, data: Uint8Array) {
    if (
      !/^[a-zA-Z0-9_./-]+$/.test(name) ||
      name.startsWith('/') ||
      name.split('/').includes('..')
    )
      throw new Error('INVALID_ARCHIVE_PATH')
    if (
      this.directory.length >= 20000 ||
      this.offset + data.length > 400 * 1024 * 1024
    )
      throw new Error('EXPORT_SIZE_LIMIT')
    const filename = encoder.encode(name),
      crc = crc32(data),
      local = header(30),
      central = header(46)
    local.u32(0, 0x04034b50)
    local.u16(4, 20)
    local.u16(6, 0x800)
    local.u16(12, 0x21)
    local.u32(14, crc)
    local.u32(18, data.length)
    local.u32(22, data.length)
    local.u16(26, filename.length)
    central.u32(0, 0x02014b50)
    central.u16(4, 20)
    central.u16(6, 20)
    central.u16(8, 0x800)
    central.u16(14, 0x21)
    central.u32(16, crc)
    central.u32(20, data.length)
    central.u32(24, data.length)
    central.u16(28, filename.length)
    central.u32(42, this.offset)
    // Copy downloaded bytes into an owned buffer accepted by Blob on all supported engines.
    this.parts.push(local.bytes, filename, new Uint8Array(data))
    const entry = new Uint8Array(central.bytes.length + filename.length)
    entry.set(central.bytes)
    entry.set(filename, central.bytes.length)
    this.directory.push(entry)
    this.offset += 30 + filename.length + data.length
  }
  finish(): Blob {
    const size = this.directory.reduce((sum, row) => sum + row.length, 0),
      end = header(22)
    end.u32(0, 0x06054b50)
    end.u16(8, this.directory.length)
    end.u16(10, this.directory.length)
    end.u32(12, size)
    end.u32(16, this.offset)
    return new Blob([...this.parts, ...this.directory, end.bytes], {
      type: 'application/zip',
    })
  }
}

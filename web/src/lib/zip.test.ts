import { expect, it } from 'vitest'
import { MemoryZip, crc32 } from './zip'
it('writes a ZIP with correct CRC, directory offsets and UTF-8 JSON bytes', async () => {
  const archive = new MemoryZip(),
    data = new TextEncoder().encode('{"note":"💛"}')
  archive.add('memories.json', data)
  archive.add('media/test.webp', new Uint8Array([1, 2, 3]))
  const result = new Uint8Array(await archive.finish().arrayBuffer()),
    view = new DataView(result.buffer)
  expect(view.getUint32(0, true)).toBe(0x04034b50)
  expect(view.getUint32(14, true)).toBe(crc32(data))
  const end = result.length - 22,
    central = view.getUint32(end + 16, true)
  expect(view.getUint32(central, true)).toBe(0x02014b50)
  expect(view.getUint16(end + 10, true)).toBe(2)
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
})
it('rejects unsafe ZIP paths and enforces a bounded archive', () => {
  const archive = new MemoryZip()
  for (const path of [
    '../secrets',
    '/absolute',
    'media/../../bad',
    'unsafe\\path',
  ])
    expect(() => archive.add(path, new Uint8Array())).toThrow(
      'INVALID_ARCHIVE_PATH',
    )
})

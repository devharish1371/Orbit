import { expect, test } from 'vitest'
import { widgetState } from './surface'
const value = {
  kind: 'private',
  installed: 0,
  pinSupported: true,
  covered: false,
  checkedAt: 0,
}
test('private native widget defaults normalize omitted JSON null fields', () => {
  expect(widgetState(value)).toEqual({ ...value, id: null, reason: null })
})
test('incomplete or malformed native widget replies fail closed', () => {
  for (const changes of [
    { kind: 'unknown' },
    { kind: 'photo' },
    { id: '../../path' },
    { installed: -1 },
    { checkedAt: NaN },
    { covered: 'false' },
    { reason: 'live' },
  ])
    expect(() => widgetState({ ...value, ...changes })).toThrow(
      'WIDGET_UNAVAILABLE',
    )
})

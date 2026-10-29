import { expect, test } from 'vitest'
import { isPublicKey } from './public-config'
test('rejects privileged and malformed client keys, including legacy service-role JWTs', () => {
  const jwt = (role: string) =>
    `header.${btoa(JSON.stringify({ role }))}.signature`
  expect(isPublicKey('sb_' + 'secret_' + 'x'.repeat(32))).toBe(false)
  expect(isPublicKey(jwt('service_role'))).toBe(false)
  expect(isPublicKey(jwt('anon'))).toBe(true)
  expect(isPublicKey('not-a-key')).toBe(false)
})

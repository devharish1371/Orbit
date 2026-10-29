import { expect, test, vi } from 'vitest'
import {
  normalizeEmail,
  validCode,
  validEmail,
  requestCode,
  verifyCode,
} from './auth'
import type { OrbitClient } from './supabase'

test('normalizes emails and rejects malformed emails or short codes', () => {
  expect(normalizeEmail('  Person@Example.com ')).toBe('person@example.com')
  expect(validEmail('person@example.com')).toBe(true)
  expect(validEmail('not-an-email')).toBe(false)
  expect(validCode('12345678')).toBe(true)
  expect(validCode('123456')).toBe(false)
})
test('OTP never auto-creates users and verification uses email codes', async () => {
  const signInWithOtp = vi.fn().mockResolvedValue({ error: null })
  const verifyOtp = vi.fn().mockResolvedValue({ error: null })
  const client = {
    auth: { signInWithOtp, verifyOtp },
  } as unknown as OrbitClient
  await requestCode(client, ' Person@Example.com ')
  await verifyCode(client, ' Person@Example.com ', '1234 5678')
  expect(signInWithOtp).toHaveBeenCalledWith({
    email: 'person@example.com',
    options: { shouldCreateUser: false },
  })
  expect(verifyOtp).toHaveBeenCalledWith({
    email: 'person@example.com',
    token: '12345678',
    type: 'email',
  })
})

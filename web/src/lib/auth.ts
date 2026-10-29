import type { OrbitClient } from './supabase'
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}
export function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))
}
export function validCode(value: string): boolean {
  return /^\d{8}$/.test(value.replace(/\s/g, ''))
}
export async function requestCode(
  client: OrbitClient,
  email: string,
): Promise<void> {
  const { error } = await client.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: false },
  })
  if (error) throw error
}
export async function verifyCode(
  client: OrbitClient,
  email: string,
  token: string,
): Promise<void> {
  const { error } = await client.auth.verifyOtp({
    email: normalizeEmail(email),
    token: token.replace(/\s/g, ''),
    type: 'email',
  })
  if (error) throw error
}

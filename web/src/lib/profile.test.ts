import { expect, test } from 'vitest'
import { profileError, validAvatar, type ProfileDraft } from './profile'
import { accessibleAccent, contrast } from './appearance'
const profile: ProfileDraft = {
  name: 'Person',
  nickname: '',
  partnerNickname: 'Love',
  phone: '+919876543210',
  color: '#7C5CFF',
  theme: 'system',
  accent: '#FF6B8A',
}
test('profile validation bounds names, phone, nicknames and colors', () => {
  expect(profileError(profile)).toBeNull()
  expect(profileError({ ...profile, name: ' ' })).toBe('invalidName')
  expect(profileError({ ...profile, partnerNickname: 'x'.repeat(41) })).toBe(
    'invalidNickname',
  )
  expect(profileError({ ...profile, phone: '1234' })).toBe('invalidPhone')
  expect(profileError({ ...profile, accent: 'url(invalid)' })).toBe(
    'invalidColor',
  )
})
test('avatar accepts supported bounded images only', () => {
  expect(validAvatar({ type: 'image/png', size: 1000 })).toBe(true)
  expect(validAvatar({ type: 'image/svg+xml', size: 1000 })).toBe(false)
  expect(validAvatar({ type: 'image/jpeg', size: 21 * 1024 * 1024 })).toBe(
    false,
  )
})
test('custom accents retain readable foreground contrast in both appearances', () => {
  for (const color of [
    '#000000',
    '#FFFFFF',
    '#0000FF',
    '#FFFF00',
    '#FF6B8A',
    '#24BCA0',
  ]) {
    expect(
      contrast(accessibleAccent(color, true), '#FFFFFF'),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(accessibleAccent(color, false), '#22202E'),
    ).toBeGreaterThanOrEqual(4.5)
  }
})

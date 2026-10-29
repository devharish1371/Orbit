/** Guard against accidentally bundling a server key under a VITE_ variable. */
export function isPublicKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) return true
  try {
    const payload = key.split('.')[1]
    if (!payload) return false
    const value = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { role?: string }
    return value.role === 'anon'
  } catch {
    return false
  }
}

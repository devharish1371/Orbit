import { createContext } from 'react'
export const PortraitContext = createContext<string | null>(null)
// History can outlive a document; a previous page's React id must not match a new header.
const documentNonce = crypto.randomUUID().replace(/-/g, '')
export function createPortraitName(uid: string) {
  return `orbit-portrait-${documentNonce}-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`
}
export function portraitName(value: unknown): string | null {
  return typeof value === 'string' &&
    /^orbit-portrait-[a-zA-Z0-9_-]{1,80}$/.test(value)
    ? value
    : null
}

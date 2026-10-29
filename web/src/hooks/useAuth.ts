import { useContext } from 'react'
import { AuthContext } from '@/app/AuthContext'
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}

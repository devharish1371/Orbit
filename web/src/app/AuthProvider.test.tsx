import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { beforeEach, expect, test, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from '@/hooks/useAuth'
import type { OrbitClient } from '@/lib/supabase'
const local = vi.hoisted(() => ({ clear: vi.fn(), push: vi.fn() }))
vi.mock('@/features/outbox/store', () => ({
  outboxStore: { clearAll: local.clear },
}))
vi.mock('@/native/push', () => ({ disablePush: local.push }))
beforeEach(() => {
  local.clear.mockReset().mockResolvedValue(undefined)
  local.push.mockReset().mockResolvedValue(undefined)
})
function Consumer() {
  const { session, restoring, signOut } = useAuth()
  return (
    <>
      <p>{restoring ? 'Restoring' : (session?.user.id ?? 'Signed out')}</p>
      <button
        onClick={() => {
          void signOut()
        }}
      >
        Log out
      </button>
    </>
  )
}
test('restores a saved session without requesting OTP and clears cache on explicit logout', async () => {
  const requestOtp = vi.fn()
  const signOut = vi.fn().mockResolvedValue({ error: null })
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'saved-member' } } as Session },
      }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut,
      signInWithOtp: requestOtp,
    },
  } as unknown as OrbitClient
  const query = new QueryClient()
  query.setQueryData(['private-profile'], { private: true })
  render(
    <QueryClientProvider client={query}>
      <AuthProvider client={client}>
        <Consumer />
      </AuthProvider>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('saved-member')).toBeVisible()
  expect(requestOtp).not.toHaveBeenCalled()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Log out' }))
  expect(await screen.findByText('Signed out')).toBeVisible()
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  expect(query.getQueryData(['private-profile'])).toBeUndefined()
})

test('a temporary refresh failure preserves a reconnect flow instead of requesting a new OTP', async () => {
  function Status() {
    const { restoring, restoreError } = useAuth()
    return (
      <p>
        {restoring
          ? 'Restoring'
          : restoreError
            ? 'Reconnect saved session'
            : 'Ready'}
      </p>
    )
  }
  const requestOtp = vi.fn()
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: { name: 'AuthRetryableFetchError', status: 0 },
      }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOtp: requestOtp,
    },
  } as unknown as OrbitClient
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider client={client}>
        <Status />
      </AuthProvider>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Reconnect saved session')).toBeVisible()
  expect(requestOtp).not.toHaveBeenCalled()
})
test.each(['push', 'clear'] as const)(
  'failed %s cleanup preserves login and signals the stopped outbox to restart',
  async (step) => {
    local[step].mockRejectedValueOnce(new Error('CLEANUP_UNAVAILABLE'))
    const stopped = vi.fn(),
      restart = vi.fn(),
      signedOut = vi.fn()
    window.addEventListener('orbit-signing-out', stopped)
    window.addEventListener('orbit-signout-failed', restart)
    function Failure() {
      const { session, signOut } = useAuth()
      return (
        <>
          <p>{session?.user.id}</p>
          <button
            onClick={() => {
              void signOut().catch(() => {})
            }}
          >
            Try logout
          </button>
        </>
      )
    }
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'saved-member' } } },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signOut: signedOut,
      },
    } as unknown as OrbitClient
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider client={client}>
          <Failure />
        </AuthProvider>
      </QueryClientProvider>,
    )
    await screen.findByText('saved-member')
    await userEvent.click(screen.getByRole('button', { name: 'Try logout' }))
    expect(stopped).toHaveBeenCalledOnce()
    expect(local.clear).toHaveBeenCalledOnce()
    expect(signedOut).not.toHaveBeenCalled()
    expect(restart).toHaveBeenCalledOnce()
    expect(screen.getByText('saved-member')).toBeVisible()
    window.removeEventListener('orbit-signing-out', stopped)
    window.removeEventListener('orbit-signout-failed', restart)
  },
)

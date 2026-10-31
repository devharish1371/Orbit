import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { AuthContext, type AuthValue } from '@/app/AuthContext'
import LoginPage from '@/features/auth/LoginPage'
import type { OrbitClient } from '@/lib/supabase'

function setup() {
  const send = vi.fn().mockResolvedValue({ error: null })
  const verify = vi.fn().mockResolvedValue({ error: null })
  const value: AuthValue = {
    client: {
      auth: { signInWithOtp: send, verifyOtp: verify },
    } as unknown as OrbitClient,
    session: null,
    restoring: false,
    restoreError: false,
    retryRestore: vi.fn(),
    signOut: vi.fn(),
  }
  render(
    <AuthContext.Provider value={value}>
      <LoginPage />
    </AuthContext.Provider>,
  )
  return { send, verify }
}
test('login validation prevents network requests for invalid email', async () => {
  const { send } = setup()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Send my code' }))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Enter a valid email address.',
  )
  expect(send).not.toHaveBeenCalled()
})
test('requests a code only for an existing account and validates all eight digits', async () => {
  const { send, verify } = setup()
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email address'), 'test@example.com')
  await user.click(screen.getByRole('button', { name: 'Send my code' }))
  expect(send).toHaveBeenCalledWith({
    email: 'test@example.com',
    options: { shouldCreateUser: false },
  })
  await user.type(screen.getByLabelText('Sign-in code'), '1234')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(verify).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('Enter all 8 digits')
})
test('expired codes produce a recoverable error and can be replaced', async () => {
  const { verify } = setup()
  verify.mockResolvedValue({ error: new Error('expired') })
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email address'), 'test@example.com')
  await user.click(
    screen.getByRole('button', { name: 'I already have a code' }),
  )
  await user.type(screen.getByLabelText('Sign-in code'), '12345678')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('expired')
  expect(
    screen.getByRole('button', { name: 'Send another code' }),
  ).toBeEnabled()
})

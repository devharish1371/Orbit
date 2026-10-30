import { Component, type ReactNode } from 'react'
import { copy } from '@/copy/en'
import { UpdatePrompt } from './UpdatePrompt'

// The update action must survive a lazy route failure after a website deployment.
export function AppBoundary({ children }: { children: ReactNode }) {
  return (
    <>
      <ErrorBoundary>{children}</ErrorBoundary>
      <UpdatePrompt />
    </>
  )
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fallback">
          <h1>{copy.common.unavailable}</h1>
          <p>{copy.common.error}</p>
          <button className="button" onClick={() => location.reload()}>
            {copy.common.reload}
          </button>
        </main>
      )
    return this.props.children
  }
}

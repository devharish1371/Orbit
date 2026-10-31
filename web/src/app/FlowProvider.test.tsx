import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'
import { FlowProvider } from './FlowProvider'
import { useComposerMemory } from '@/hooks/useComposerMemory'
import { JourneyLink, BackLink } from '@/components/ui/JourneyLink'
function Draft() {
  const { field } = useComposerMemory('chat')
  const [body, setBody] = field('body'),
    [attachment, setAttachment] = field('attachment')
  return (
    <>
      <input
        aria-label="Message"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        onClick={() =>
          setAttachment({ blob: new Blob(['voice']), extension: 'webm' })
        }
      >
        Attach
      </button>
      <span>{attachment ? 'Voice draft' : 'No attachment'}</span>
      <JourneyLink to="/us">Us</JourneyLink>
    </>
  )
}
function App({ owner }: { owner: string }) {
  return (
    <FlowProvider key={owner}>
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="chat" element={<Draft />} />
          <Route path="us" element={<BackLink fallback="/" />} />
        </Routes>
      </MemoryRouter>
    </FlowProvider>
  )
}
test('navigation preserves unsent text/media, while a different signed-in shell starts empty', async () => {
  const user = userEvent.setup()
  const view = render(<App owner="first" />)
  await user.type(screen.getByLabelText('Message'), 'Not sent')
  await user.click(screen.getByRole('button', { name: 'Attach' }))
  await user.click(screen.getByRole('link', { name: 'Us' }))
  await user.click(screen.getByRole('link', { name: 'Back' }))
  expect(screen.getByLabelText('Message')).toHaveValue('Not sent')
  expect(screen.getByText('Voice draft')).toBeVisible()
  view.rerender(<App owner="second" />)
  expect(screen.getByLabelText('Message')).toHaveValue('')
  expect(screen.getByText('No attachment')).toBeVisible()
})
test('a directly opened secondary screen has a predictable fallback', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/photo']}>
      <Routes>
        <Route path="photo" element={<BackLink fallback="/us" />} />
        <Route path="us" element={<h1>Us</h1>} />
      </Routes>
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('link', { name: 'Back' }))
  expect(screen.getByRole('heading', { name: 'Us' })).toBeVisible()
})

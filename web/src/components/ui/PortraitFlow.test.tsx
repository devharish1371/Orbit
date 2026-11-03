import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { expect, test } from 'vitest'
import { Avatar } from './Avatar'
import { JourneyLink } from './JourneyLink'
import { portraitName } from '@/app/PortraitContext'
const id = '11111111-1111-4111-8111-111111111111'
function Destination() {
  const location = useLocation()
  return (
    <>
      <h1>Profile</h1>
      <Avatar
        name="Person"
        color="#a45d7a"
        transitionName={portraitName(location.state?.orbitPortrait)}
      />
      <output>{JSON.stringify(location.state)}</output>
    </>
  )
}
test('repeated portraits have unique keys and only the selected link hands its key to the profile', async () => {
  const view = render(
    <MemoryRouter initialEntries={['/moments']}>
      <JourneyLink aria-label="Header profile" to={'/person/' + id}>
        <Avatar name="Me" color="#a45d7a" />
      </JourneyLink>
      <Routes>
        <Route
          path="/moments"
          element={
            <>
              {[1, 2].map((item) => (
                <JourneyLink
                  key={item}
                  aria-label={'Portrait ' + item}
                  to={'/person/' + id}
                  state={{ retained: 'yes' }}
                >
                  <Avatar name="Person" color="#a45d7a" />
                </JourneyLink>
              ))}
            </>
          }
        />
        <Route path="/person/:id" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  )
  const keys = [...view.container.querySelectorAll('[data-portrait-key]')].map(
    (node) => node.getAttribute('data-portrait-key'),
  )
  expect(new Set(keys).size).toBe(3)
  const selected = screen
    .getByRole('link', { name: 'Portrait 2' })
    .querySelector('.avatar')
    ?.getAttribute('data-portrait-key')
  const modified = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
    button: 1,
  })
  fireEvent(screen.getByRole('link', { name: 'Portrait 2' }), modified)
  expect(modified.defaultPrevented).toBe(false)
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('link', { name: 'Portrait 2' }))
  expect(screen.getByRole('heading', { name: 'Profile' })).toBeVisible()
  expect(view.container.querySelectorAll('[data-portrait-key]')).toHaveLength(1)
  expect(view.container.querySelector('[data-portrait-key]')).toHaveAttribute(
    'data-portrait-key',
    selected,
  )
  expect(screen.getByRole('status')).toHaveTextContent('"retained":"yes"')
  expect(screen.getByRole('status')).toHaveTextContent('"orbitFrom":"/moments"')
  expect(portraitName('other-name')).toBeNull()
})

import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from '@/App'

test('the initial shell renders an accessible welcome without account credentials', () => {
  render(<App />)
  expect(screen.getByRole('main')).toBeInTheDocument()
  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'A little closer, every day.',
    }),
  ).toBeVisible()
})

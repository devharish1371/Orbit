import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test } from 'vitest'
import { selectedSample, type Journey, type TrailFix } from '@/lib/journeys'
import { JourneyPlayer } from './JourneyPlayer'
const points = [0, 2, 8].map((minute) => ({
  lat: 13 + minute * 0.001,
  lng: 80,
  accuracy_m: 12,
  speed_mps: 1,
  recorded_at: `2026-11-04T10:0${minute}:00Z`,
}))
const journey: Journey = {
  id: points[0]!.recorded_at,
  points,
  metres: 800,
  seconds: 480,
  mode: 'walk',
  state: 'gap',
  started: points[0]!.recorded_at,
  ended: points[2]!.recorded_at,
}
function Fixture() {
  const [sample, setSample] = useState<TrailFix>(points[0]!)
  return (
    <JourneyPlayer
      journey={journey}
      sample={sample}
      onSample={setSample}
      timezone="Asia/Kolkata"
      onClose={() => {}}
    />
  )
}
test('scrubbing and next/previous select real samples with truthful local times, including irregular intervals', async () => {
  render(<Fixture />)
  expect(
    screen.getByRole('button', { name: 'Previous recorded location' }),
  ).toBeDisabled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Next recorded location' }),
  )
  expect(screen.getByRole('slider')).toHaveValue('1')
  expect(screen.getByRole('slider')).toHaveAttribute(
    'aria-valuetext',
    '3:32:00 pm, sample 2 of 3',
  )
  fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } })
  expect(screen.getByRole('slider')).toHaveAttribute(
    'aria-valuetext',
    '3:38:00 pm, sample 3 of 3',
  )
  expect(
    screen.getByRole('button', { name: 'Next recorded location' }),
  ).toBeDisabled()
  expect(screen.getByText('GPS samples · Signal ended')).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: 'Previous recorded location' }),
  )
  expect(screen.getByRole('slider')).toHaveValue('1')
})
test('sample identity survives a data refresh; removed samples fall back to a recorded fix and missing journeys expose none', () => {
  expect(selectedSample(journey, points[1]!.recorded_at)).toBe(points[1])
  expect(
    selectedSample(
      { ...journey, points: [points[0]!, points[2]!] },
      points[1]!.recorded_at,
    ),
  ).toBe(points[2])
  expect(selectedSample(undefined, points[1]!.recorded_at)).toBeUndefined()
})

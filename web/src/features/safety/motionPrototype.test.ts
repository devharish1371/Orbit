import { expect, test } from 'vitest'
import { motionCandidate, syntheticMotion } from './motionPrototype'
test('stillness alone does not qualify; phone drop deliberately demonstrates the same ambiguous candidate', () => {
  expect(motionCandidate(syntheticMotion('still'))).toBe(false)
  expect(motionCandidate(syntheticMotion('impact'))).toBe(true)
  expect(motionCandidate(syntheticMotion('drop'))).toBe(true)
})
test('isolated impact, free fall without stillness and interrupted/invalid streams fail closed', () => {
  expect(
    motionCandidate([
      { ms: 0, acceleration: 9.81 },
      { ms: 20, acceleration: 40 },
    ]),
  ).toBe(false)
  const trace = syntheticMotion('impact')
  expect(motionCandidate(trace.slice(0, 100))).toBe(false)
  expect(
    motionCandidate(
      trace.map((s, i) => ({ ...s, ms: s.ms + (i > 50 ? 1000 : 0) })),
    ),
  ).toBe(false)
  expect(
    motionCandidate([
      ...trace.slice(0, 50),
      { ms: 200, acceleration: 9.81 },
      ...trace.slice(50),
    ]),
  ).toBe(false)
  expect(motionCandidate([{ ms: 0, acceleration: NaN }])).toBe(false)
})

import { useState } from 'react'
import { Activity, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motionCandidate, syntheticMotion } from './motionPrototype'
export function MotionLab() {
  const [kind, setKind] = useState<'still' | 'impact' | 'drop'>('still'),
    [result, setResult] = useState<boolean | null>(null),
    [dismissed, setDismissed] = useState(false)
  return (
    <details className="safety-lab">
      <summary>
        <Activity size={20} aria-hidden="true" />
        <span>Motion lab</span>
        <span className="safety-badge">Prototype</span>
      </summary>
      <p className="muted small">
        Synthetic traces only. Your phone’s sensors stay off.
      </p>
      <div
        className="safety-duration"
        role="group"
        aria-label="Synthetic motion trace"
      >
        {(['still', 'impact', 'drop'] as const).map((value) => (
          <button
            key={value}
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value)
              setResult(null)
              setDismissed(false)
            }}
          >
            {value === 'still'
              ? 'Still'
              : value === 'impact'
                ? 'Impact + stillness'
                : 'Phone drop'}
          </button>
        ))}
      </div>
      <Button
        className="button-secondary"
        onClick={() => {
          setResult(motionCandidate(syntheticMotion(kind)))
          setDismissed(false)
        }}
      >
        <RotateCcw size={16} aria-hidden="true" />
        Run simulation
      </Button>
      {result !== null && (
        <div role="status" className="safety-simulation">
          {dismissed ? (
            'Simulation dismissed. Nothing was sent.'
          ) : result ? (
            <>
              <strong>Simulated check-in prompt</strong>
              <p>
                A phone drop can produce the same signal. This cannot establish
                a person’s fall.
              </p>
              <button
                className="text-button"
                onClick={() => setDismissed(true)}
              >
                I’m okay · dismiss simulation
              </button>
            </>
          ) : (
            <p>No candidate in this trace.</p>
          )}
        </div>
      )}
      <p className="muted small">
        No real monitoring or automatic partner alert. Device, false-positive
        and battery testing come first. Never fall or drop a phone to test it.
      </p>
    </details>
  )
}

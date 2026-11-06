import { useComfort, type TextSize } from '@/hooks/useComfort'
import './comfort.css'
export function ComfortControls() {
  const { text, motion, reduced, setComfort } = useComfort()
  return (
    <section
      className="settings-section comfort-controls"
      aria-labelledby="comfort-heading"
    >
      <h2 id="comfort-heading">Reading & motion</h2>
      <fieldset>
        <legend>Text size</legend>
        <div className="comfort-options">
          {(
            [
              { value: 'standard', label: 'Standard' },
              { value: 'larger', label: 'Larger' },
              { value: 'largest', label: 'Largest' },
            ] as { value: TextSize; label: string }[]
          ).map((item) => (
            <button
              type="button"
              key={item.value}
              aria-pressed={text === item.value}
              onClick={() => setComfort({ text: item.value })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Motion</legend>
        <div className="comfort-options">
          <button
            type="button"
            aria-pressed={motion === 'system'}
            onClick={() => setComfort({ motion: 'system' })}
          >
            Follow phone
          </button>
          <button
            type="button"
            aria-pressed={motion === 'reduced'}
            onClick={() => setComfort({ motion: 'reduced' })}
          >
            Less motion
          </button>
        </div>
      </fieldset>
      <p className="muted small">
        On this device.
        {motion === 'system' && reduced
          ? ' Your phone has reduced motion on.'
          : ''}
      </p>
    </section>
  )
}

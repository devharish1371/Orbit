import { Check, Moon, Sun, Monitor } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Theme } from '@/hooks/useTheme'
import { copy } from '@/copy/en'

export function ThemePicker({
  value,
  onChange,
  disabled = false,
  accent,
}: {
  value: Theme
  onChange: (theme: Theme) => void
  disabled?: boolean
  accent?: string
}) {
  return (
    <div
      className="theme-studio"
      style={
        accent ? ({ '--preview-accent': accent } as CSSProperties) : undefined
      }
    >
      {(['light', 'dark', 'system'] as const).map((mode) => {
        const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor
        return (
          <button
            key={mode}
            type="button"
            className="theme-sample"
            data-mode={mode}
            aria-pressed={value === mode}
            disabled={disabled}
            onClick={() => onChange(mode)}
          >
            <span className="theme-miniature" aria-hidden="true">
              <i className="mini-planet" />
              <i className="mini-planet" />
              <i className="mini-line" />
              <i className="mini-line" />
              <i className="mini-dock" />
            </span>
            <span className="theme-sample-label">
              <Icon size={15} aria-hidden="true" />
              {copy.common[mode]}
              {value === mode && <Check size={14} aria-hidden="true" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

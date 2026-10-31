import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'

export type Choice = {
  value: string
  label: string
  note?: string
  disabled?: boolean
}

/** A short, native modal choice sheet. Native dialog supplies inertness and focus containment. */
export function ChoiceSelect({
  id,
  name,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  id?: string
  name?: string
  label: string
  value: string
  options: Choice[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const uid = useId()
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const selected = options.find((option) => option.value === value)
  return (
    <>
      {name && (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      )}
      <button
        ref={trigger}
        id={id}
        type="button"
        className="choice-trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={uid}
        aria-label={`${label}: ${selected?.label ?? 'Choose'}`}
        onClick={() => {
          dialog.current?.showModal()
          setOpen(true)
          dialog.current
            ?.querySelector<HTMLButtonElement>('[data-selected="true"]')
            ?.focus()
        }}
      >
        <span>{selected?.label ?? 'Choose'}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          id={uid}
          className="choice-sheet"
          aria-labelledby={`${uid}-title`}
          onClose={() => {
            setOpen(false)
            trigger.current?.focus({ preventScroll: true })
          }}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            if (
              event.target === event.currentTarget &&
              (event.clientX < box.left ||
                event.clientX > box.right ||
                event.clientY < box.top ||
                event.clientY > box.bottom)
            )
              event.currentTarget.close()
          }}
        >
          <header>
            <h2 id={`${uid}-title`}>{label}</h2>
            <button
              className="icon-button"
              type="button"
              aria-label="Close choices"
              onClick={() => dialog.current?.close()}
            >
              <X size={20} />
            </button>
          </header>
          <div
            className="choice-list"
            onKeyDown={(event) => {
              const buttons = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  'button:not(:disabled)',
                ),
              )
              const index = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              )
              const next =
                event.key === 'ArrowDown'
                  ? (index + 1) % buttons.length
                  : event.key === 'ArrowUp'
                    ? (index - 1 + buttons.length) % buttons.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? buttons.length - 1
                        : -1
              if (next >= 0) {
                event.preventDefault()
                buttons[next]?.focus()
              }
            }}
          >
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                disabled={option.disabled}
                aria-pressed={value === option.value}
                data-selected={value === option.value}
                onClick={() => {
                  onChange(option.value)
                  dialog.current?.close()
                }}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.note && <small>{option.note}</small>}
                </span>
                <span className="choice-check" aria-hidden="true">
                  {value === option.value && <Check size={18} />}
                </span>
              </button>
            ))}
          </div>
        </dialog>,
        document.body,
      )}
    </>
  )
}

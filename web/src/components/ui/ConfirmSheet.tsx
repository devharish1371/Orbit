import { DialogSheet } from './DialogSheet'
import { Button } from './Button'
import { copy } from '@/copy/en'

export function ConfirmSheet({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  error,
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  error?: string
}) {
  return (
    <DialogSheet
      title={title}
      onClose={onCancel}
      dismissible={!busy}
      className="confirmation-sheet"
    >
      <p className="muted confirmation-body">{description}</p>
      {error && (
        <p role="alert" className="form-message">
          {error}
        </p>
      )}
      <div className="confirmation-actions">
        <Button
          type="button"
          className="button-secondary"
          disabled={busy}
          onClick={onCancel}
        >
          {copy.posts.cancel}
        </Button>
        <Button
          type="button"
          className="button-danger"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? copy.common.saving : confirmLabel}
        </Button>
      </div>
    </DialogSheet>
  )
}

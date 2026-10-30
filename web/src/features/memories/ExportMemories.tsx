import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { memories as text } from '@/copy/memories'
import { exportMemories } from '@/lib/export-memories'
import { saveMemoryZip } from '@/native/privacy'
import { Button } from '@/components/ui/Button'
export function ExportMemories() {
  const { client } = useAuth(),
    operation = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [progress, setProgress] = useState('')
  useEffect(() => () => operation.current?.abort(), [])
  async function run() {
    if (operation.current) return
    const controller = new AbortController()
    operation.current = controller
    setBusy(true)
    setMessage('')
    setProgress('')
    try {
      const archive = await exportMemories(
        client,
        controller.signal,
        (done, total) => setProgress(`${done} / ${total}`),
      )
      await saveMemoryZip(archive, controller.signal)
      setMessage(text.exportDone)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setMessage(text.exportFailed)
    } finally {
      operation.current = null
      setBusy(false)
      setProgress('')
    }
  }
  return (
    <section className="glass memory-section">
      <h2>{text.export}</h2>
      <p className="muted small">{text.exportHint}</p>
      <Button
        disabled={busy}
        onClick={() => {
          void run()
        }}
      >
        {busy ? text.exportBusy : text.exportStart}
      </Button>
      {busy && (
        <>
          <p role="status">{progress}</p>
          <button
            className="text-button"
            onClick={() => operation.current?.abort()}
          >
            {text.exportCancel}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  )
}

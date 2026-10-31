import { ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { Button } from '@/components/ui/Button'
import { dailyQuestions, memories as text } from '@/copy/memories'
import { useAnswers, useDailyQuestion } from './useMemories'
export function DailyQuestion() {
  const daily = useDailyQuestion(),
    answers = useAnswers(daily.data?.day)
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const [answering, setAnswering] = useState(false)
  const answerField = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (answering) answerField.current?.focus()
  }, [answering])
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  const own = answers.data?.find((row) => row.user_id === session?.user.id)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget,
      answer = String(new FormData(form).get('answer') ?? '').trim()
    if (!answer || busy) return
    setBusy(true)
    setMessage('')
    try {
      const result = await client.rpc('answer_daily_question', {
        p_answer: answer,
      })
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['question-answers'] })
      await query.invalidateQueries({ queryKey: ['daily-question'] })
      form.reset()
    } catch {
      setMessage(text.failed)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="glass memory-section daily-question">
      <span className="question-watermark" aria-hidden="true">
        ?
      </span>
      <p className="eyebrow">{text.question}</p>
      {daily.data && <h2>{dailyQuestions[daily.data.question_idx]}</h2>}
      {(daily.isPending || (daily.data && answers.isPending)) && (
        <p role="status">Loading today’s question…</p>
      )}
      {(daily.error || answers.error) && (
        <button
          className="text-button"
          onClick={() => {
            void daily.refetch()
            void answers.refetch()
          }}
        >
          {text.failed} Retry
        </button>
      )}
      {daily.data && !answers.isPending && !answers.error && !own && (
        <div>
          {!answering && (
            <button
              className="question-answer-button"
              type="button"
              onClick={() => setAnswering(true)}
            >
              <span className="question-answer-label">{text.answerAction}</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          )}
          <form
            hidden={!answering}
            key={daily.data.day}
            onSubmit={(event) => {
              void submit(event)
            }}
          >
            <label htmlFor="daily-answer">{text.answer}</label>
            <textarea
              ref={answerField}
              id="daily-answer"
              name="answer"
              required
              maxLength={1000}
              rows={3}
            />
            <p className="muted small">{text.answerHint}</p>
            <Button disabled={busy}>
              {busy ? 'Saving…' : text.sealAnswer}
            </Button>
          </form>
        </div>
      )}
      {answers.data?.map((row) => (
        <div key={row.user_id} className="daily-answer">
          <strong>
            {row.user_id === session?.user.id
              ? text.you
              : space?.self.partner_nickname ||
                space?.partner?.nickname ||
                space?.partner?.display_name}
          </strong>
          <p className="post-body">{row.answer}</p>
        </div>
      ))}
      {own && answers.data?.length === 1 && (
        <p className="muted small">{text.waiting}</p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  )
}

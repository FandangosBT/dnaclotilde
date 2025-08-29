import React, { useState } from 'react'
import { useHoverControls } from '../hooks/useHoverControls'

interface FeedbackButtonsProps {
  disabled?: boolean
  onFeedback: (rating: 'up' | 'down', reason?: string) => void
}

export default function FeedbackButtons({ disabled, onFeedback }: FeedbackButtonsProps) {
  const [selected, setSelected] = useState<'up' | 'down' | null>(null)
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState('')

  const { hoverIn, hoverOut, pressIn, pressOut } = useHoverControls()

  const handleClick = (rating: 'up' | 'down') => {
    if (disabled) return
    setSelected(rating)
    onFeedback(rating)
  }

  const submitReason = () => {
    if (!selected || disabled) return
    const r = reason.trim()
    if (!r) return
    onFeedback(selected, r)
    setShowReason(false)
    setReason('')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Feedback positivo"
        aria-pressed={selected === 'up'}
        title="Gostei"
        className={`${selected === 'up' ? 'border-gold bg-gold text-black' : 'border-border bg-surface-1 text-secondary hover:bg-surface-2'} ring-gold rounded-md border px-2 py-1 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2 disabled:opacity-60`}
        onMouseEnter={(e) => !disabled && hoverIn(e.currentTarget)}
        onMouseLeave={(e) => hoverOut(e.currentTarget)}
        onMouseDown={(e) => !disabled && pressIn(e.currentTarget)}
        onMouseUp={(e) => pressOut(e.currentTarget)}
        onClick={() => handleClick('up')}
        disabled={disabled}
      >
        👍
      </button>
      <button
        type="button"
        aria-label="Feedback negativo"
        aria-pressed={selected === 'down'}
        title="Não gostei"
        className={`${selected === 'down' ? 'border-danger bg-danger text-primary' : 'border-border bg-surface-1 text-secondary hover:bg-surface-2'} ring-gold rounded-md border px-2 py-1 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2 disabled:opacity-60`}
        onMouseEnter={(e) => !disabled && hoverIn(e.currentTarget)}
        onMouseLeave={(e) => hoverOut(e.currentTarget)}
        onMouseDown={(e) => !disabled && pressIn(e.currentTarget)}
        onMouseUp={(e) => pressOut(e.currentTarget)}
        onClick={() => handleClick('down')}
        disabled={disabled}
      >
        👎
      </button>

      {selected && !showReason && (
        <button
          type="button"
          className="text-secondary hover:text-primary ring-gold rounded-sm text-xs underline underline-offset-2 focus:outline-none focus-visible:ring-1"
          onClick={() => setShowReason(true)}
          aria-expanded={showReason}
          aria-controls="feedback-reason-section"
          disabled={disabled}
        >
          Adicionar motivo (opcional)
        </button>
      )}

      {showReason && (
        <div
          id="feedback-reason-section"
          className="flex items-center gap-2"
          role="region"
          aria-label="Justificativa do feedback"
        >
          <input
            aria-label="Motivo do feedback"
            placeholder="O que posso melhorar?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border-border bg-surface-1 text-primary placeholder-muted ring-gold w-48 rounded-md border px-2 py-1 text-xs focus:outline-none focus-visible:ring-2"
            maxLength={500}
            disabled={disabled}
          />
          <button
            type="button"
            className="border-gold bg-gold ring-gold rounded-md border px-2 py-1 text-xs text-black focus:outline-none focus-visible:ring-2 disabled:opacity-60"
            onClick={submitReason}
            disabled={disabled || reason.trim().length === 0}
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  )
}

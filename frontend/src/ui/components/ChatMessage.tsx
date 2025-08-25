import React from 'react'
import { Message } from '../../store'
// Removendo FeedbackButtons import para reduzir UI, mantendo thumbs minimalistas no hover
import { useHoverControls } from '../hooks/useHoverControls'
import SuggestionsChips from './SuggestionsChips'
import { gsap } from 'gsap'
import { useMotionSafe } from '../hooks/useMotionSafe'
import TypingIndicator from './TypingIndicator'
import { useChatStore } from '../../store'

interface ChatMessageProps {
  message: Message
  onCopy: (text: string) => void
  isLast?: boolean
  streaming?: boolean
  onFeedback?: (rating: 'up' | 'down') => void
  onRegenerate?: () => void
  onSuggest?: (prompt: string) => void
  groupedWithPrev?: boolean
  showAvatar?: boolean
}

export default function ChatMessage({
  message,
  onCopy,
  isLast,
  streaming,
  onFeedback,
  onRegenerate,
  onSuggest,
  groupedWithPrev = false,
  showAvatar,
}: ChatMessageProps) {
  const isAssistant = message.role === 'assistant'
  const density = useChatStore((s) => s.density)
  const userBubbleTone = useChatStore((s) => s.userBubbleTone)

  const liveAttrs =
    isAssistant && isLast && streaming
      ? { 'aria-live': 'polite' as const, role: 'status' as const }
      : {}

  const formatTime = (ts?: string) => {
    try {
      if (!ts) return ''
      const d = new Date(ts)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const containerRef = React.useRef<HTMLDivElement>(null)
  const timestampRef = React.useRef<HTMLDivElement>(null)
  // Substitui controles manuais por hook reutilizável com GSAP
  const { bind, hoverIn, hoverOut, pressIn, pressOut } = useHoverControls({
    hoverScale: 1.06,
    pressScale: 0.96,
    hoverDuration: 0.3,
    pressDuration: 0.18,
  })

  const motionSafe = useMotionSafe()
  const avatarRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!containerRef.current) return
    if (!motionSafe) return
    gsap.fromTo(
      containerRef.current,
      { y: 8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' },
    )
  }, [motionSafe])

  React.useEffect(() => {
    const el = avatarRef.current
    if (!el) return
    if (!motionSafe) return
    if (isAssistant && isLast && streaming) {
      const tween = gsap.to(el, {
        scale: 1.06,
        duration: 0.5,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: -1,
      })
      return () => {
        tween.kill()
        gsap.set(el, { clearProps: 'transform' })
      }
    } else {
      gsap.killTweensOf(el)
      gsap.set(el, { clearProps: 'transform' })
    }
  }, [isAssistant, isLast, streaming, motionSafe])
  const showRegen = !!onRegenerate && isAssistant && isLast && !streaming

  const rowClass = `w-full flex items-end gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`
  const avatarClass = 'mt-1 order-1 justify-self-start'
  const bubbleWrapClass = `flex flex-col gap-2 ${groupedWithPrev ? '-mt-2' : ''}`

  // Renderização inline com **negrido** em dourado
  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, idx) => {
      const m = part.match(/^\*\*([^*]+)\*\*$/)
      if (m) {
        return (
          <span key={idx} className="text-gold font-semibold">
            {m[1]}
          </span>
        )
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>
    })
  }

  // Quebra em blocos: parágrafos e listas numeradas com indentação e espaçamento
  const blocks = React.useMemo(() => {
    const text = message.content || ''
    const lines = text.split('\n')
    const els: React.ReactNode[] = []
    let listBuffer: string[] = []

    const flushList = () => {
      if (listBuffer.length) {
        els.push(
          <ol key={`ol-${els.length}`} className="ml-5 list-decimal space-y-1">
            {listBuffer.map((li, i) => (
              <li key={`li-${i}`}>{formatInline(li)}</li>
            ))}
          </ol>,
        )
        listBuffer = []
      }
    }

    lines.forEach((line, idx) => {
      if (/^\s*\d+\.\s+/.test(line)) {
        listBuffer.push(line.replace(/^\s*\d+\.\s+/, ''))
      } else {
        flushList()
        const isTitleLine =
          isAssistant && (/(\?)\s*$/.test(line) || (idx === 0 && line.length <= 80))
        const pClass = `${!isAssistant ? 'text-right' : ''} ${isTitleLine ? 'font-semibold' : ''}`
          .trim()
        els.push(
          <p key={`p-${idx}`} className={pClass || undefined}>
            {formatInline(line)}
          </p>,
        )
      }
    })
    flushList()

    return els
  }, [message.content, isAssistant])

  const paddingClass = density === 'compact' ? 'p-3' : density === 'spacious' ? 'p-5' : 'p-4'
  const userToneClass = !isAssistant
    ? userBubbleTone === 'bold'
      ? 'border-gold/60 bg-gold-40'
      : 'border-gold/40 bg-gold/10'
    : ''

  React.useEffect(() => {
    if (!timestampRef.current) return
    if (!motionSafe) return
    gsap.fromTo(
      timestampRef.current,
      { y: 4, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out' },
    )
  }, [message.timestamp, motionSafe])

  const shouldShowAvatar = showAvatar ?? isAssistant

  return (
    <div className={rowClass}>
      {isAssistant && shouldShowAvatar && (
        <div className={avatarClass}>
          <div
            ref={avatarRef}
            className={`border-border bg-surface-1 flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] ${isAssistant ? 'text-gold' : 'text-primary'}`}
            aria-hidden
          >
            AI
          </div>
        </div>
      )}
      <div className={bubbleWrapClass}>
        <div
          ref={containerRef}
          className={`group relative border ${paddingClass} max-w-[90%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl text-primary transition-colors will-change-transform focus-within:ring-2 ring-gold shadow-sm ${
            isAssistant
              ? 'bg-surface-1 border-border'
              : `${userToneClass} mr-4 md:mr-6 min-w-[180px] pr-10`
          } ${groupedWithPrev ? 'rounded-t-md' : ''}`}
          {...liveAttrs}
          data-testid="chat-message"
        >
          {!groupedWithPrev && (
            <div className="mb-1 flex items-center gap-2">
              <div className={`text-secondary text-xs ${!isAssistant ? 'text-right w-full pr-8' : ''}`}>
                {isAssistant ? 'Assistente' : 'Visitante'}
              </div>
              <div className={isAssistant ? 'flex-1' : 'hidden'} />
              {streaming && isAssistant && (
                <span aria-live="polite" aria-atomic="false" className="sr-only">
                  gerando…
                </span>
              )}
            </div>
          )}

          {/* Conteúdo da mensagem */}
          <div
            className={`emoji-safe whitespace-pre-wrap break-words text-sm leading-relaxed`}
            data-testid="chat-content"
          >
            {blocks}
          </div>

          {isAssistant && isLast && streaming && (
            <div className="mt-2" aria-hidden>
              <TypingIndicator />
            </div>
          )}

          {/* Timestamp discreto */}
          {message.timestamp && (
            <div
              ref={timestampRef}
              className={`mt-2 text-[11px] leading-none text-secondary/70 ${!isAssistant ? 'text-right pr-1' : 'text-left'}`}
              aria-label={`Enviado às ${formatTime(message.timestamp)}`}
            >
              {formatTime(message.timestamp)}
            </div>
          )}

          {/* Ações no canto superior direito: copiar/feedback/regenerar (visíveis em hover/focus) */}
          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              aria-label="Copiar conteúdo"
              title="Copiar"
              className="border-border bg-surface-1 text-secondary hover:bg-surface-2 ring-gold grid h-7 w-7 place-items-center rounded-md border will-change-transform focus:outline-none focus-visible:ring-2"
              {...bind}
              onClick={() => onCopy(message.content || '')}
            >
              ⧉
            </button>
            {onFeedback && isAssistant && (
              <>
                <button
                  aria-label="Gostei"
                  title="Gostei"
                  className="border-border bg-surface-1 text-secondary hover:bg-surface-2 ring-gold grid h-7 w-7 place-items-center rounded-md border will-change-transform focus:outline-none focus-visible:ring-2"
                  {...bind}
                  onClick={() => onFeedback('up')}
                >
                  👍
                </button>
                <button
                  aria-label="Não gostei"
                  title="Não gostei"
                  className="border-border bg-surface-1 text-secondary hover:bg-surface-2 ring-gold grid h-7 w-7 place-items-center rounded-md border will-change-transform focus:outline-none focus-visible:ring-2"
                  {...bind}
                  onClick={() => onFeedback('down')}
                >
                  👎
                </button>
              </>
            )}
            {showRegen && (
              <button
                aria-label="Regenerar resposta"
                title="Regenerar"
                className="border-border bg-surface-1 text-secondary hover:bg-surface-2 ring-gold grid h-7 w-7 place-items-center rounded-md border will-change-transform focus:outline-none focus-visible:ring-2"
                {...bind}
                onClick={onRegenerate}
              >
                ↺
              </button>
            )}
          </div>

          {/* SuggestionsChips, se houver */}
          {isAssistant && message.suggestions && onSuggest && message.suggestions.length > 0 && (
            <div className="mt-2">
              <SuggestionsChips suggestions={message.suggestions} onSuggest={onSuggest} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
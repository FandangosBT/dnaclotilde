import React, { useEffect, useRef, useState } from 'react'
import { useHoverControls } from '../hooks/useHoverControls'

interface SuggestionsChipsProps {
  suggestions: string[]
  onSuggest: (prompt: string) => void
  disabled?: boolean
}

export default function SuggestionsChips({
  suggestions,
  onSuggest,
  disabled,
}: SuggestionsChipsProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])
  const { hoverIn, hoverOut, pressIn, pressOut } = useHoverControls()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    // Reset refs length quando sugestões mudam
    buttonsRef.current = buttonsRef.current.slice(0, suggestions.length)
    setActiveIndex(null)
  }, [suggestions])

  useEffect(() => {
    if (disabled) setActiveIndex(null)
  }, [disabled])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLButtonElement
    const idx = buttonsRef.current.findIndex((el) => el === target)
    if (idx === -1) return

    // Enter/Espaço aciona o click do chip focado
    if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      if (!target.disabled) {
        target.click()
      }
      return
    }

    // Navegação por setas entre chips
    if (e.key === 'ArrowRight' || (e.key === 'ArrowDown' && e.altKey)) {
      e.preventDefault()
      const next = (idx + 1) % buttonsRef.current.length
      buttonsRef.current[next]?.focus()
    } else if (e.key === 'ArrowLeft' || (e.key === 'ArrowUp' && e.altKey)) {
      e.preventDefault()
      const prev = (idx - 1 + buttonsRef.current.length) % buttonsRef.current.length
      buttonsRef.current[prev]?.focus()
    }
  }

  if (!suggestions || suggestions.length === 0) return null

  return (
    <div
      className="mt-3 flex snap-x snap-proximity flex-nowrap gap-2 overflow-x-auto"
      role="list"
      aria-label="Sugestões de próximo passo"
      onKeyDown={onKeyDown}
    >
      {suggestions.map((sugg, idx) => (
        <button
          key={idx}
          ref={(el) => {
            buttonsRef.current[idx] = el
          }}
          type="button"
          disabled={!!disabled}
          aria-pressed={activeIndex === idx ? true : undefined}
          onClick={() => {
            setActiveIndex(idx)
            onSuggest(sugg)
            // Estado ativo/selecionado temporário para feedback visual
            window.setTimeout(() => setActiveIndex((cur) => (cur === idx ? null : cur)), 1200)
          }}
          className={`ring-gold shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2 disabled:opacity-60 ${
            activeIndex === idx
              ? 'bg-gold border-transparent text-black'
              : 'bg-border-color text-gold hover:border-gold border-transparent'
          }`}
          onMouseEnter={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && hoverIn(e.currentTarget)
          }
          onMouseLeave={(e) => hoverOut(e.currentTarget)}
          onMouseDown={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && pressIn(e.currentTarget)
          }
          onMouseUp={(e) => pressOut(e.currentTarget)}
          title="Inserir sugestão no input"
          aria-label={`Inserir sugestão: ${sugg}`}
          role="button"
        >
          {sugg}
        </button>
      ))}
    </div>
  )
}

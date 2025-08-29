import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useHoverControls } from '../hooks/useHoverControls'

interface TemplatesDrawerProps {
  open: boolean
  mode: string
  loading: boolean
  templates: Record<string, string[]>
  onClose: () => void
  onInsert: (text: string) => void
}

export default function TemplatesDrawer({
  open,
  mode,
  loading,
  templates,
  onClose,
  onInsert,
}: TemplatesDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const firstButtonRef = useRef<HTMLButtonElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const { hoverIn, hoverOut, pressIn, pressOut } = useHoverControls()
  const flatList = useMemo(() => {
    const items: { key: string; label: string }[] = []
    Object.entries(templates).forEach(([categoria, itens]) => {
      itens.forEach((t, idx) => {
        items.push({ key: `${categoria}:${idx}`, label: t })
      })
    })
    return items
  }, [templates])

  useEffect(() => {
    if (!open) return
    setActiveIndex(0)
    // foco inicial no painel
    const to = window.setTimeout(() => {
      ;(firstButtonRef.current ?? panelRef.current)?.focus()
    }, 0)
    return () => window.clearTimeout(to)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (!panelRef.current) return
      // fechar com Escape
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (!flatList.length) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % flatList.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + flatList.length) % flatList.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatList[activeIndex]
        if (item) onInsert(item.label)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, flatList, activeIndex, onClose, onInsert])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Catálogo de templates"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-surface-1 border-border absolute right-0 top-0 h-full w-[360px] overflow-y-auto border-l p-4 shadow-xl focus:outline-none"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="m-0 text-sm">Templates ({mode})</h2>
          <button
            className="border-border bg-surface-3 hover:bg-surface-2 ring-gold rounded-md border px-2 py-1 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2"
            onClick={onClose}
            aria-label="Fechar templates"
            onMouseEnter={(e) => hoverIn(e.currentTarget)}
            onMouseLeave={(e) => hoverOut(e.currentTarget)}
            onMouseDown={(e) => pressIn(e.currentTarget)}
            onMouseUp={(e) => pressOut(e.currentTarget)}
          >
            Fechar
          </button>
        </div>
        {loading && <div className="text-secondary text-xs">Carregando...</div>}
        {!loading && !Object.keys(templates).length && (
          <div className="text-secondary text-xs">Nenhum template disponível.</div>
        )}
        {Object.entries(templates).map(([categoria, itens]) => (
          <div key={categoria} className="mb-4">
            <div className="text-secondary mb-2 text-xs uppercase tracking-wide">{categoria}</div>
            <div className="flex flex-col gap-2">
              {itens.map((t, idx) => {
                const indexInFlat = flatList.findIndex((it) => it.key === `${categoria}:${idx}`)
                const isActive = indexInFlat === activeIndex
                return (
                  <button
                    key={idx}
                    ref={indexInFlat === 0 ? firstButtonRef : null}
                    className={`border-border bg-surface-1 hover:bg-surface-2 text-primary ring-gold rounded-md border px-3 py-2 text-left text-sm transition-colors will-change-transform focus:outline-none focus-visible:ring-2 ${isActive ? 'ring-gold ring-2' : ''}`}
                    onClick={() => onInsert(t)}
                    aria-label={`Template: ${t}`}
                    aria-current={isActive ? 'true' : undefined}
                    onMouseEnter={(e) => hoverIn(e.currentTarget)}
                    onMouseLeave={(e) => hoverOut(e.currentTarget)}
                    onMouseDown={(e) => pressIn(e.currentTarget)}
                    onMouseUp={(e) => pressOut(e.currentTarget)}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

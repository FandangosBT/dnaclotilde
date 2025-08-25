import React, { useEffect } from 'react'
import { useHoverControls } from '../hooks/useHoverControls'

interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
}

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '?' || (e.key === '/' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const { hoverIn, hoverOut, pressIn, pressOut } = useHoverControls()

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
    >
      <div className="border-border bg-surface-1 w-full max-w-md rounded-lg border p-4 shadow-xl">
        <div className="mb-2 flex items-start justify-between">
          <h2 id="shortcuts-title" className="text-base">
            Atalhos de teclado
          </h2>
          <button
            aria-label="Fechar"
            className="border-border bg-surface-3 hover:bg-surface-2 ring-gold rounded-md border px-2 py-1 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2"
            onClick={onClose}
            onMouseEnter={(e) => hoverIn(e.currentTarget)}
            onMouseLeave={(e) => hoverOut(e.currentTarget)}
            onMouseDown={(e) => pressIn(e.currentTarget)}
            onMouseUp={(e) => pressOut(e.currentTarget)}
          >
            Fechar
          </button>
        </div>
        <ul className="space-y-2 text-sm text-white/90">
          <li>
            <span className="bg-surface-3 border-border rounded border px-1.5 py-0.5 font-mono">
              /
            </span>{' '}
            focar o campo de entrada
          </li>
          <li>
            <span className="bg-surface-3 border-border rounded border px-1.5 py-0.5 font-mono">
              Enter
            </span>{' '}
            enviar mensagem
          </li>
          <li>
            <span className="bg-surface-3 border-border rounded border px-1.5 py-0.5 font-mono">
              Esc
            </span>{' '}
            cancelar geração/fechar diálogos
          </li>
          <li>
            <span className="bg-surface-3 border-border rounded border px-1.5 py-0.5 font-mono">
              ?
            </span>{' '}
            abrir/fechar este modal
          </li>
          <li>
            <span className="bg-surface-3 border-border rounded border px-1.5 py-0.5 font-mono">
              ←/→
            </span>{' '}
            navegar chips de sugestão
          </li>
          <li>
            <span className="bg-surface-3 border-border rounded border px-1.5 py-0.5 font-mono">
              Cmd/Ctrl+Enter
            </span>{' '}
            confirmar diálogos
          </li>
        </ul>
      </div>
    </div>
  )
}
import React, { useEffect } from 'react'
import { useHoverControls } from '../hooks/useHoverControls'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

export default function ConfirmDialog({
  open,
  title = 'Confirmação',
  description = 'Tem certeza?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel, onConfirm])

  const { hoverIn, hoverOut, pressIn, pressOut } = useHoverControls()

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60"
    >
      <div className="border-border bg-surface-1 w-full max-w-sm rounded-lg border p-4 shadow-xl">
        <h2 id="confirm-title" className="mb-1 text-base">
          {title}
        </h2>
        {description && <p className="text-secondary mb-4 text-sm">{description}</p>}
        {children}
        <div className="flex justify-end gap-2">
          <button
            autoFocus={!children}
            className="border-border bg-surface-3 hover:bg-surface-2 ring-gold rounded-md border px-3 py-1 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2"
            onClick={onCancel}
            onMouseEnter={(e) => hoverIn(e.currentTarget)}
            onMouseLeave={(e) => hoverOut(e.currentTarget)}
            onMouseDown={(e) => pressIn(e.currentTarget)}
            onMouseUp={(e) => pressOut(e.currentTarget)}
          >
            {cancelText}
          </button>
          <button
            className="border-gold bg-gold hover:bg-gold-hover ring-gold rounded-md border px-3 py-1 text-xs text-black transition-colors will-change-transform focus:outline-none focus-visible:ring-2"
            onClick={onConfirm}
            onMouseEnter={(e) => hoverIn(e.currentTarget)}
            onMouseLeave={(e) => hoverOut(e.currentTarget)}
            onMouseDown={(e) => pressIn(e.currentTarget)}
            onMouseUp={(e) => pressOut(e.currentTarget)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
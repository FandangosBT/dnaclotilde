import React from 'react'
import { useHoverControls } from '../hooks/useHoverControls'

interface SecondaryBarProps {
  onOpenTemplates: () => void
  onExport: () => void
  onClear: () => void
  onTranscribe: () => void
  streaming: boolean
}

export default function SecondaryBar({
  onOpenTemplates,
  onExport,
  onClear,
  onTranscribe,
  streaming,
}: SecondaryBarProps) {
  const focusInput = () => {
    window.dispatchEvent(new CustomEvent('focus-chat-input'))
  }

  const { hoverIn, hoverOut, pressIn, pressOut } = useHoverControls()

  return (
    <div className="border-border bg-surface-1/60 border-b px-4 py-2 backdrop-blur">
      <nav
        aria-label="Ações secundárias"
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
      >
        <button
          aria-label="Abrir templates"
          className="text-secondary hover:text-primary hover:border-border hover:bg-surface-2/40 ring-gold rounded-full border border-transparent bg-transparent px-3 py-1 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2"
          onClick={onOpenTemplates}
          onMouseEnter={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && hoverIn(e.currentTarget)
          }
          onMouseLeave={(e) => hoverOut(e.currentTarget)}
          onMouseDown={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && pressIn(e.currentTarget)
          }
          onMouseUp={(e) => pressOut(e.currentTarget)}
          title="Abrir painel de templates"
        >
          Templates
        </button>
        <button
          aria-label="Exportar sessão"
          className="text-secondary hover:text-primary hover:border-border hover:bg-surface-2/40 ring-gold rounded-full border border-transparent bg-transparent px-3 py-1 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2"
          onClick={onExport}
          onMouseEnter={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && hoverIn(e.currentTarget)
          }
          onMouseLeave={(e) => hoverOut(e.currentTarget)}
          onMouseDown={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && pressIn(e.currentTarget)
          }
          onMouseUp={(e) => pressOut(e.currentTarget)}
          title="Exportar sessão"
        >
          Exportar
        </button>
        <button
          aria-label="Transcrever áudio por URL"
          className="text-secondary hover:text-primary hover:border-border hover:bg-surface-2/40 ring-gold rounded-full border border-transparent bg-transparent px-3 py-1 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2 disabled:opacity-50"
          onClick={onTranscribe}
          disabled={streaming}
          onMouseEnter={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && hoverIn(e.currentTarget)
          }
          onMouseLeave={(e) => hoverOut(e.currentTarget)}
          onMouseDown={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && pressIn(e.currentTarget)
          }
          onMouseUp={(e) => pressOut(e.currentTarget)}
          title="Transcrever áudio por URL"
        >
          Transcrever
        </button>
        <button
          aria-label="Limpar conversa"
          className="text-secondary hover:text-primary hover:border-border hover:bg-surface-2/40 ring-gold ml-auto rounded-full border border-transparent bg-transparent px-3 py-1 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2 disabled:opacity-50"
          onClick={onClear}
          disabled={streaming}
          onMouseEnter={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && hoverIn(e.currentTarget)
          }
          onMouseLeave={(e) => hoverOut(e.currentTarget)}
          onMouseDown={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && pressIn(e.currentTarget)
          }
          onMouseUp={(e) => pressOut(e.currentTarget)}
          title="Limpar conversa"
        >
          Limpar
        </button>
        <button
          aria-label="Focar entrada do chat"
          className="text-secondary hover:text-primary hover:border-border hover:bg-surface-2/40 ring-gold rounded-full border border-transparent bg-transparent px-3 py-1 text-xs transition-colors will-change-transform focus:outline-none focus-visible:ring-2"
          onClick={focusInput}
          onMouseEnter={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && hoverIn(e.currentTarget)
          }
          onMouseLeave={(e) => hoverOut(e.currentTarget)}
          onMouseDown={(e) =>
            !(e.currentTarget as HTMLButtonElement).disabled && pressIn(e.currentTarget)
          }
          onMouseUp={(e) => pressOut(e.currentTarget)}
          title="Focar entrada do chat"
        >
          Focar input
        </button>
      </nav>
    </div>
  )
}

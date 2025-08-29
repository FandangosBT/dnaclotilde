import React from 'react'

/**
 * Indicador de digitação com três pontos, mantendo classes utilitárias
 * para compatibilidade com testes, e dimensões mínimas para não "pular" layout.
 * Respeita prefers-reduced-motion via CSS utilitária existente.
 */
export default function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1" aria-hidden>
      <span className="bg-gold-80 inline-block h-1 w-1 animate-pulse rounded-full"></span>
      <span
        className="bg-gold-60 inline-block h-1 w-1 animate-pulse rounded-full"
        style={{ animationDelay: '120ms' }}
      ></span>
      <span
        className="bg-gold-40 inline-block h-1 w-1 animate-pulse rounded-full"
        style={{ animationDelay: '240ms' }}
      ></span>
    </div>
  )
}

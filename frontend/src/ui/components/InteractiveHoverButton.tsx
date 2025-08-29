import React from 'react'

export type InteractiveHoverButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

// Botão inspirado no "Interactive Hover Button" (Magic UI), adaptado aos tokens locais e acessibilidade
// - Usa apenas Tailwind (sem dependências extras)
// - Respeita prefers-reduced-motion via classes motion-reduce:*
// - Mantém foco visível via classe utilitária existente "focus-visible-ring"
// - Não usa atributo disabled para manter foco por teclado quando aria-disabled=true (a11y)
export default function InteractiveHoverButton({
  className = '',
  children,
  ...rest
}: InteractiveHoverButtonProps) {
  const ariaDisabled = (rest as any)['aria-disabled']
  return (
    <button
      {...rest}
      className={[
        // layout base
        'font-coder group relative inline-flex items-center justify-center overflow-hidden rounded-lg px-3 py-2',
        // tipografia e cores base (texto sobre ouro)
        'text-black',
        // superfície: transparente (efeito visual vem das camadas internas)
        'bg-transparent',
        // foco
        'focus-visible-ring',
        // estado
        ariaDisabled ? 'cursor-not-allowed opacity-60' : 'interactive',
        className,
      ].join(' ')}
    >
      {/* Círculo expansível no hover (motion-safe) */}
      <span aria-hidden className="absolute inset-0 -z-10 flex items-center justify-center">
        <span className="bg-gold h-0 w-0 rounded-full transition-all duration-500 ease-out group-hover:h-56 group-hover:w-56 motion-reduce:transition-none" />
      </span>
      {/* Brilho/gradiente sutil por cima para relevo */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 rounded-lg bg-gradient-to-b from-white/0 via-white/0 to-black/10"
      />
      {/* Borda e cor de base (para estado não-hover) */}
      <span aria-hidden className="bg-gold/90 absolute inset-0 -z-20 rounded-lg" />

      {/* Conteúdo */}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </button>
  )
}

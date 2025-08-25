import React from 'react'
import { Mode, Tone, Formality, Objective } from '../../store'
import { useHoverControls } from '../hooks/useHoverControls'

interface HeaderProps {
  mode: Mode
  tone: Tone
  formality: Formality
  setMode: (m: Mode) => void
  setTone: (t: Tone) => void
  setFormality: (f: Formality) => void
  objective: Objective
  setObjective: (o: Objective) => void
}

export default function Header({
  mode: _mode,
  tone: _tone,
  formality: _formality,
  setMode: _setMode,
  setTone: _setTone,
  setFormality: _setFormality,
  objective: _objective,
  setObjective: _setObjective,
}: HeaderProps) {
  const { bind } = useHoverControls()

  const objectives: Objective[] = [
    'qualificar',
    'objeções',
    'descoberta',
    'fechamento',
    'follow-up',
  ]

  return (
    <header role="banner" className="border-border bg-surface-1 border-b px-4 py-5">
      <div className="flex flex-col items-center gap-2 pt-3 pb-1">
        <img
          src="/clotilde.jpg"
          alt="Dona Clotilde"
          width={84}
          height={84}
          decoding="async"
          loading="eager"
          className="h-[84px] w-[84px] rounded-full object-cover mx-auto"
        />
        <h1 className="m-0 font-mono text-xl font-semibold text-white text-center">Dona Clotilde - Bruxa do 71</h1>
        <h2 className="text-secondary font-sans text-[11px] sm:text-xs leading-snug mt-0.5 text-center">
          Especialista em potencializar resultados de PMEs com soluções SaaS sob medida – direto ao ponto e com olhar consultivo
        </h2>
      </div>

      {/* Controles removidos conforme solicitação */}
    </header>
  )
}
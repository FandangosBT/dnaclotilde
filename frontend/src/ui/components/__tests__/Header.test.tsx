import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Header from '../Header'
import type { Mode, Tone, Formality, Objective } from '../../../store/types'

const setup = (overrides?: Partial<{ mode: Mode; tone: Tone; formality: Formality; objective: Objective }>) => ({
  mode: (overrides?.mode ?? 'SDR') as Mode,
  tone: (overrides?.tone ?? 'breve') as Tone,
  formality: (overrides?.formality ?? 'informal') as Formality,
  objective: (overrides?.objective ?? 'qualificar') as Objective,
  setMode: () => {},
  setTone: () => {},
  setFormality: () => {},
  setObjective: () => {},
})

describe('Header', () => {
  it('renderiza título e subtítulo', () => {
    const props = setup()
    render(<Header {...props} />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText(/Dona Clotilde - Bruxa do 71/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Especialista em potencializar resultados de PMEs/i),
    ).toBeInTheDocument()
  })

  it('não exibe os botões/controles removidos', () => {
    const props = setup()
    render(<Header {...props} />)
    expect(screen.queryByRole('button', { name: /alternar modo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /alternar tom/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /alternar formalidade/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/selecionar objetivo/i)).not.toBeInTheDocument()
  })
})
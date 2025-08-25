import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SecondaryBar from '../SecondaryBar'

function setup(overrides?: Partial<{ streaming: boolean }>) {
  const handlers = {
    onOpenTemplates: vi.fn(),
    onExport: vi.fn(),
    onClear: vi.fn(),
    onTranscribe: vi.fn(),
    streaming: false,
    ...overrides,
  }
  render(<SecondaryBar {...handlers} />)
  return handlers
}

describe('SecondaryBar', () => {
  it('renderiza botões e desabilita "Limpar" e "Transcrever" quando streaming', () => {
    setup({ streaming: true })
    expect(screen.getByRole('button', { name: /abrir templates/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exportar sessão/i })).toBeInTheDocument()
    const transcribe = screen.getByRole('button', { name: /transcrever áudio por url/i }) as HTMLButtonElement
    expect(transcribe).toBeDisabled()
    const clear = screen.getByRole('button', { name: /limpar conversa/i }) as HTMLButtonElement
    expect(clear).toBeDisabled()
    expect(screen.getByRole('button', { name: /focar entrada do chat/i })).toBeInTheDocument()
  })

  it('dispara handlers ao clicar nos botões', () => {
    const h = setup()
    fireEvent.click(screen.getByRole('button', { name: /abrir templates/i }))
    expect(h.onOpenTemplates).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /exportar sessão/i }))
    expect(h.onExport).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /transcrever áudio por url/i }))
    expect(h.onTranscribe).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /limpar conversa/i }))
    expect(h.onClear).toHaveBeenCalled()
  })
})
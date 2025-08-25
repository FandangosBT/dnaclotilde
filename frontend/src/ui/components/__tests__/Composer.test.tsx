import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../../App'

// Testes focados no Composer (placeholder e contador de caracteres)
describe('Composer', () => {
  it('exibe placeholder humano', () => {
    render(<App />)
    const textarea = screen.getByLabelText(/mensagem/i) as HTMLTextAreaElement
    expect(textarea.placeholder).toBe('Digite sua mensagem ou dúvida aqui...')
  })

  it('atualiza contador de caracteres conforme o input', () => {
    render(<App />)
    const textarea = screen.getByLabelText(/mensagem/i)
    expect(screen.getByText('0/2000')).toBeInTheDocument()

    fireEvent.change(textarea, { target: { value: 'hello' } })
    expect(screen.getByText('5/2000')).toBeInTheDocument()
  })

  it('renderiza botão Enviar embutido', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument()
  })
})
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FeedbackButtons from '../FeedbackButtons'

describe('FeedbackButtons', () => {
  it('envia up e down', () => {
    const onFeedback = vi.fn()
    render(<FeedbackButtons onFeedback={onFeedback} />)

    fireEvent.click(screen.getByRole('button', { name: /feedback positivo/i }))
    expect(onFeedback).toHaveBeenCalledWith('up')

    fireEvent.click(screen.getByRole('button', { name: /feedback negativo/i }))
    expect(onFeedback).toHaveBeenCalledWith('down')
  })

  it('permite adicionar motivo e enviar', () => {
    const onFeedback = vi.fn()
    render(<FeedbackButtons onFeedback={onFeedback} />)

    // Primeiro clique: selecionar down
    fireEvent.click(screen.getByRole('button', { name: /feedback negativo/i }))

    // Mostrar campo de motivo
    fireEvent.click(screen.getByRole('button', { name: /adicionar motivo/i }))

    const input = screen.getByLabelText(/motivo do feedback/i)
    fireEvent.change(input, { target: { value: 'Resposta pouco clara' } })

    // Enviar motivo
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(onFeedback).toHaveBeenCalledWith('down', 'Resposta pouco clara')
  })

  it('desabilita interações quando disabled', () => {
    const onFeedback = vi.fn()
    render(<FeedbackButtons onFeedback={onFeedback} disabled />)

    const up = screen.getByRole('button', { name: /feedback positivo/i })
    const down = screen.getByRole('button', { name: /feedback negativo/i })
    expect(up).toBeDisabled()
    expect(down).toBeDisabled()
  })
})

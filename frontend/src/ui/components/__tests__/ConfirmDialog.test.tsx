import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ConfirmDialog from '../ConfirmDialog'

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não renderiza quando closed', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza dialog quando open', () => {
    render(<ConfirmDialog {...defaultProps} open={true} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirmação')).toBeInTheDocument()
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument()
  })

  it('renderiza com props customizadas', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        open={true}
        title="Título Personalizado"
        description="Descrição personalizada"
        confirmText="Sim"
        cancelText="Não"
      />,
    )

    expect(screen.getByText('Título Personalizado')).toBeInTheDocument()
    expect(screen.getByText('Descrição personalizada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sim' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Não' })).toBeInTheDocument()
  })

  it('foca no botão cancelar por padrão', () => {
    render(<ConfirmDialog {...defaultProps} open={true} />)
    const cancelButton = screen.getByRole('button', { name: 'Cancelar' })
    expect(cancelButton).toHaveFocus()
  })

  it('chama onCancel ao clicar em Cancelar', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} open={true} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('chama onConfirm ao clicar em Confirmar', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} open={true} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('chama onCancel ao pressionar Escape', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} open={true} onCancel={onCancel} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('chama onConfirm ao pressionar Enter', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} open={true} onConfirm={onConfirm} />)

    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('chama onConfirm ao pressionar Ctrl+Enter', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} open={true} onConfirm={onConfirm} />)

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true })
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('chama onConfirm ao pressionar Cmd+Enter', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} open={true} onConfirm={onConfirm} />)

    fireEvent.keyDown(window, { key: 'Enter', metaKey: true })
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('não responde a eventos de teclado quando fechado', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog {...defaultProps} open={false} onCancel={onCancel} onConfirm={onConfirm} />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'Enter' })

    expect(onCancel).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('tem atributos de acessibilidade corretos', () => {
    render(<ConfirmDialog {...defaultProps} open={true} />)
    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-title')
    expect(screen.getByText('Confirmação')).toHaveAttribute('id', 'confirm-title')
  })
})

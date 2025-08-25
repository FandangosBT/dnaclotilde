import { render, screen, fireEvent } from '@testing-library/react'
import KeyboardShortcutsModal from '../KeyboardShortcutsModal'

describe('KeyboardShortcutsModal', () => {
  it('não renderiza quando open=false', () => {
    render(<KeyboardShortcutsModal open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza e fecha com Escape e botão Fechar', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutsModal open onClose={onClose} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Fecha com Escape
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    // Fecha com botão no mesmo render
    onClose.mockClear()
    const btn = screen.getByRole('button', { name: /fechar/i })
    fireEvent.click(btn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

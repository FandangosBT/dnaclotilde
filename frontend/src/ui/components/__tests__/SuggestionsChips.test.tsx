import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SuggestionsChips from '../SuggestionsChips'

describe('SuggestionsChips', () => {
  it('não renderiza quando não há sugestões', () => {
    const onSuggest = vi.fn()
    const { container } = render(<SuggestionsChips suggestions={[]} onSuggest={onSuggest} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza chips e dispara onSuggest ao clicar', () => {
    const onSuggest = vi.fn()
    render(<SuggestionsChips suggestions={['A', 'B', 'C']} onSuggest={onSuggest} />)

    const chipA = screen.getByRole('button', { name: /inserir sugestão: a/i })
    const chipB = screen.getByRole('button', { name: /inserir sugestão: b/i })

    fireEvent.click(chipA)
    expect(onSuggest).toHaveBeenCalledWith('A')

    fireEvent.click(chipB)
    expect(onSuggest).toHaveBeenCalledWith('B')
  })

  it('suporta navegação por setas e Enter', () => {
    const onSuggest = vi.fn()
    render(<SuggestionsChips suggestions={['Um', 'Dois', 'Três']} onSuggest={onSuggest} />)

    // foco inicial no primeiro chip
    const firstChip = screen.getByRole('button', { name: /inserir sugestão: um/i })
    firstChip.focus()
    expect(firstChip).toHaveFocus()

    // direita -> segundo
    fireEvent.keyDown(firstChip, { key: 'ArrowRight' })
    const secondChip = screen.getByRole('button', { name: /inserir sugestão: dois/i })
    expect(secondChip).toHaveFocus()

    // direita -> terceiro
    fireEvent.keyDown(secondChip, { key: 'ArrowRight' })
    const thirdChip = screen.getByRole('button', { name: /inserir sugestão: três/i })
    expect(thirdChip).toHaveFocus()

    // direita (wrap) -> primeiro
    fireEvent.keyDown(thirdChip, { key: 'ArrowRight' })
    expect(firstChip).toHaveFocus()

    // esquerda (wrap) -> terceiro
    fireEvent.keyDown(firstChip, { key: 'ArrowLeft' })
    expect(thirdChip).toHaveFocus()

    // Enter no terceiro
    fireEvent.keyDown(thirdChip, { key: 'Enter' })
    expect(onSuggest).toHaveBeenCalledWith('Três')
  })

  it('desabilita interações quando disabled', () => {
    const onSuggest = vi.fn()
    render(<SuggestionsChips suggestions={['Apenas']} onSuggest={onSuggest} disabled />)

    const chip = screen.getByRole('button', { name: /inserir sugestão: apenas/i })
    expect(chip).toBeDisabled()

    fireEvent.click(chip)
    expect(onSuggest).not.toHaveBeenCalled()
  })
})
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ChatMessage from '../ChatMessage'
import type { Message } from '../../../store/types'

function renderMsg(
  partial: Partial<Message> & { role: Message['role'] },
  props?: Partial<Parameters<typeof ChatMessage>[0]>,
) {
  const message: Message = {
    role: partial.role,
    content: partial.content ?? 'conteúdo',
    timestamp: partial.timestamp,
    suggestions: partial.suggestions,
  }
  const onCopy = vi.fn()
  return render(
    <ChatMessage
      message={message}
      onCopy={onCopy}
      isLast={props?.isLast}
      streaming={props?.streaming}
      onSuggest={props?.onSuggest}
    />,
  )
}

describe('ChatMessage', () => {
  it('alinha texto do usuário à direita e do assistente à esquerda', () => {
    // assistente: sem text-right
    const { rerender } = renderMsg({ role: 'assistant', content: 'Olá, eu sou a IA.' })
    const ai = screen.getByText(/eu sou a ia/i)
    expect(ai).not.toHaveClass('text-right')

    // usuário: com text-right
    rerender(
      <ChatMessage
        message={{ role: 'user', content: 'Oi, tudo bem?' } as Message}
        onCopy={vi.fn()}
      />,
    )
    const user = screen.getByText(/tudo bem/i)
    expect(user).toHaveClass('text-right')
  })

  it('renderiza SuggestionsChips apenas quando houver sugestões e onSuggest', () => {
    // sem sugestões
    renderMsg({ role: 'assistant', content: 'Sem sugestões' })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()

    // com sugestões, mas sem onSuggest -> não renderiza
    const { rerender } = renderMsg({
      role: 'assistant',
      content: 'Sugestões',
      suggestions: ['A', 'B'],
    })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()

    // com sugestões e onSuggest -> renderiza
    rerender(
      <ChatMessage
        message={{ role: 'assistant', content: 'Sugestões', suggestions: ['A', 'B'] } as Message}
        onCopy={vi.fn()}
        onSuggest={vi.fn()}
      />,
    )
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('mostra indicador de digitação (três pontos) na última do assistente quando streaming', () => {
    const { container } = renderMsg(
      { role: 'assistant', content: 'gerando...' },
      { isLast: true, streaming: true },
    )
    const dots = container.querySelectorAll('.animate-pulse')
    expect(dots.length).toBeGreaterThanOrEqual(3)
  })

  it('tem ações de copiar/feedback visíveis apenas em hover/focus via classes utilitárias', () => {
    const { container } = renderMsg({ role: 'assistant', content: 'Olá' })
    const actions = container.querySelector(
      '.absolute.right-2.top-2.flex.items-center.gap-1'
    ) as HTMLElement | null
    expect(actions).toBeTruthy()
    // Garante classes que escondem por padrão e mostram em hover/focus-within
    expect(actions).toHaveClass('opacity-0')
    expect(actions.className).toMatch(/group-hover:opacity-100/)
    expect(actions.className).toMatch(/focus-within:opacity-100/)
  })
})
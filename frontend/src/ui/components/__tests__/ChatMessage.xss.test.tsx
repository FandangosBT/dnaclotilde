import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ChatMessage from '../ChatMessage'
import type { Message } from '../../../store/types'

describe('ChatMessage - defesa contra XSS', () => {
  const renderWith = (content: string) => {
    const message: Message = { role: 'assistant', content }
    const { container } = render(
      <ChatMessage
        message={message}
        onCopy={() => {}}
        isLast={false}
        streaming={false}
      />,
    )
    return container
  }

  it('exibe payload de <img onerror> como texto e não cria elementos', () => {
    const payload = '<img src=x onerror="window.__xssExecuted=1">'
    const container = renderWith(payload)
    // Não deve existir IMG real
    expect(container.querySelector('img')).toBeNull()
    // Conteúdo literal visível
    expect(screen.getByText(/<img src=x onerror=/i)).toBeTruthy()
  })

  it('não executa <script> nem cria SVG executável', () => {
    const payload = '<svg onload="window.__xssExecuted=1"></svg><script>window.__xssExecuted=1</script>'
    const container = renderWith(payload)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
    // Texto literal permanece
    expect(screen.getByText(/<svg onload=/i)).toBeTruthy()
    expect(screen.getByText(/<script>window.__xssExecuted=1/i)).toBeTruthy()
  })
})
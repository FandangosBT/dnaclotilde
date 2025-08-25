import { create } from 'zustand'
import { createMessagesSlice } from '../slices/messagesSlice'
import { createUISlice } from '../slices/uiSlice'
import { createConfigSlice } from '../slices/configSlice'
import type { StoreState } from '../store'
import type { Message } from '../types'

function createTestStore() {
  return create<StoreState>()((...a) => ({
    ...createMessagesSlice(...a),
    ...createConfigSlice(...a),
    ...createUISlice(...a),
  }))
}

describe('messagesSlice', () => {
  it('adiciona e atualiza última mensagem', () => {
    const useStore = createTestStore()
    useStore.getState().addMessage({ role: 'assistant', content: 'Olá' } as Message)
    expect(useStore.getState().messages).toHaveLength(1)

    useStore.getState().updateLastMessage('Novo conteúdo')
    expect(useStore.getState().messages[0].content).toBe('Novo conteúdo')
  })

  it('faz append em última mensagem e remove última mensagem do assistant', () => {
    const useStore = createTestStore()
    useStore.getState().addMessage({ role: 'assistant', content: 'A' } as Message)
    useStore.getState().appendToLastMessage('B')
    expect(useStore.getState().messages[0].content).toBe('AB')

    useStore.getState().removeLastAssistantMessage()
    expect(useStore.getState().messages).toHaveLength(0)
  })

  it('clearMessages limpa mensagens e reseta erro', () => {
    const useStore = createTestStore()
    useStore.getState().setError('Erro de teste')
    useStore.getState().addMessage({ role: 'user', content: 'Oi' } as Message)

    useStore.getState().clearMessages()

    expect(useStore.getState().messages).toHaveLength(0)
    expect(useStore.getState().error).toBeNull()
  })
})

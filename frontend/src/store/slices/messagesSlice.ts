import { StateCreator } from 'zustand'
import { Message } from '../types'
import type { StoreState } from '../store'

export interface MessagesSlice {
  messages: Message[]
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  appendToLastMessage: (chunk: string) => void
  clearMessages: () => void
  removeLastAssistantMessage: () => void
  setSuggestions: (suggestions: string[]) => void
}

export const createMessagesSlice: StateCreator<StoreState, [], [], MessagesSlice> = (set) => ({
  messages: [],
  addMessage: (message) => set((state: StoreState) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) =>
    set((state: StoreState) => {
      const newMessages = [...state.messages]
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content }
      }
      return { messages: newMessages }
    }),
  appendToLastMessage: (chunk) =>
    set((state: StoreState) => {
      const newMessages = [...state.messages]
      if (newMessages.length > 0) {
        const lastMessage = newMessages[newMessages.length - 1]
        newMessages[newMessages.length - 1] = {
          ...lastMessage,
          content: (lastMessage.content || '') + chunk,
        }
      }
      return { messages: newMessages }
    }),
  clearMessages: () => set({ messages: [], error: null }),
  removeLastAssistantMessage: () =>
    set((state: StoreState) => {
      const newMessages = [...state.messages]
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
        newMessages.pop()
      }
      return { messages: newMessages }
    }),
  setSuggestions: (suggestions) =>
    set((state: StoreState) => {
      const newMessages = [...state.messages]
      for (let i = newMessages.length - 1; i >= 0; i--) {
        if (newMessages[i].role === 'assistant') {
          newMessages[i] = { ...newMessages[i], suggestions }
          break
        }
      }
      return { messages: newMessages }
    }),
})

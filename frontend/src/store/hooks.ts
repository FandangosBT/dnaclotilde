import { shallow } from 'zustand/shallow'
import { useChatStore } from './store'

export function useMessages() {
  return useChatStore(
    (state) => ({
      messages: state.messages,
      addMessage: state.addMessage,
      appendToLastMessage: state.appendToLastMessage,
      clearMessages: state.clearMessages,
      removeLastAssistantMessage: state.removeLastAssistantMessage,
    }),
    shallow,
  )
}

export function useConfig() {
  return useChatStore(
    (state) => ({
      mode: state.mode,
      tone: state.tone,
      formality: state.formality,
      objective: state.objective,
      setMode: state.setMode,
      setTone: state.setTone,
      setFormality: state.setFormality,
      setObjective: state.setObjective,
    }),
    shallow,
  )
}

export function useUI() {
  return useChatStore(
    (state) => ({
      streaming: state.streaming,
      error: state.error,
      setStreaming: state.setStreaming,
      setError: state.setError,
      setAbortController: state.setAbortController,
      cancelStreaming: state.cancelStreaming,
      templatesOpen: state.templatesOpen,
      templates: state.templates,
      loadingTemplates: state.loadingTemplates,
      setTemplatesOpen: state.setTemplatesOpen,
      setTemplates: state.setTemplates,
      setLoadingTemplates: state.setLoadingTemplates,
    }),
    shallow,
  )
}

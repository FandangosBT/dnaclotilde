import { StateCreator } from 'zustand'

export interface UISlice {
  streaming: boolean
  error: string | null
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void

  abortController: AbortController | null
  setAbortController: (controller: AbortController | null) => void
  cancelStreaming: () => void

  templatesOpen: boolean
  templates: Record<string, string[]>
  loadingTemplates: boolean
  setTemplatesOpen: (open: boolean) => void
  setTemplates: (templates: Record<string, string[]>) => void
  setLoadingTemplates: (loading: boolean) => void

  shortcutsModalOpen: boolean
  setShortcutsModalOpen: (open: boolean) => void

  privacyNoticeShown: boolean
  setPrivacyNoticeShown: (shown: boolean) => void
}

export const createUISlice: StateCreator<UISlice> = (set, get) => ({
  streaming: false,
  error: null,
  setStreaming: (streaming) => set({ streaming }),
  setError: (error) => set({ error }),

  abortController: null,
  setAbortController: (controller) => set({ abortController: controller }),
  cancelStreaming: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
      set({ abortController: null })
    }
  },

  templatesOpen: false,
  templates: {},
  loadingTemplates: false,
  setTemplatesOpen: (open) => set({ templatesOpen: open }),
  setTemplates: (templates) => set({ templates }),
  setLoadingTemplates: (loading) => set({ loadingTemplates: loading }),

  shortcutsModalOpen: false,
  setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),

  privacyNoticeShown: false,
  setPrivacyNoticeShown: (shown) => set({ privacyNoticeShown: shown }),
})

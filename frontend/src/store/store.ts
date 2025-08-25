import { create } from 'zustand'
import { createMessagesSlice, MessagesSlice } from './slices/messagesSlice'
import { createConfigSlice, ConfigSlice } from './slices/configSlice'
import { createUISlice, UISlice } from './slices/uiSlice'

export type StoreState = MessagesSlice & ConfigSlice & UISlice

export const useChatStore = create<StoreState>()((...a) => ({
  ...createMessagesSlice(...a),
  ...createConfigSlice(...a),
  ...createUISlice(...a),
}))

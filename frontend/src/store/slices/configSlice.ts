import { StateCreator } from 'zustand'
import { Mode, Tone, Formality, Objective, Density, BubbleTone } from '../types'

export interface ConfigSlice {
  mode: Mode
  tone: Tone
  formality: Formality
  objective: Objective
  setMode: (mode: Mode) => void
  setTone: (tone: Tone) => void
  setFormality: (formality: Formality) => void
  setObjective: (objective: Objective) => void

  density: Density
  setDensity: (density: Density) => void

  userBubbleTone: BubbleTone
  setUserBubbleTone: (tone: BubbleTone) => void
}

export const createConfigSlice: StateCreator<ConfigSlice> = (set) => ({
  mode: 'SDR',
  tone: 'breve',
  formality: 'informal',
  objective: 'qualificar',
  setMode: (mode) => set({ mode }),
  setTone: (tone) => set({ tone }),
  setFormality: (formality) => set({ formality }),
  setObjective: (objective) => set({ objective }),

  density: 'comfortable',
  setDensity: (density) => set({ density }),

  userBubbleTone: 'subtle',
  setUserBubbleTone: (userBubbleTone) => set({ userBubbleTone }),
})

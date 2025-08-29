export type Role = 'user' | 'assistant'

export interface Message {
  role: Role
  content: string
  suggestions?: string[]
  timestamp?: string
}

export type Mode = 'SDR' | 'Closer'
export type Tone = 'breve' | 'detalhado'
export type Formality = 'informal' | 'formal'
export type Objective = 'qualificar' | 'objeções' | 'descoberta' | 'fechamento' | 'follow-up'

export type Density = 'compact' | 'comfortable' | 'spacious'
export type BubbleTone = 'subtle' | 'bold'

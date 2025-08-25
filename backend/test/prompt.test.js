import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildUserPrompt } from '../src/llm/prompt.js'

describe('llm/prompt', () => {
  describe('buildSystemPrompt', () => {
    it('deve montar prompt padrão para SDR com tom breve, informal e objetivo qualificar', () => {
      const prompt = buildSystemPrompt({})
      expect(prompt).toContain('Você é um SDR')
      expect(prompt).toContain('Estilo: breve; Formalidade: informal.')
      expect(prompt).toContain('Objetivo atual: qualificar.')
      expect(prompt).toContain('Responda de forma objetiva, com passos acionáveis')
      expect(prompt).toContain('Se faltar contexto, faça perguntas claras')
      expect(prompt).toContain('Nunca invente dados')
    })

    it('deve montar prompt para Closer com tom detalhado, formal e objetivo descoberta', () => {
      const prompt = buildSystemPrompt({
        mode: 'Closer',
        tone: 'detalhado',
        formality: 'formal',
        objective: 'descoberta',
      })
      expect(prompt).toContain('Você é um Closer')
      expect(prompt).toContain('Estilo: detalhado; Formalidade: formal.')
      expect(prompt).toContain('Objetivo atual: descoberta.')
    })
  })

  describe('buildUserPrompt', () => {
    it('deve retornar o mesmo texto de entrada', () => {
      const input = 'Como lidar com objeções sobre preço?'
      const user = buildUserPrompt(input)
      expect(user).toBe(input)
    })
  })
})

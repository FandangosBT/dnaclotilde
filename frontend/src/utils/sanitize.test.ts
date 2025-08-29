import { describe, it, expect } from 'vitest'
import { sanitizeHTML } from './sanitize'

describe('sanitizeHTML', () => {
  it('remove tags e atributos perigosos (img onerror)', () => {
    const payload = '<img src=x onerror="window.__xssFlag=1">Olá'
    const out = sanitizeHTML(payload)
    expect(out).not.toContain('<img')
    expect(out).not.toContain('onerror')
    expect(out).toContain('Olá')
  })

  it('remove <script> e não executa', () => {
    const payload = '<script>window.__xssFlag=1</script>texto'
    const out = sanitizeHTML(payload)
    expect(out).not.toContain('<script')
    expect(out).toContain('window.__xssFlag=1') // conteúdo textual permanece seguro
    expect(out).toContain('texto')
  })

  it('remove javascript: URLs', () => {
    const payload = '<a href="javascript:alert(1)">clique</a>'
    const out = sanitizeHTML(payload)
    expect(out).not.toContain('<a')
    expect(out).not.toContain('javascript:')
    expect(out).toContain('clique')
  })

  it('remove tags neutras deixando só texto', () => {
    const payload = 'Hello <b>World</b>'
    const out = sanitizeHTML(payload)
    expect(out).toBe('Hello World')
  })
})

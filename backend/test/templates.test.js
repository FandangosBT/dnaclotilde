import request from 'supertest'
import { describe, it, expect } from 'vitest'
import app from '../src/index.js'

describe('GET /templates', () => {
  it('deve retornar templates para o modo padrão (SDR)', async () => {
    const res = await request(app).get('/templates')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('mode', 'SDR')
    expect(res.body).toHaveProperty('templates')

    const { templates } = res.body
    expect(typeof templates).toBe('object')
    expect(Object.keys(templates).length).toBeGreaterThan(0)

    Object.values(templates).forEach((arr) => {
      expect(Array.isArray(arr)).toBe(true)
      expect(arr.length).toBeGreaterThan(0)
      arr.forEach((t) => expect(typeof t).toBe('string'))
    })
  })

  it('deve respeitar o parâmetro mode=Closer', async () => {
    const res = await request(app).get('/templates?mode=Closer')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('mode', 'Closer')
    expect(res.body).toHaveProperty('templates')

    const { templates } = res.body
    expect(templates).toHaveProperty('descoberta')
    expect(templates).toHaveProperty('fechamento')
    Object.values(templates).forEach((arr) => {
      expect(Array.isArray(arr)).toBe(true)
      arr.forEach((t) => expect(typeof t).toBe('string'))
    })
  })
})

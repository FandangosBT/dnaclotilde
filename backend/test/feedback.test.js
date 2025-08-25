import request from 'supertest'
import { describe, it, expect } from 'vitest'
import app from '../src/index.js'

describe('POST /feedback', () => {
  it('deve aceitar rating "up" sem reason e retornar { ok: true }', async () => {
    const res = await request(app).post('/feedback').send({ rating: 'up' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('deve aceitar rating "down" com reason (<= 500 chars)', async () => {
    const reason = 'Motivo breve de feedback negativo.'
    const res = await request(app).post('/feedback').send({ rating: 'down', reason })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('deve rejeitar quando rating é inválido', async () => {
    const res = await request(app).post('/feedback').send({ rating: 'maybe' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ code: 'BAD_REQUEST', message: 'Payload inválido' })
  })

  it('deve rejeitar quando reason excede 500 caracteres', async () => {
    const longReason = 'a'.repeat(501)
    const res = await request(app).post('/feedback').send({ rating: 'up', reason: longReason })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ code: 'BAD_REQUEST', message: 'Payload inválido' })
  })
})

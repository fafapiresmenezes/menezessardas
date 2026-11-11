import { describe, it, expect } from 'vitest'
import { situacaoCnj } from './conexaoCnj'

const agora = new Date('2026-11-11T12:00:00Z')
const reg = (h: number, extra: object = {}) => JSON.stringify({ em: new Date(agora.getTime() - h * 3600000).toISOString(), ok: true, ...extra })

describe('situacaoCnj', () => {
  it('sem registro ou registro quebrado: sem dados', () => {
    expect(situacaoCnj(null, agora).situacao).toBe('sem_dados')
    expect(situacaoCnj('lixo', agora).situacao).toBe('sem_dados')
    expect(situacaoCnj('{"em":"nada"}', agora).situacao).toBe('sem_dados')
  })
  it('até 6 horas: conectado; até 24 h: atrasada; depois: falha', () => {
    expect(situacaoCnj(reg(3, { origem: 'automatica' }), agora)).toMatchObject({ situacao: 'ok' })
    expect(situacaoCnj(reg(3, { origem: 'automatica' }), agora).texto).toContain('automática')
    expect(situacaoCnj(reg(10), agora).situacao).toBe('atrasada')
    const parado = situacaoCnj(reg(30), agora)
    expect(parado.situacao).toBe('falha'); expect(parado.texto).toContain('parado')
  })
  it('consulta com falha aparece como falha, com o motivo, mesmo que recente', () => {
    const s = situacaoCnj(reg(1, { ok: false, falhas: ['123/RJ: 503'] }), agora)
    expect(s.situacao).toBe('falha'); expect(s.texto).toContain('123/RJ: 503')
  })
})

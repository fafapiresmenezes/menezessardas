// Pedir entrada: a função do servidor que recebe o pedido do visitante, segura spam e chama o
// banco. O limite por rede mora no banco (pedir_entrada_gravar); aqui prendemos o que a função
// decide sozinha: campo-armadilha, tempo mínimo, nome e e-mail, motivo, e o repasse do limite.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (body: unknown, ip = '200.1.2.3') =>
  caixa.handler!(new Request('https://x.functions.supabase.co/pedir-entrada', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body),
  }))

const OK = { nome: 'Ana Advogada', email: 'ana@silva.adv.br', motivo: 'proposta', ms: 4000 }

beforeEach(() => {
  zerar()
  estado.rpcResposta.instituto_segredos_servico = { pimenta_cpf: 'pimenta' }
  estado.rpcResposta.pedir_entrada_gravar = { protocolo: 'PE-20261114-AB12', criado_em: '2026-11-14T02:30:00Z' }
})

describe('pedir entrada', () => {
  it('registra o pedido e devolve protocolo', async () => {
    const r = await chamar(OK)
    const b = await r.json()
    expect(r.status).toBe(200)
    expect(b.ok).toBe(true)
    expect(b.protocolo).toBe('PE-20261114-AB12')
    const chamada = estado.rpcs.find(c => c.nome === 'pedir_entrada_gravar')!
    expect((chamada.args as Record<string, unknown>).p_motivo).toBe('proposta')
    expect((chamada.args as Record<string, unknown>).p_email).toBe('ana@silva.adv.br')
    // a rede vai como hash, nunca o IP em claro
    expect((chamada.args as Record<string, unknown>).p_rede).not.toContain('200.1.2.3')
  })

  it('campo-armadilha preenchido: finge sucesso e não grava', async () => {
    const r = await chamar({ ...OK, site: 'http://robo' })
    expect(r.status).toBe(200)
    expect(estado.rpcs.some(c => c.nome === 'pedir_entrada_gravar')).toBe(false)
  })

  it('rápido demais (menos de 3 s) é recusado', async () => {
    expect((await chamar({ ...OK, ms: 500 })).status).toBe(400)
    expect(estado.rpcs.some(c => c.nome === 'pedir_entrada_gravar')).toBe(false)
  })

  it('exige nome e e-mail válido, e recusa e-mail descartável', async () => {
    expect((await chamar({ ...OK, nome: '' })).status).toBe(400)
    expect((await chamar({ ...OK, email: 'sem-arroba' })).status).toBe(400)
    expect((await chamar({ ...OK, email: 'x@mailinator.com' })).status).toBe(400)
  })

  it('motivo fora da lista vira "entrada"', async () => {
    await chamar({ ...OK, motivo: 'xpto' })
    const chamada = estado.rpcs.find(c => c.nome === 'pedir_entrada_gravar')!
    expect((chamada.args as Record<string, unknown>).p_motivo).toBe('entrada')
  })

  it('quando o banco diz "limite", responde 429', async () => {
    estado.rpcResposta.pedir_entrada_gravar = { erro: 'limite' }
    const r = await chamar(OK)
    expect(r.status).toBe(429)
    expect((await r.json()).erro).toMatch(/desta rede hoje/)
  })
})

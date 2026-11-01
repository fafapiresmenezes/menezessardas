// Passo 543: Edge Function definir-senha-provisoria — só administrador, pessoa válida, senha mínima, API de administração.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (body: unknown) => caixa.handler!(new Request('https://x.functions.supabase.co/definir-senha-provisoria', { method: 'POST', headers: { Authorization: 'Bearer t' }, body: JSON.stringify(body) }))
const ID = '5f3b1c2d-1111-4222-8333-444455556666'

beforeEach(() => { zerar({}); estado.rpcResposta.perfil_atual = 'admin' })

describe('definir-senha-provisoria', () => {
  it('quem não é administrador recebe 403 e nada muda', async () => {
    estado.rpcResposta.perfil_atual = 'operador'
    expect((await chamar({ id: ID, senha: 'LSM-ABCD-EFGH' })).status).toBe(403)
    estado.rpcErro.perfil_atual = 'sem sessão'
    expect((await chamar({ id: ID, senha: 'LSM-ABCD-EFGH' })).status).toBe(403)
    expect(estado.authAdmin.atualizados).toHaveLength(0)
  })

  it('valida o id da pessoa e o tamanho da senha', async () => {
    expect((await chamar({ id: '123', senha: 'LSM-ABCD-EFGH' })).status).toBe(400)
    const r = await chamar({ id: ID, senha: 'curta' })
    expect(r.status).toBe(400)
    expect((await r.json()).erro).toContain('8 caracteres')
  })

  it('administrador define a senha pela API de administração com e-mail confirmado; erro do Auth vira 502', async () => {
    const b = await (await chamar({ id: ID, senha: 'LSM-ABCD-EFGH' })).json()
    expect(b).toEqual({ ok: true })
    expect(estado.authAdmin.atualizados).toEqual([{ id: ID, attrs: { password: 'LSM-ABCD-EFGH', email_confirm: true } }])
    estado.authAdmin.erro = 'User not found'
    const r = await chamar({ id: ID, senha: 'LSM-ABCD-EFGH' })
    expect(r.status).toBe(502)
    expect((await r.json()).erro).toContain('User not found')
  })
})

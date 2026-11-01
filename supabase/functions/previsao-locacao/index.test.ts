// Passo 546: Edge Function previsao-locacao — API única de previsão: repassa à RPC com o login do usuário.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_ANON_KEY: 'a' })
await import('./index')
const chamar = (body: unknown, method = 'POST') => caixa.handler!(new Request('https://x.functions.supabase.co/previsao-locacao', { method, headers: { authorization: 'Bearer t' }, body: method === 'POST' ? JSON.stringify(body) : undefined }))

beforeEach(() => zerar({}))

describe('previsao-locacao', () => {
  it('só POST; chama previsao_locacao_escritorio com tribunal, classe, órgão e assunto normalizados', async () => {
    expect((await chamar({}, 'GET')).status).toBe(405)
    estado.rpcResposta.previsao_locacao_escritorio = { probabilidade: 0.62, amostra: 292, brier: 0.1266 }
    const b = await (await chamar({ tribunal: 'tjrj', classe: 'despejo', orgao: '', assunto: '9586' })).json()
    expect(b).toEqual({ probabilidade: 0.62, amostra: 292, brier: 0.1266 })
    expect(estado.rpcs[0]).toEqual({ nome: 'previsao_locacao_escritorio', args: { p_tribunal: 'tjrj', p_classe: 'despejo', p_orgao: null, p_assunto: 9586 } })
    await chamar({})
    expect(estado.rpcs[1]!.args).toEqual({ p_tribunal: '', p_classe: '', p_orgao: null, p_assunto: null })
  })

  it('erro da RPC é 401 (não é da equipe); "erro" devolvido pela RPC vira 403 ou 400 conforme o texto', async () => {
    estado.rpcErro.previsao_locacao_escritorio = 'permission denied'
    const r = await chamar({ tribunal: 'tjrj' })
    expect(r.status).toBe(401)
    expect((await r.json()).erro).toContain('equipe')
    delete estado.rpcErro.previsao_locacao_escritorio
    estado.rpcResposta.previsao_locacao_escritorio = { erro: 'Acesso só para a equipe.' }
    expect((await chamar({})).status).toBe(403)
    estado.rpcResposta.previsao_locacao_escritorio = { erro: 'Tribunal não coberto.' }
    expect((await chamar({})).status).toBe(400)
  })
})

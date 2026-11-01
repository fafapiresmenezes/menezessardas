// Passo 534: Edge Function consultar-cnpj — validação do CNPJ, leitura da Receita (BrasilAPI) e erros.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'

const caixa = fingirDeno()
await import('./index')
const chamar = (qs: string, method = 'GET') => caixa.handler!(new Request(`https://x.functions.supabase.co/consultar-cnpj${qs}`, { method }))

let resposta: () => Response
const chamadas: string[] = []
beforeEach(() => { chamadas.length = 0; fingirFetch(u => { chamadas.push(u); return resposta() }) })

describe('consultar-cnpj', () => {
  it('responde ao OPTIONS com CORS e rejeita CNPJ sem 14 dígitos', async () => {
    const o = await chamar('', 'OPTIONS')
    expect(o.headers.get('Access-Control-Allow-Origin')).toBe('*')
    const r = await chamar('?cnpj=123')
    expect(r.status).toBe(400)
    expect((await r.json()).erro).toContain('14 dígitos')
    expect(chamadas).toHaveLength(0)
  })

  it('empresa ativa vem com risco baixo; inativa com risco alto; pontuação do CNPJ é limpa', async () => {
    resposta = () => jsonResp({ razao_social: 'BRILHO LTDA', nome_fantasia: '', descricao_situacao_cadastral: 'Ativa', uf: 'RJ', municipio: 'RIO DE JANEIRO' })
    const r = await chamar('?cnpj=11.222.333/0001-81')
    const b = await r.json()
    expect(chamadas[0]).toBe('https://brasilapi.com.br/api/cnpj/v1/11222333000181')
    expect(b.empresa).toMatchObject({ cnpj: '11222333000181', nome: 'BRILHO LTDA', fantasia: null, status: 'ativa', risco: 'baixo', uf: 'RJ' })
    expect(b.fonte).toContain('Receita Federal')
    resposta = () => jsonResp({ razao_social: 'X', descricao_situacao_cadastral: 'BAIXADA' })
    expect((await (await chamar('?cnpj=11222333000181')).json()).empresa).toMatchObject({ status: 'inativa', risco: 'alto', situacao: 'BAIXADA' })
  })

  it('404 da Receita vira "não encontrado" com risco alto; 500 e falha de rede viram 502', async () => {
    resposta = () => new Response('', { status: 404 })
    const r = await chamar('?cnpj=11222333000181')
    expect(r.status).toBe(200)
    expect((await r.json()).empresa).toMatchObject({ status: 'nao_encontrado', risco: 'alto' })
    resposta = () => new Response('', { status: 500 })
    const e = await chamar('?cnpj=11222333000181')
    expect(e.status).toBe(502)
    expect((await e.json()).erro).toContain('HTTP 500')
    resposta = () => { throw new Error('rede caiu') }
    const f = await chamar('?cnpj=11222333000181')
    expect(f.status).toBe(502)
    expect((await f.json()).erro).toContain('rede caiu')
  })
})

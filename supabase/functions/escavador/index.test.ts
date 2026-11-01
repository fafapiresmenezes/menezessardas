// Passo 544: Edge Function escavador — token do escritório, teste de créditos, busca por CNJ, CPF/CNPJ ou nome, consumo.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`
const chamar = (body: unknown, auth: string | null = `Bearer ${jwt({ role: 'authenticated', sub: 'u1' })}`) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/escavador', { method: 'POST', headers: auth ? { authorization: auth } : {}, body: JSON.stringify(body) }))

let resposta: () => Response
const pedidos: { url: string; auth: string }[] = []
beforeEach(() => {
  pedidos.length = 0
  resposta = () => jsonResp({ items: [] })
  fingirFetch((u, init) => { pedidos.push({ url: u, auth: (init?.headers as Record<string, string>).Authorization }); return resposta() })
  zerar({ configuracoes: [{ chave: 'escavador_api_key', valor: 'tok-escavador' }], consumo_api: [] })
})

describe('escavador', () => {
  it('exige login (JWT autenticado) e o token colado em Configurações', async () => {
    expect((await chamar({ termo: 'x' }, null)).status).toBe(401)
    expect((await chamar({ termo: 'x' }, `Bearer ${jwt({ role: 'anon' })}`)).status).toBe(401)
    estado.tabelas.configuracoes = []
    const r = await chamar({ termo: 'Fulano' })
    expect(r.status).toBe(503)
    expect((await r.json()).erro).toContain('Configurações')
    expect(pedidos).toHaveLength(0)
  })

  it('teste consulta o saldo de créditos sem gastar; token recusado vira mensagem clara', async () => {
    resposta = () => jsonResp({ creditos: 42 })
    const b = await (await chamar({ teste: true })).json()
    expect(b).toEqual({ ok: true, creditos: { creditos: 42 } })
    expect(pedidos[0]!.url).toBe('https://api.escavador.com/api/v1/quantidade-creditos')
    expect(pedidos[0]!.auth).toBe('Bearer tok-escavador')
    expect(estado.inseridos).toHaveLength(0)
    resposta = () => new Response('', { status: 401 })
    expect((await (await chamar({ teste: true })).json()).erro).toContain('Token recusado')
  })

  it('escolhe a rota pelo termo: número CNJ (20 dígitos), CPF/CNPJ ou nome; cada busca entra no Consumo', async () => {
    expect((await chamar({ termo: 'ab' })).status).toBe(400)
    resposta = () => jsonResp({ numero_cnj: '0001234-56.2026.8.19.0001', titulo_polo_ativo: 'Loja X', titulo_polo_passivo: 'Shopping Y', unidade_origem: { tribunal_sigla: 'TJRJ' }, data_ultima_movimentacao: '2026-10-01', fontes: [{ capa: { classe: 'Renovatória' } }] })
    let b = await (await chamar({ termo: '0001234-56.2026.8.19.0001' })).json()
    expect(pedidos[0]!.url).toBe('https://api.escavador.com/api/v2/processos/numero_cnj/0001234-56.2026.8.19.0001')
    expect(b.processos).toEqual([{ numero: '0001234-56.2026.8.19.0001', titulo: 'Loja X x Shopping Y', tribunal: 'TJRJ', ultimaMovimentacao: '2026-10-01', classe: 'Renovatória', link: 'https://www.escavador.com/processos?q=0001234-56.2026.8.19.0001' }])
    resposta = () => jsonResp({ items: [{ numero_cnj: '1', fontes: [{ sigla: 'TJSP' }] }], envolvido_encontrado: { nome: 'BRILHO LTDA' } })
    b = await (await chamar({ termo: '11.222.333/0001-81' })).json()
    expect(pedidos[1]!.url).toBe('https://api.escavador.com/api/v2/envolvido/processos?cpf_cnpj=11222333000181')
    expect(b.envolvido).toBe('BRILHO LTDA')
    expect(b.processos[0]).toMatchObject({ numero: '1', tribunal: 'TJSP', titulo: '', classe: null })
    await chamar({ termo: 'Maria da Silva' })
    expect(pedidos[2]!.url).toBe('https://api.escavador.com/api/v2/envolvido/processos?nome=Maria%20da%20Silva')
    expect(estado.inseridos).toHaveLength(3)
    expect(estado.inseridos[0]!.linha).toMatchObject({ funcao: 'escavador', usuario_id: 'u1', modelo: 'escavador-consulta', quantidade: 1 })
  })

  it('404 é lista vazia; 402 e 401 explicam créditos e token; sem resposta dá 502', async () => {
    resposta = () => new Response('', { status: 404 })
    expect(await (await chamar({ termo: 'Ninguém Aqui' })).json()).toEqual({ processos: [] })
    resposta = () => new Response('', { status: 402 })
    expect((await (await chamar({ termo: 'Ninguém Aqui' })).json()).erro).toContain('Créditos')
    resposta = () => { throw new Error('rede') }
    const r = await chamar({ termo: 'Ninguém Aqui' })
    expect(r.status).toBe(502)
    expect((await r.json()).erro).toContain('não respondeu')
  })
})

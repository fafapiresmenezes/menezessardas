// Passo 558: Edge Function analisar-contrato — análise do contrato pela IA com ferramenta, modo teste da chave, teto mensal, consumo e histórico.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const env: Record<string, string> = { SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }
const caixa = fingirDeno(env)
await import('./index')
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const JWT = `x.${b64({ role: 'authenticated', sub: 'u1' })}.y`
const chamar = (corpo: unknown = {}, headers: Record<string, string> = { Authorization: `Bearer ${JWT}` }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/analisar-contrato', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))
const ANALISE = { resumo: 'Locação residencial de 30 meses.', clausulasRisco: [{ titulo: 'Multa', gravidade: 'alta', observacao: '3 aluguéis' }], prazos: [{ descricao: 'Vencimento', data: '2027-05-01' }], sugestoes: ['Rever a multa'] }

let ia: (corpo: Record<string, any>) => Response
const pedidos: Record<string, any>[] = []
beforeEach(() => {
  pedidos.length = 0
  delete env.ANTHROPIC_API_KEY
  ia = () => jsonResp({ model: 'claude-haiku-5-5', usage: { input_tokens: 500, output_tokens: 120 }, content: [{ type: 'tool_use', name: 'registrar_analise', input: ANALISE }] })
  fingirFetch((u, init) => { const c = JSON.parse(String(init?.body)); pedidos.push(c); return u.includes('anthropic') ? ia(c) : new Response('', { status: 500 }) })
  zerar({ configuracoes: [{ chave: 'anthropic_api_key', valor: 'sk-cfg' }], consumo_api: [], analises_contratos: [] })
  estado.rpcResposta.teto_consumo_atingido = false
})

describe('analisar-contrato', () => {
  it('exige pessoa logada (chave pública não gasta IA); sem chave configurada é 503; chave vazia conta como ausente', async () => {
    expect((await chamar({ texto: 'x' }, {})).status).toBe(401)
    expect((await chamar({ texto: 'x' }, { Authorization: `Bearer x.${b64({ role: 'anon' })}.y` })).status).toBe(401)
    estado.tabelas.configuracoes = [{ chave: 'anthropic_api_key', valor: '' }]
    const r = await chamar({ texto: 'x' })
    expect(r.status).toBe(503); expect((await r.json()).erro).toContain('Chave da IA não configurada')
    expect(pedidos).toHaveLength(0)
  })

  it('analisa o contrato com a ferramenta obrigatória, corta o texto em 40 mil caracteres, registra consumo e guarda o histórico do contrato', async () => {
    const b = await (await chamar({ texto: 'C'.repeat(50000), contratoId: 'c1' })).json()
    expect(b).toEqual(ANALISE)
    const req = pedidos[0]!
    expect(req.model).toBe('claude-haiku-5-5')
    expect(req.max_tokens).toBe(1200)
    expect(req.tool_choice).toEqual({ type: 'tool', name: 'registrar_analise' })
    expect(req.tools[0].input_schema.required).toEqual(['resumo', 'clausulasRisco', 'prazos', 'sugestoes'])
    expect(Object.keys(req.tools[0].input_schema.properties.clausulasRisco.items.properties)).toEqual(['titulo', 'gravidade', 'observacao', 'trecho', 'pagina'])
    expect(req.system).toContain('[Página N]')
    expect(req.messages[0].content).toHaveLength('Contrato para análise:\n\n'.length + 40000)
    expect(req.system).toContain('não substitui a revisão de um advogado')
    expect(estado.inseridos.find(i => i.tabela === 'consumo_api')!.linha).toMatchObject({ funcao: 'analisar-contrato', usuario_id: 'u1', modelo: 'claude-haiku-5-5', tokens_entrada: 500, tokens_saida: 120 })
    expect(estado.inseridos.find(i => i.tabela === 'analises_contratos')!.linha).toMatchObject({ contrato_id: 'c1', resposta_json: ANALISE, modelo: 'claude-haiku-5-5' })
  })

  it('sem contratoId não grava histórico; sem bloco de ferramenta devolve análise vazia; chave do ambiente tem prioridade sobre a configuração', async () => {
    env.ANTHROPIC_API_KEY = 'sk-env'
    ia = () => jsonResp({ content: [{ type: 'text', text: 'oi' }] })
    const b = await (await chamar({ texto: 'contrato' })).json()
    expect(b).toEqual({ resumo: 'Sem resposta.', clausulasRisco: [], prazos: [], sugestoes: [] })
    expect(estado.inseridos.some(i => i.tabela === 'analises_contratos')).toBe(false)
    expect(estado.inseridos.filter(i => i.tabela === 'consumo_api')).toHaveLength(1)
  })

  it('texto ausente é 400; teto mensal atingido é 429 (menos no modo teste)', async () => {
    expect((await chamar({ contratoId: 'c1' })).status).toBe(400)
    expect((await chamar({ texto: 123 })).status).toBe(400)
    estado.rpcResposta.teto_consumo_atingido = true
    const r = await chamar({ texto: 'contrato' })
    expect(r.status).toBe(429); expect((await r.json()).erro).toContain('Teto mensal')
    expect(pedidos).toHaveLength(0)
    expect(await (await chamar({ teste: true })).json()).toEqual({ ok: true, modelo: 'claude-haiku-5-5' })
    expect(pedidos[0]).toMatchObject({ max_tokens: 8, messages: [{ role: 'user', content: 'Responda apenas OK.' }] })
  })

  it('erros da Anthropic viram 502 com mensagem clara: chave recusada, limite de uso, outra falha com detalhe', async () => {
    ia = () => new Response('invalid key', { status: 401 })
    let r = await chamar({ texto: 'c' })
    expect(r.status).toBe(502); expect((await r.json()).erro).toContain('Chave recusada')
    ia = () => new Response('', { status: 429 })
    r = await chamar({ teste: true })
    expect(r.status).toBe(502); expect((await r.json()).erro).toContain('Limite de uso')
    ia = () => new Response('x'.repeat(400), { status: 500 })
    r = await chamar({ texto: 'c' })
    const b = await r.json()
    expect(r.status).toBe(502); expect(b.erro).toBe('Falha na API da Anthropic.'); expect(b.detalhe).toHaveLength(300)
    expect(estado.inseridos).toHaveLength(0)
  })
})

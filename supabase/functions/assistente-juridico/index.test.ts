// Passo 559: Edge Function assistente-juridico — lei buscada ao vivo no Planalto (cache de 7 dias), triagem e resposta pela IA nos modos responder, redigir e caminhos; teste do cron e consultor semanal.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const JWT = `x.${b64({ role: 'authenticated', sub: 'u1' })}.y`
const chamar = (corpo: unknown = {}, headers: Record<string, string> = { authorization: `Bearer ${JWT}` }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/assistente-juridico', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))

// Lei do Inquilinato de mentira, com mais de 2.000 caracteres e artigos separados por linha.
const enche = 'texto de preenchimento '.repeat(20)
const LEI = `<html><head><style>x{}</style></head><body><p>LEI Nº 8.245</p>
<p>Art. 1º A locação de imóvel urbano regula-se pelo disposto nesta lei. ${enche}</p>
<p>Art. 51. Nas locações de imóveis destinados ao comércio, o locatário terá direito a renovação do contrato. ${enche}</p>
<p>Art. 62. Nas ações de despejo fundadas na falta de pagamento de aluguel, o locatário poderá evitar a rescisão. ${enche}</p>
<p>Art. 1.336. São deveres do condômino &amp; outros. ${enche}</p></body></html>`

type Resposta = Record<string, unknown>
let ia: (corpo: Record<string, any>) => Response
let planalto: () => Response
const pedidosIa: Record<string, any>[] = []
const urls: string[] = []
const triagem = (input: unknown) => jsonResp({ model: 'claude-haiku-5-5', usage: { input_tokens: 100, output_tokens: 20 }, content: [{ type: 'tool_use', name: 'planejar_pesquisa', input }] })
const texto = (t: string) => jsonResp({ model: 'claude-sonnet-5-5', usage: { input_tokens: 3000, output_tokens: 500 }, content: [{ type: 'text', text: t }] })
beforeEach(() => {
  pedidosIa.length = 0; urls.length = 0
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // O Planalto serve windows-1252 (latin-1 para estes caracteres).
  planalto = () => new Response(Buffer.from(LEI, 'latin1'))
  ia = c => (c.tools?.[0]?.name === 'planejar_pesquisa' ? triagem({ leis: ['inquilinato', 'inexistente'], termos: ['renovação', 'comércio'], artigos: ['51'] }) : texto('**Resposta:** prazo do art. 51 da Lei 8.245/91.'))
  fingirFetch((u, init) => {
    urls.push(u)
    if (u.includes('anthropic')) { const c = JSON.parse(String(init?.body)); pedidosIa.push(c); return ia(c) }
    if (u.includes('planalto.gov.br')) return planalto()
    return new Response('', { status: 500 })
  })
  zerar({ configuracoes: [{ chave: 'anthropic_api_key', valor: 'sk' }, { chave: 'cron_segredo', valor: 'segredo' }], leis_texto: [], consumo_api: [], consultas_juridicas: [], diagnosticos_semanais: [], estilos_escrita: [],
    imoveis: [{ id: 1 }, { id: 2 }], contratos: [], tarefas: [], intimacoes: [] })
  estado.rpcResposta.teto_consumo_atingido = false
})
afterEach(() => vi.useRealTimers())

describe('assistente-juridico', () => {
  it('sonda: busca a lei ao vivo, limpa o HTML, divide em artigos (sem ponto de milhar) e guarda no cache; com cache recente não busca de novo', async () => {
    const b = await (await chamar({ sonda: true, lei: 'inquilinato', termos: ['despejo'], artigos: ['1336'] }, {})).json() as Resposta
    expect(b).toMatchObject({ lei: 'inquilinato', artigos: 4 })
    expect((b.selecionados as { numero: string }[]).map(s => s.numero)).toEqual(['1336', '62'])
    expect(estado.upserts[0]).toMatchObject({ tabela: 'leis_texto', linha: { id: 'inquilinato', titulo: 'Lei do Inquilinato (Lei 8.245/1991)' } })
    const guardado = (estado.upserts[0]!.linha as { texto: string }).texto
    expect(guardado).not.toContain('<p>'); expect(guardado).toContain('condômino & outros')
    estado.tabelas.leis_texto = [{ id: 'inquilinato', texto: guardado, buscado_em: new Date().toISOString() }]
    urls.length = 0
    expect((await (await chamar({ sonda: true, lei: 'inquilinato' }, {})).json() as Resposta).artigos).toBe(4)
    expect(urls).toHaveLength(0)
  })

  it('sonda: Planalto fora do ar usa o cache vencido; sem cache e sem resposta (ou página curta demais) é 502', async () => {
    planalto = () => new Response('', { status: 503 })
    expect((await chamar({ sonda: true, lei: 'inquilinato' }, {})).status).toBe(502)
    planalto = () => new Response('<p>curta</p>')
    expect((await chamar({ sonda: true, lei: 'inquilinato' }, {})).status).toBe(502)
    estado.tabelas.leis_texto = [{ id: 'inquilinato', texto: '\nArt. 5. Velho.', buscado_em: '2020-01-01T00:00:00Z' }]
    expect((await (await chamar({ sonda: true, lei: 'inquilinato' }, {})).json() as Resposta).artigos).toBe(1)
    expect((await chamar({ sonda: true, lei: 'naoexiste' }, {})).status).toBe(502)
  })

  it('exige pessoa logada, teste do cron ou consultor semanal; sem chave 503; modo inválido e pergunta curta são 400', async () => {
    expect((await chamar({ pergunta: 'Qual o prazo?' }, {})).status).toBe(401)
    expect((await chamar({ teste: 'responder' }, { 'x-cron-secret': 'errado' })).status).toBe(401)
    expect((await chamar({ pergunta: 'Qual o prazo da renovatória?', modo: 'cantar' })).status).toBe(400)
    expect((await chamar({ pergunta: 'oi' })).status).toBe(400)
    estado.tabelas.configuracoes = [{ chave: 'cron_segredo', valor: 'segredo' }]
    expect((await chamar({ pergunta: 'Qual o prazo da renovatória?' })).status).toBe(503)
    expect(pedidosIa).toHaveLength(0)
  })

  it('responder: triagem escolhe leis do catálogo (ignora as inexistentes), artigo citado vai primeiro, resposta cita a lei, guarda a consulta e registra consumo das duas chamadas', async () => {
    const b = await (await chamar({ pergunta: 'Qual o prazo para a renovatória comercial?', especialidade: 'imobiliario', contexto: 'Loja na Lagoa', historico: [{ papel: 'assistente', texto: 'antes' }] })).json() as Resposta
    expect(b.resposta).toBe('**Resposta:** prazo do art. 51 da Lei 8.245/91.')
    expect(b.modo).toBe('responder')
    expect(b.fontes).toEqual([{ id: 'inquilinato', titulo: 'Lei do Inquilinato (Lei 8.245/1991)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8245.htm' }])
    expect((b.artigosConsultados as { artigo: string }[])[0]).toEqual({ lei: 'Lei do Inquilinato (Lei 8.245/1991)', artigo: '51' })
    const [tri, resp] = pedidosIa
    expect(tri!.model).toBe('claude-haiku-5-5')
    expect(tri!.tool_choice).toEqual({ type: 'tool', name: 'planejar_pesquisa' })
    expect(tri!.system).toContain('inquilinato: Lei do Inquilinato')
    expect(tri!.messages[0].content).toContain('Contexto do caso: Loja na Lagoa')
    expect(resp!.model).toBe('claude-sonnet-5-5')
    expect(resp!.max_tokens).toBe(6000)
    expect(resp!.messages[0]).toEqual({ role: 'assistant', content: 'antes' })
    expect(resp!.messages.at(-1).content).toContain('Art. 51. Nas locações')
    expect(resp!.system).toContain('Fontes consultadas')
    expect(estado.inseridos.filter(i => i.tabela === 'consumo_api')).toHaveLength(2)
    expect(estado.inseridos.find(i => i.tabela === 'consultas_juridicas')!.linha).toMatchObject({ usuario_id: 'u1', especialidade: 'imobiliario', modo: 'responder', modelo: 'claude-sonnet-5-5' })
  })

  it('redigir: usa até 10 peças de estilo da própria pessoa e mais tokens; especialidade desconhecida vira generalista; triagem sem leis válidas abre o Código Civil', async () => {
    estado.tabelas.estilos_escrita = [{ usuario_id: 'u1', titulo: 'Notificação modelo', texto: 'Prezado Senhor, venho NOTIFICAR…', criado_em: '2026-01-01' }, { usuario_id: 'u2', titulo: 'Alheia', texto: 'não usar', criado_em: '2026-01-01' }]
    ia = c => (c.tools?.[0]?.name === 'planejar_pesquisa' ? triagem({ leis: ['zz'], termos: [] }) : texto('NOTIFICAÇÃO EXTRAJUDICIAL…'))
    const b = await (await chamar({ pergunta: 'Redija notificação de despejo por falta de pagamento', modo: 'redigir', especialidade: 'astrologia' })).json() as Resposta
    expect(b.resposta).toBe('NOTIFICAÇÃO EXTRAJUDICIAL…')
    expect(urls.some(u => u.includes('l10406compilada'))).toBe(true)
    const resp = pedidosIa[1]!
    expect(resp.max_tokens).toBe(12000)
    expect(resp.system).toContain('advogado generalista')
    expect(resp.system).toContain('ESTILO DE ESCRITA DO AUTOR (1 peças de referência)')
    expect(resp.system).toContain('Notificação modelo')
    expect(resp.system).not.toContain('Alheia')
    // Rotação de estilo: perfil sorteado entra no prompt e fica guardado com a peça.
    expect(resp.system).toContain('PERFIL DE ESCRITA DESTA PEÇA')
    expect(resp.system).toContain('ESTILO DE ESCRITA DO AUTOR, ele prevalece')
    const d = b.dados as { perfilEstilo: { parametros: Record<string, number>; mistura: unknown[] }; aderencia: number }
    expect(d.perfilEstilo.mistura.length).toBeGreaterThanOrEqual(2)
    expect(typeof d.aderencia).toBe('number')
  })

  it('redigir: a peça seguinte sorteia perfil distante das anteriores; rotacao=false desliga', async () => {
    ia = c => (c.tools?.[0]?.name === 'planejar_pesquisa' ? triagem({ leis: ['inquilinato'], termos: ['despejo'] }) : texto('NOTIFICAÇÃO. O locatário não pagou. Contudo, foi avisado.'))
    const a = await (await chamar({ pergunta: 'Redija notificação', modo: 'redigir' })).json() as { dados: { perfilEstilo: { parametros: Record<string, number> } } }
    const guardadas = (estado.tabelas.consultas_juridicas as { modo: string; dados: unknown }[]).filter(r => r.modo === 'redigir')
    expect(guardadas).toHaveLength(1)
    const b = await (await chamar({ pergunta: 'Redija notificação', modo: 'redigir' })).json() as { dados: { perfilEstilo: { parametros: Record<string, number>; distanciaMinima: number } } }
    expect(b.dados.perfilEstilo.parametros).not.toEqual(a.dados.perfilEstilo.parametros)
    expect(b.dados.perfilEstilo.distanciaMinima).toBeLessThan(1)
    const c = await (await chamar({ pergunta: 'Redija notificação', modo: 'redigir', rotacao: false })).json() as Resposta
    expect(c.dados).toBeNull()
    expect(pedidosIa.at(-1)!.system).not.toContain('PERFIL DE ESCRITA')
  })

  it('caminhos: aceita listas vindas como texto JSON, limita o recomendado ao intervalo e monta a síntese; sem matriz é 502', async () => {
    const matriz = { sintese: 'Três aluguéis atrasados.', caminhos: JSON.stringify([{ nome: 'Notificar', descricao: 'd', fundamento: 'art. 62', exito: 4, rapidez: 4, custo: 5, risco: 4 }, { nome: 'Despejo', descricao: 'd', fundamento: 'art. 59', exito: 4, rapidez: 2, custo: 2, risco: 3 }]), recomendado: 9, porque: 'Mais rápido.', proximosPassos: '["Enviar notificação"]' }
    ia = c => (c.tools?.[0]?.name === 'planejar_pesquisa' ? triagem({ leis: ['inquilinato'], termos: ['despejo'] }) : jsonResp({ content: [{ type: 'tool_use', name: 'registrar_caminhos', input: matriz }] }))
    const b = await (await chamar({ pergunta: 'Locatário com 3 aluguéis atrasados: quais caminhos?', modo: 'caminhos' })).json() as { dados: Record<string, any>; resposta: string }
    expect(b.dados.caminhos).toHaveLength(2)
    expect(b.dados.recomendado).toBe(1)
    expect(b.dados.proximosPassos).toEqual(['Enviar notificação'])
    expect(b.resposta).toBe('Três aluguéis atrasados.\n\n**Recomendado:** Despejo. Mais rápido.')
    expect(pedidosIa[1]!.tool_choice).toEqual({ type: 'auto' })
    ia = c => (c.tools?.[0]?.name === 'planejar_pesquisa' ? triagem({ leis: ['inquilinato'], termos: [] }) : jsonResp({ content: [{ type: 'text', text: 'sem matriz' }] }))
    const r = await chamar({ pergunta: 'Locatário com 3 aluguéis atrasados: quais caminhos?', modo: 'caminhos' })
    expect(r.status).toBe(502); expect(((await r.json()) as Resposta).erro).toContain('não devolveu a matriz')
  })

  it('IA: tool_choice recusado repete com escolha automática; chave recusada e teto mensal viram 502 com a mensagem; sobrecarga esgota as tentativas', async () => {
    let recusou = false
    ia = c => {
      if (c.tools?.[0]?.name === 'planejar_pesquisa' && c.tool_choice?.type === 'tool' && !recusou) { recusou = true; return new Response('tool_choice not supported', { status: 400 }) }
      return c.tools?.[0]?.name === 'planejar_pesquisa' ? triagem({ leis: ['inquilinato'], termos: [] }) : texto('ok')
    }
    expect(((await (await chamar({ pergunta: 'Qual o prazo da renovatória?' })).json()) as Resposta).resposta).toBe('ok')
    expect(pedidosIa[1]!.tool_choice).toEqual({ type: 'auto' })
    expect(pedidosIa[1]!.system).toContain('Responda obrigatoriamente chamando a ferramenta planejar_pesquisa')
    ia = () => new Response('', { status: 401 })
    expect(((await (await chamar({ pergunta: 'Qual o prazo da renovatória?' })).json()) as Resposta).erro).toContain('Chave recusada')
    estado.rpcResposta.teto_consumo_atingido = true
    const r = await chamar({ pergunta: 'Qual o prazo da renovatória?' })
    expect(r.status).toBe(502); expect(((await r.json()) as Resposta).erro).toContain('Teto mensal')
    estado.rpcResposta.teto_consumo_atingido = false
    ia = () => new Response('', { status: 529 })
    const p = chamar({ pergunta: 'Qual o prazo da renovatória?' })
    await vi.advanceTimersByTimeAsync(10000)
    expect(((await (await p).json()) as Resposta).erro).toContain('sobrecarregada')
  })

  it('cron: teste diário usa a pergunta fixa e não grava consulta; consultor semanal monta a fotografia do escritório e guarda o diagnóstico', async () => {
    let b = await (await chamar({ teste: 'responder' }, { 'x-cron-secret': 'segredo' })).json() as Resposta
    expect(b.resposta).toBeTruthy()
    expect(pedidosIa[0]!.messages[0].content).toContain('ação renovatória de locação comercial')
    expect(estado.inseridos.some(i => i.tabela === 'consultas_juridicas')).toBe(false)
    pedidosIa.length = 0
    estado.tabelas.contratos = [{ id: 'c1', encerrado_em: null, data_vencimento: new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10) }]
    estado.tabelas.intimacoes = [{ id: 1, lida: false }, { id: 2, lida: true }]
    b = await (await chamar({ semanal: 'nivel_socio_gestor' }, { 'x-cron-secret': 'segredo' })).json() as Resposta
    expect(pedidosIa[1]!.system).toContain('consultor da sócia-gestora')
    const diag = estado.inseridos.find(i => i.tabela === 'diagnosticos_semanais')!.linha as { nivel: string; fotografia: string }
    expect(diag.nivel).toBe('nivel_socio_gestor')
    expect(diag.fotografia).toContain('2 imóveis; 1 contratos ativos, 1 vencendo em 60 dias')
    expect(diag.fotografia).toContain('1 intimações não lidas')
    expect((await chamar({ semanal: 'nivel_inexistente' }, { 'x-cron-secret': 'segredo' })).status).toBe(401)
  })
})

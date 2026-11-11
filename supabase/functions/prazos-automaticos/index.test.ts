// Robô de prazos: busca no DJEN pelos processos, advogados e OABs, lê cada publicação nova e cria a tarefa com prazo.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k', FONTES_ESPERA_MS: '0' })
await import('./index')
const chamar = (body: unknown = {}, headers: Record<string, string> = { 'x-cron-secret': 'cron-1' }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/prazos-automaticos', { method: 'POST', headers, body: JSON.stringify(body) }))

const NUM = '0036229-32.2016.8.19.0021'
const item = (id: number, numero: string, texto: string, data: string) => ({
  id, data_disponibilizacao: data, siglaTribunal: 'TJRJ', nomeOrgao: '5ª Vara Cível', tipoComunicacao: 'Intimação', tipoDocumento: 'Despacho',
  numeroprocessocommascara: numero, texto, destinatarios: [{ nome: 'ACME LTDA', polo: 'A' }, { nome: 'BANCO X', polo: 'P' }], destinatarioadvogados: [],
})
let respostas: Record<string, unknown[]>
const pedidos: URL[] = []
beforeEach(() => {
  pedidos.length = 0
  respostas = {}
  fingirFetch(u => {
    const url = new URL(u); pedidos.push(url)
    const chave = url.searchParams.get('numeroProcesso') ?? url.searchParams.get('nomeAdvogado') ?? `${url.searchParams.get('numeroOab')}/${url.searchParams.get('ufOab')}`
    return jsonResp({ count: (respostas[chave] ?? []).length, items: respostas[chave] ?? [] })
  })
  zerar({
    configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }, { chave: 'advogados_monitorados', valor: 'Caio Barros' }, { chave: 'oabs_monitoradas', valor: '12345/RJ' }],
    tarefas: [{ id: 'caso-1', nivel: 'projeto', numero_processo: NUM, cliente: 'ACME', area: 'Cível', escritorio_id: 'esc-1', responsavel_id: 'u-1', situacao: 'fazendo' }],
    prazos_lidos: [],
  })
})

describe('prazos-automaticos', () => {
  it('só o cron (com segredo) ou usuário logado', async () => {
    expect((await chamar({}, {})).status).toBe(401)
    expect((await chamar({}, { 'x-cron-secret': 'errado' })).status).toBe(401)
  })

  it('consulta pelo número, pelo nome do advogado e pela OAB, numa janela curta', async () => {
    await chamar()
    const chaves = pedidos.map(u => u.searchParams.get('numeroProcesso') ?? u.searchParams.get('nomeAdvogado') ?? u.searchParams.get('numeroOab'))
    expect(chaves).toEqual(expect.arrayContaining(['00362293220168190021', 'Caio Barros', '12345']))
    expect(pedidos.every(u => u.searchParams.get('dataDisponibilizacaoInicio') && u.searchParams.get('dataDisponibilizacaoFim'))).toBe(true)
  })

  it('publicação nova vira tarefa com prazo dentro do processo, e não repete na rodada seguinte', async () => {
    respostas['00362293220168190021'] = [item(1, NUM, 'Ao apelado para contrarrazões ao recurso de apelação.', '2026-11-03')]
    respostas['Caio Barros'] = [item(1, NUM, 'Ao apelado para contrarrazões ao recurso de apelação.', '2026-11-03')]
    const b = await (await chamar()).json()
    expect(b).toMatchObject({ publicacoes: 1, novas: 1, tarefas: 1, casosNovos: 0 })
    const t = estado.inseridos.find(i => i.tabela === 'tarefas')!.linha as Record<string, unknown>
    expect(t).toMatchObject({ nivel: 'tarefa', pai_id: 'caso-1', prazo: '2026-11-26', escritorio_id: 'esc-1', responsavel_id: 'u-1' })
    expect(String(t.titulo)).toMatch(/^Responder ao recurso da outra parte/)
    expect(String(t.descricao)).toMatch(/CPC, art\. 1\.010/)
    const lido = estado.inseridos.find(i => i.tabela === 'prazos_lidos')!.linha as Record<string, unknown>
    expect(lido).toMatchObject({ publicacao_id: '1', vence: '2026-11-26', tarefa_id: expect.any(String) })
    const b2 = await (await chamar()).json()
    expect(b2).toMatchObject({ novas: 0, tarefas: 0 })
  })

  it('processo achado pelo nome do advogado e fora da carteira: abre o caso e cria o prazo', async () => {
    const outro = '0001111-22.2025.8.19.0001'
    respostas['Caio Barros'] = [item(7, outro, 'Manifeste-se a parte autora em 10 (dez) dias.', '2026-11-05')]
    const b = await (await chamar()).json()
    expect(b).toMatchObject({ casosNovos: 1, tarefas: 1 })
    const caso = estado.inseridos.find(i => i.tabela === 'tarefas' && (i.linha as { nivel: string }).nivel === 'projeto')!.linha as Record<string, unknown>
    expect(caso).toMatchObject({ numero_processo: outro, tipo: 'caso' })
  })

  it('guarda o resumo da última rodada para a tela mostrar', async () => {
    await chamar()
    const r = estado.upserts.find(u => u.tabela === 'configuracoes')!.linha as { chave: string; valor: string }
    expect(r.chave).toBe('prazos_ultima_execucao'); expect(JSON.parse(r.valor)).toMatchObject({ processos: 1, advogados: 1, oabs: 1 })
  })
})

// Passo 552: Edge Function buscar-partes — busca gratuita por nome (Comunica PJe + Querido Diário) e por número CNJ (DataJud); buscas salvas viram intimações e tarefas.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const JWT = `x.${b64({ role: 'authenticated', sub: 'u1' })}.y`
const chamar = (corpo: unknown = {}, headers: Record<string, string> = { authorization: `Bearer ${JWT}` }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/buscar-partes', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))
const CNJ = '0000001-23.2024.8.19.0001'

let comunica: () => Response
let diario: () => Response
let datajud: () => Response
const chamadas: string[] = []
beforeEach(() => {
  chamadas.length = 0
  comunica = () => jsonResp({ count: 2, items: [
    { id: 11, data_disponibilizacao: '2026-03-02', siglaTribunal: 'TJRJ', nomeOrgao: '2ª Vara', tipoComunicacao: 'Intimação', nomeClasse: 'Despejo', numeroprocessocommascara: CNJ, texto: '<b>Fica</b>   intimada', link: 'https://l/11' },
    { id: 12, data_disponibilizacao: '2026-03-01', siglaTribunal: 'TJSP', nomeOrgao: '1ª Vara', tipoComunicacao: 'Citação', nomeClasse: 'Cobrança', numero_processo: '2', texto: 'x', link: 'https://l/12' },
  ] })
  diario = () => jsonResp({ total_gazettes: 1, gazettes: [{ date: '2026-02-10', territory_name: 'Rio de Janeiro', state_code: 'RJ', excerpts: ['<p>Maria Silva</p> nomeada'], url: 'https://qd/1' }] })
  datajud = () => jsonResp({ hits: { hits: [{ _source: { tribunal: 'TJRJ', classe: { nome: 'Despejo' }, orgaoJulgador: { nome: '3ª Vara' }, dataAjuizamento: '2024-01-15', assuntos: [{ nome: 'Locação' }, {}],
    movimentos: [{ dataHora: '2026-01-10', nome: 'Distribuído' }, { dataHora: '2026-03-01', nome: 'Sentença' }] } }] } })
  fingirFetch(u => {
    chamadas.push(u)
    if (u.includes('comunicaapi')) return comunica()
    if (u.includes('queridodiario')) return diario()
    if (u.includes('datajud')) return datajud()
    return new Response('', { status: 500 })
  })
  zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'segredo' }], buscas_salvas: [], intimacoes: [], tarefas: [] })
})

describe('buscar-partes', () => {
  it('exige sessão de pessoa (papel authenticated) ou o segredo do cron; termo curto é 400', async () => {
    expect((await chamar({ termo: 'Maria Silva' }, {})).status).toBe(401)
    expect((await chamar({ termo: 'Maria Silva' }, { authorization: `Bearer x.${b64({ role: 'anon' })}.y` })).status).toBe(401)
    expect((await chamar({ termo: 'Maria Silva' }, { 'x-cron-secret': 'errado' })).status).toBe(401)
    const r = await chamar({ termo: ' Ana ' })
    expect(r.status).toBe(400); expect((await r.json()).erro).toContain('mínimo 4 letras')
    expect(chamadas).toHaveLength(0)
  })

  it('por nome consulta Comunica PJe e Querido Diário ao mesmo tempo e limpa o HTML dos trechos', async () => {
    const b = await (await chamar({ termo: 'Maria Silva' })).json()
    expect(b.tipo).toBe('nome')
    expect(b.comunica).toMatchObject({ ok: true, total: 2 })
    expect(b.comunica.itens[0]).toEqual({ data: '2026-03-02', tribunal: 'TJRJ', orgao: '2ª Vara', tipo: 'Intimação', classe: 'Despejo', numero: CNJ, trecho: 'Fica intimada', link: 'https://l/11' })
    expect(b.comunica.itens[1].numero).toBe('2')
    expect(b.queridoDiario).toEqual({ ok: true, total: 1, itens: [{ data: '2026-02-10', municipio: 'Rio de Janeiro/RJ', trecho: 'Maria Silva nomeada', link: 'https://qd/1' }] })
    expect(chamadas.find(u => u.includes('comunicaapi'))).toContain('nomeParte=Maria%20Silva')
    expect(chamadas.find(u => u.includes('queridodiario'))).toContain('querystring=%22Maria%20Silva%22')
  })

  it('fontes fora do ar viram erro na própria fonte sem derrubar a resposta', async () => {
    comunica = () => new Response('', { status: 503 })
    diario = () => { throw new Error('rede') }
    const b = await (await chamar({ termo: 'Maria Silva' })).json()
    expect(b.comunica).toEqual({ ok: false, erro: 'Comunica PJe 503' })
    expect(b.queridoDiario).toEqual({ ok: false, erro: 'Querido Diário sem resposta' })
  })

  it('por número CNJ consulta o DataJud do tribunal certo e devolve capa e movimentos do mais recente ao mais antigo', async () => {
    const b = await (await chamar({ termo: CNJ })).json()
    expect(b.tipo).toBe('numero')
    expect(chamadas[0]).toContain('api_publica_tjrj/_search')
    expect(b.datajud).toEqual({ ok: true, encontrado: true, tribunal: 'TJRJ', classe: 'Despejo', orgao: '3ª Vara', ajuizamento: '2024-01-15', assuntos: ['Locação'],
      movimentos: [{ data: '2026-03-01', nome: 'Sentença' }, { data: '2026-01-10', nome: 'Distribuído' }] })
    datajud = () => jsonResp({ hits: { hits: [] } })
    expect((await (await chamar({ termo: CNJ })).json()).datajud).toEqual({ ok: true, encontrado: false, tribunal: 'TJRJ' })
    expect((await (await chamar({ termo: '0000001-23.2024.9.19.0001' })).json()).datajud.erro).toContain('Número CNJ inválido')
  })

  it('buscas salvas: grava comunicações novas em intimacoes com oab busca:<termo>, atualiza a busca e abre tarefa no caso ligado', async () => {
    estado.tabelas.buscas_salvas = [{ id: 1, usuario_id: 'u1', termo: 'Maria Silva', caso_id: 'c1' }, { id: 2, usuario_id: 'u2', termo: 'Outra', caso_id: null }]
    estado.tabelas.intimacoes = [{ id: 12 }]
    estado.tabelas.tarefas = [{ id: 'c1', titulo: 'Caso Maria', responsavel_id: null, criado_por: 'u1', escritorio_id: 'sede', area: 'imobiliario', cliente: 'Maria' }]
    const b = await (await chamar({ salvas: true })).json()
    expect(b.tipo).toBe('salvas')
    // Só as buscas da própria pessoa quando chamada por ela.
    expect(b.resumo).toEqual([{ termo: 'Maria Silva', total: 2, novas: 1, caso: 'c1' }])
    expect(estado.upserts).toHaveLength(2)
    expect(estado.upserts[0]!.linha).toMatchObject({ id: 11, oab: 'busca:Maria Silva', tribunal: 'TJRJ', numero_processo: CNJ, texto: 'Fica intimada', destinatarios: [] })
    expect(estado.atualizados[0]).toMatchObject({ tabela: 'buscas_salvas', valores: { ultimo_total: 2, novas_ultima: 1 }, filtros: [['id', 'eq', 1]] })
    const tarefa = estado.inseridos.find(i => i.tabela === 'tarefas')!.linha as Record<string, unknown>
    expect(tarefa).toMatchObject({ nivel: 'tarefa', pai_id: 'c1', situacao: 'a_fazer', prioridade: 'alta', responsavel_id: 'u1', escritorio_id: 'sede', cliente: 'Maria' })
    expect(tarefa.titulo).toBe('Nova comunicação no Comunica PJe: Maria Silva (1 nova(s))')
    expect(String(tarefa.prazo)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('pelo cron roda as buscas de todo mundo; fonte fora do ar entra no resumo como erro', async () => {
    estado.tabelas.buscas_salvas = [{ id: 1, usuario_id: 'u1', termo: 'A B C D', caso_id: null }, { id: 2, usuario_id: 'u2', termo: 'Outra', caso_id: null }]
    comunica = () => new Response('', { status: 500 })
    const b = await (await chamar({ salvas: true }, { 'x-cron-secret': 'segredo' })).json()
    expect(b.resumo).toEqual([{ termo: 'A B C D', total: 0, novas: 0, erro: 'Comunica PJe 500' }, { termo: 'Outra', total: 0, novas: 0, erro: 'Comunica PJe 500' }])
    expect(estado.atualizados).toHaveLength(0)
  })
})

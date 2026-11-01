// Passo 548: Edge Function monitorar — processos (DataJud) e partes (Comunica PJe): linha do tempo, amostra e novidades por monitoramento.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const JWT = `x.${b64({ role: 'authenticated' })}.y`
const ANON = `x.${b64({ role: 'anon' })}.y`
const chamar = (corpo: unknown = {}, headers: Record<string, string> = { authorization: `Bearer ${JWT}` }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/monitorar', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))
const CNJ = '0000001-23.2024.8.19.0001'

let datajud: (url: string, corpo: unknown) => Response
let comunica: () => Response
const chamadas: string[] = []
beforeEach(() => {
  chamadas.length = 0
  datajud = () => jsonResp({ hits: { hits: [{ _source: { numeroProcesso: '00000012320248190001', classe: { nome: 'Despejo' }, orgaoJulgador: { nome: '3ª Vara Cível' },
    movimentos: [{ dataHora: '2026-01-10T10:00:00', nome: 'Distribuído' }, { dataHora: '2026-03-01T09:00:00', nome: 'Sentença' }, { dataHora: '2026-02-01T09:00:00', nome: 'Citação' }] } }] } })
  comunica = () => jsonResp({ items: [{ id: 77, data_disponibilizacao: '2026-03-02', siglaTribunal: 'TJRJ', tipoComunicacao: 'Intimação', numeroprocessocommascara: CNJ, texto: '<p>Fica  intimada</p>' }] })
  fingirFetch((u, init) => {
    chamadas.push(u)
    if (u.includes('datajud')) return datajud(u, JSON.parse(String(init?.body)))
    if (u.includes('comunicaapi')) return comunica()
    return new Response('', { status: 500 })
  })
  zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'segredo' }], monitoramentos: [] })
})

describe('monitorar', () => {
  it('exige token de pessoa logada ou o segredo do cron', async () => {
    expect((await chamar({}, {})).status).toBe(401)
    expect((await chamar({}, { authorization: `Bearer ${ANON}` })).status).toBe(401)
    expect((await chamar({}, { 'x-cron-secret': 'errado' })).status).toBe(401)
    expect((await chamar({}, { 'x-cron-secret': 'segredo' })).status).toBe(200)
  })

  it('linha do tempo: identifica o tribunal pelo número CNJ, consulta o índice certo e devolve os andamentos do mais recente ao mais antigo', async () => {
    const b = await (await chamar({ linha_do_tempo: CNJ })).json()
    expect(chamadas[0]).toContain('api_publica_tjrj/_search')
    expect(b).toMatchObject({ numero: '00000012320248190001', tribunal: 'tjrj', encontrado: true, classe: 'Despejo', orgao: '3ª Vara Cível' })
    expect(b.movs.map((m: { nome: string }) => m.nome)).toEqual(['Sentença', 'Citação', 'Distribuído'])
  })

  it('número inválido, DataJud fora do ar e processo não encontrado', async () => {
    let r = await chamar({ linha_do_tempo: '123' })
    expect(r.status).toBe(502); expect((await r.json()).erro).toBe('Número CNJ inválido')
    datajud = () => new Response('', { status: 503 })
    r = await chamar({ linha_do_tempo: CNJ })
    expect(r.status).toBe(502); expect((await r.json()).erro).toBe('DataJud 503')
    datajud = () => jsonResp({ hits: { hits: [] } })
    expect(await (await chamar({ linha_do_tempo: CNJ })).json()).toMatchObject({ encontrado: false, movs: [] })
  })

  it('amostra: devolve um processo público do índice com pelo menos 3 movimentos', async () => {
    datajud = () => jsonResp({ hits: { hits: [{ _source: { numeroProcesso: '1', movimentos: [{}] } }, { _source: { numeroProcesso: '2', classe: { nome: 'Locação' }, movimentos: [{}, {}, {}, {}] } }] } })
    const b = await (await chamar({ amostra: 'tj-sp!' })).json()
    expect(chamadas[0]).toContain('api_publica_tjsp/_search')
    expect(b).toEqual({ numero: '2', classe: 'Locação', movimentos: 4 })
  })

  it('monitoramentos: primeira verificação só registra o estado; a seguinte acusa as novidades; parte usa o Comunica PJe; erro fica no resumo', async () => {
    estado.tabelas.monitoramentos = [
      { id: 1, tipo: 'processo', valor: CNJ, ultimo_estado: null, novidades: null },
      { id: 2, tipo: 'processo', valor: CNJ, ultimo_estado: { chaves: ['2026-01-10T10:00:00|Distribuído', '2026-02-01T09:00:00|Citação'] }, novidades: [{ data: 'x', texto: 'antiga' }] },
      { id: 3, tipo: 'parte', valor: 'Maria Silva', ultimo_estado: { chaves: [] }, novidades: null },
      { id: 4, tipo: 'processo', valor: '999', ultimo_estado: null, novidades: null },
    ]
    const b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b.verificados).toBe(4)
    expect(b.resumo).toEqual([
      { valor: CNJ, novas: 0 }, { valor: CNJ, novas: 1 }, { valor: 'Maria Silva', novas: 1 }, { valor: '999', novas: 0, erro: 'Número CNJ inválido' },
    ])
    const m = estado.tabelas.monitoramentos as Record<string, any>[]
    expect(m[0]!.ultimo_estado).toMatchObject({ classe: 'Despejo', orgao: '3ª Vara Cível', encontrado: true })
    expect(m[0]!.ultimo_estado.chaves).toHaveLength(3)
    expect(m[0]!.novidades).toEqual([])
    expect(m[0]!.novidade_em).toBeUndefined()
    expect(m[1]!.novidades[0]).toMatchObject({ texto: 'Sentença', data: '2026-03-01T09:00:00' })
    expect(m[1]!.novidades[1]).toMatchObject({ texto: 'antiga' })
    expect(m[1]!.novidade_em).toBeTruthy()
    expect(m[2]!.novidades[0].texto).toBe(`TJRJ · Intimação · ${CNJ}: Fica intimada`)
    expect(chamadas.find(u => u.includes('comunicaapi'))).toContain('nomeParte=Maria%20Silva')
    expect(m[3]!.verificado_em).toBeUndefined()
  })

  it('com id verifica só aquele monitoramento', async () => {
    estado.tabelas.monitoramentos = [{ id: 1, tipo: 'processo', valor: CNJ, ultimo_estado: null, novidades: null }, { id: 2, tipo: 'parte', valor: 'X', ultimo_estado: null, novidades: null }]
    const b = await (await chamar({ id: 2 })).json()
    expect(b.verificados).toBe(1)
    expect(b.resumo[0].valor).toBe('X')
    expect(chamadas.some(u => u.includes('datajud'))).toBe(false)
  })
})

// Edge Function fontes-oficiais — o que o Escavador faz, direto no DataJud, no DJEN, na Receita e no Querido Diário.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'

const caixa = fingirDeno({ FONTES_ESPERA_MS: '0' })
const { indicesDataJud, itemComunica } = await import('./index')
const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`
const chamar = (body: unknown = {}, headers: Record<string, string> = { authorization: `Bearer ${jwt({ role: 'authenticated' })}` }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/fontes-oficiais', { method: 'POST', headers, body: JSON.stringify(body) }))

const NUM = '00012345620238190001' // TJRJ (j=8, tr=19)
let pedidos: { url: string; body?: string }[] = []
let resolver: (url: string, init?: RequestInit) => Response
beforeEach(() => {
  pedidos = []
  resolver = () => new Response('', { status: 500 })
  fingirFetch((u, init) => { pedidos.push({ url: u, body: init?.body as string | undefined }); return resolver(u, init) })
})

const pub = (id: number, n = '0001234-56.2023.8.19.0001', extra: object = {}) => ({
  id, data_disponibilizacao: '2026-10-01', siglaTribunal: 'TJRJ', nomeOrgao: '1ª Vara Cível', tipoComunicacao: 'Intimação', tipoDocumento: 'Despacho',
  nomeClasse: 'Procedimento Comum Cível', numeroprocessocommascara: n, texto: 'Intime-se <b>a parte</b> autora.<br>Prazo de 15 dias.', link: 'https://x/1',
  destinatarios: [{ nome: 'ACME LTDA', polo: 'P' }, { nome: 'Maria Souza', polo: 'A' }],
  destinatarioadvogados: [{ advogado: { nome: 'Ana Adv', numero_oab: '12345', uf_oab: 'RJ' } }], ...extra,
})

describe('índices do DataJud por número CNJ', () => {
  it('cobre estadual, federal, trabalho, eleitoral, militar e superiores; STF fica de fora', () => {
    const n = (j: string, tr: string) => `0000001-00.2023.${j}.${tr}.0001`
    expect(indicesDataJud(n('8', '19'))).toEqual(['tjrj'])
    expect(indicesDataJud(n('8', '07'))).toEqual(['tjdft'])
    expect(indicesDataJud(n('4', '02'))).toEqual(['trf2'])
    expect(indicesDataJud(n('5', '01'))).toEqual(['trt1'])
    expect(indicesDataJud(n('5', '00'))).toEqual(['tst'])
    expect(indicesDataJud(n('3', '00'))).toEqual(['stj'])
    expect(indicesDataJud(n('6', '00'))).toEqual(['tse'])
    expect(indicesDataJud(n('6', '19'))).toEqual(['tre-rj'])
    expect(indicesDataJud(n('7', '00'))).toEqual(['stm'])
    expect(indicesDataJud(n('9', '26'))).toEqual(['tjmsp'])
    expect(indicesDataJud(n('1', '00'))).toEqual([])
    expect(indicesDataJud('123')).toEqual([])
  })
})

describe('publicação do DJEN', () => {
  it('limpa o HTML, guarda o texto integral, as partes com polo e os advogados com OAB', () => {
    const i = itemComunica(pub(7))
    expect(i.texto).toBe('Intime-se a parte autora.\nPrazo de 15 dias.')
    expect(i.partes).toEqual([{ nome: 'ACME LTDA', polo: 'P' }, { nome: 'Maria Souza', polo: 'A' }])
    expect(i.advogados).toEqual([{ nome: 'Ana Adv', oab: '12345/RJ' }])
    expect(i).toMatchObject({ id: '7', data: '2026-10-01', tribunal: 'TJRJ', documento: 'Despacho' })
  })
})

describe('fontes-oficiais', () => {
  it('exige usuário logado', async () => {
    expect((await chamar({ tipo: 'nome', termo: 'Maria' }, {})).status).toBe(401)
    expect((await chamar({ tipo: 'nome', termo: 'Maria' }, { authorization: `Bearer ${jwt({ role: 'anon' })}` })).status).toBe(401)
  })

  it('processo: junta os andamentos de todos os graus do DataJud e traz todas as publicações do número', async () => {
    resolver = u => {
      if (u.includes('datajud')) return jsonResp({ hits: { hits: [
        { _source: { tribunal: 'TJRJ', grau: 'G1', classe: { nome: 'Procedimento Comum' }, orgaoJulgador: { nome: '1ª Vara' }, assuntos: [{ nome: 'Locação' }], movimentos: [{ dataHora: '2024-01-01T10:00:00', codigo: 26, nome: 'Distribuição' }, { dataHora: '2025-03-01T10:00:00', codigo: 193, nome: 'Sentença', complementosTabelados: [{ nome: 'procedente' }] }] } },
        { _source: { tribunal: 'TJRJ', grau: 'G2', assuntos: [{ nome: 'Locação' }, { nome: 'Despejo' }], movimentos: [{ dataHora: '2026-02-01T10:00:00', codigo: 22, nome: 'Baixa definitiva' }, { dataHora: '2024-01-01T10:00:00', codigo: 26, nome: 'Distribuição' }] } },
      ] } })
      return jsonResp({ count: 2, items: [pub(1), pub(2)] })
    }
    const b = await (await chamar({ tipo: 'processo', termo: '0001234-56.2023.8.19.0001' })).json()
    expect(pedidos.some(p => p.url.includes('api_publica_tjrj/_search'))).toBe(true)
    expect(b.datajud).toMatchObject({ encontrado: true, graus: ['G1', 'G2'], assuntos: ['Locação', 'Despejo'] })
    expect(b.datajud.movimentos.map((m: any) => m.nome)).toEqual(['Baixa definitiva', 'Sentença', 'Distribuição'])
    expect(b.datajud.movimentos[1].complemento).toBe('procedente')
    const comunica = pedidos.find(p => p.url.includes('comunicaapi'))!.url
    expect(comunica).toContain('numeroProcesso=00012345620238190001'); expect(comunica).not.toContain('dataDisponibilizacao')
    expect(b.comunica.itens).toHaveLength(2)
  })

  it('processo com período: o DJEN só traz a janela pedida', async () => {
    resolver = u => (u.includes('datajud') ? jsonResp({ hits: { hits: [] } }) : jsonResp({ items: [] }))
    await chamar({ tipo: 'processo', termo: '0001234-56.2023.8.19.0001', inicio: '2026-08-15', fim: '2026-11-11' })
    const u = new URL(pedidos.find(p => p.url.includes('comunicaapi'))!.url)
    expect(u.searchParams.get('dataDisponibilizacaoInicio')).toBe('2026-08-15'); expect(u.searchParams.get('numeroProcesso')).toBe('00012345620238190001')
  })

  it('processo do TRE do DF tenta o segundo nome de índice quando o primeiro não existe', async () => {
    resolver = u => u.includes('tre-dft') ? new Response('', { status: 404 }) : u.includes('tre-df/') ? jsonResp({ hits: { hits: [] } }) : jsonResp({ items: [] })
    const b = await (await chamar({ tipo: 'processo', termo: '0000001-00.2023.6.07.0001' })).json()
    expect(b.datajud).toMatchObject({ ok: true, encontrado: false, indice: 'tre-df' })
  })

  it('nome: busca no DJEN no período pedido, percorre as páginas e avisa se ficou incompleto', async () => {
    const cheia = Array.from({ length: 100 }, (_, k) => pub(k + 1))
    resolver = u => { const pg = Number(new URL(u).searchParams.get('pagina')); return jsonResp({ count: 700, items: pg <= 5 ? cheia : [] }) }
    const b = await (await chamar({ tipo: 'nome', termo: 'ACME Ltda', inicio: '2026-08-01', fim: '2026-10-29' })).json()
    const urls = pedidos.map(p => new URL(p.url))
    expect(urls).toHaveLength(5)
    expect(urls[0].searchParams.get('nomeParte')).toBe('ACME Ltda')
    expect(urls[0].searchParams.get('dataDisponibilizacaoInicio')).toBe('2026-08-01')
    expect(b.comunica).toMatchObject({ ok: true, total: 700, incompleto: true })
    expect(b.queridoDiario).toBeNull()
  })

  it('advogado pelo nome e OAB pelo número e UF', async () => {
    resolver = () => jsonResp({ count: 0, items: [] })
    await chamar({ tipo: 'advogado', termo: 'Ana Advogada', inicio: '2026-10-01', fim: '2026-10-30' })
    expect(new URL(pedidos[0].url).searchParams.get('nomeAdvogado')).toBe('Ana Advogada')
    pedidos = []
    await chamar({ tipo: 'oab', termo: '012.345/rj', inicio: '2026-10-01', fim: '2026-10-30' })
    const u = new URL(pedidos[0].url)
    expect(u.searchParams.get('numeroOab')).toBe('12345'); expect(u.searchParams.get('ufOab')).toBe('RJ')
  })

  it('diários municipais só quando pedidos', async () => {
    resolver = u => u.includes('queridodiario') ? jsonResp({ total_gazettes: 1, gazettes: [{ date: '2026-09-09', territory_name: 'Niterói', state_code: 'RJ', excerpts: ['ACME <b>LTDA</b> contratada'], url: 'https://qd/1' }] }) : jsonResp({ items: [] })
    const b = await (await chamar({ tipo: 'nome', termo: 'ACME Ltda', inicio: '2026-10-01', fim: '2026-10-30', diarios: true })).json()
    expect(b.queridoDiario).toMatchObject({ ok: true, total: 1, itens: [{ municipio: 'Niterói/RJ', trecho: 'ACME LTDA contratada' }] })
  })

  it('CNPJ: razão social, situação e sócios pela Receita', async () => {
    resolver = () => jsonResp({ razao_social: 'ACME LTDA', descricao_situacao_cadastral: 'ATIVA', qsa: [{ nome_socio: 'JOAO', qualificacao_socio: 'Sócio-Administrador' }] })
    const b = await (await chamar({ tipo: 'cnpj', termo: '11.222.333/0001-81' })).json()
    expect(pedidos[0].url).toBe('https://brasilapi.com.br/api/cnpj/v1/11222333000181')
    expect(b.receita).toMatchObject({ encontrado: true, nome: 'ACME LTDA', situacao: 'ATIVA', socios: [{ nome: 'JOAO' }] })
  })

  it('tenta de novo quando a fonte oscila (500 e depois 200)', async () => {
    let n = 0
    resolver = () => (++n === 1 ? new Response('', { status: 503 }) : jsonResp({ count: 1, items: [pub(9)] }))
    const b = await (await chamar({ tipo: 'nome', termo: 'Maria Souza', inicio: '2026-10-01', fim: '2026-10-30' })).json()
    expect(n).toBe(2); expect(b.comunica.itens).toHaveLength(1)
  })

  it('recusa período maior que 93 dias, número curto, nome curto e tipo desconhecido', async () => {
    expect((await chamar({ tipo: 'nome', termo: 'Maria Souza', inicio: '2026-01-01', fim: '2026-06-01' })).status).toBe(400)
    expect((await chamar({ tipo: 'nome', termo: 'Maria Souza' })).status).toBe(400)
    expect((await chamar({ tipo: 'processo', termo: '123' })).status).toBe(400)
    expect((await chamar({ tipo: 'nome', termo: 'Ma', inicio: '2026-10-01', fim: '2026-10-30' })).status).toBe(400)
    expect((await chamar({ tipo: 'outra' })).status).toBe(400)
    expect(pedidos).toHaveLength(0)
  })
})

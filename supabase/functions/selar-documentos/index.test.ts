// Passo 557: Edge Function selar-documentos — hash dos arquivos, manifesto do dia ancorado no OpenTimestamps, auditoria de um registro e verificação do selo no Bitcoin.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', SUPABASE_ANON_KEY: 'anon' })
await import('./index')
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const JWT = `x.${b64({ role: 'authenticated', sub: 'u1' })}.y`
const chamar = (corpo: unknown = {}, headers: Record<string, string> = { authorization: `Bearer ${JWT}` }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/selar-documentos', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
const sha = async (t: string | Uint8Array) => hex(await crypto.subtle.digest('SHA-256', typeof t === 'string' ? new TextEncoder().encode(t) : t))
const MAGIA = Buffer.from('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294', 'hex')
const varbytes = (b: Buffer) => Buffer.concat([Buffer.from([b.length]), b])
// Atestação "pendente" apontando para um calendário, direto sobre o digest.
const pendente = (uri: string) => Buffer.concat([Buffer.from([0x00]), Buffer.from('83dfe30d2ef90c8e', 'hex'), varbytes(varbytes(Buffer.from(uri)))])
// Atestação "bitcoin" na altura dada (varint de 1 byte para alturas pequenas de teste).
const bitcoin = (altura: number) => Buffer.concat([Buffer.from([0x00]), Buffer.from('0588960d73d71901', 'hex'), varbytes(Buffer.from([altura]))])

const pedidos: { url: string; corpo?: unknown }[] = []
let calendario: (u: string) => Response
let bloco: (u: string) => Response
beforeEach(() => {
  pedidos.length = 0
  calendario = () => new Response(pendente('https://alice.btc.calendar.opentimestamps.org'))
  bloco = () => new Response('', { status: 404 })
  fingirFetch((u, init) => {
    pedidos.push({ url: u, corpo: init?.body })
    if (u.includes('calendar')) return calendario(u)
    if (u.includes('blockstream') || u.includes('mempool')) return bloco(u)
    return new Response('', { status: 500 })
  })
  zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'segredo' }], documentos: [], contratos: [], assinaturas_eletronicas: [], selos_blockchain: [] })
})

describe('selar-documentos', () => {
  it('exige pessoa logada ou cron; pedido vazio é 400; nada novo para selar', async () => {
    expect((await chamar({ selar: true }, {})).status).toBe(401)
    expect((await chamar({ selar: true }, { 'x-cron-secret': 'x' })).status).toBe(401)
    expect((await chamar({})).status).toBe(400)
    expect(await (await chamar({ selar: true }, { 'x-cron-secret': 'segredo' })).json()).toEqual({ selados: 0, mensagem: 'Nada novo para selar.' })
    expect(pedidos).toHaveLength(0)
  })

  it('selar: calcula o hash dos arquivos sem hash, monta o manifesto ordenado com documentos, contratos e assinaturas, ancora nos calendários que responderem e grava o selo', async () => {
    estado.arquivos['docs/a.pdf'] = 'conteudo A'
    estado.tabelas.documentos = [{ id: 'd1', caminho_storage: 'docs/a.pdf', sha256: null, selo_id: null }, { id: 'd2', caminho_storage: 'docs/sumiu.pdf', sha256: null, selo_id: null }, { id: 'd3', caminho_storage: 'x', sha256: 'ff'.repeat(32), selo_id: 7 }]
    estado.tabelas.contratos = [{ id: 'c1', caminho_arquivo: '', sha256: 'aa'.repeat(32), selo_id: null }]
    estado.tabelas.assinaturas_eletronicas = [{ id: 'as1', hash_texto: '11'.repeat(32), hash_assinatura: '22'.repeat(32), assinado_em: '2026-11-01', selo_id: null }, { id: 'as2', hash_texto: '33'.repeat(32), hash_assinatura: null, assinado_em: null, selo_id: null }]
    calendario = u => (u.includes('bob') ? new Response('', { status: 500 }) : new Response(pendente(u.replace('/digest', ''))))
    const b = await (await chamar({ selar: true }, { 'x-cron-secret': 'segredo' })).json()
    const hA = await sha('conteudo A')
    const folhas = [`${'22'.repeat(32)}  assinaturas/as1`, `${'11'.repeat(32)}  assinaturas/as1/texto`, `${'aa'.repeat(32)}  contratos/c1`, `${hA}  documentos/d1`].sort()
    const raiz = await sha(folhas.join('\n') + '\n')
    expect(b).toEqual({ selados: 4, assinaturas: 1, selo: 'novo-1', raiz, calendarios: ['https://alice.btc.calendar.opentimestamps.org', 'https://finney.calendar.eternitywall.com'] })
    expect((estado.tabelas.documentos![0] as { sha256: string }).sha256).toBe(hA)
    expect((estado.tabelas.documentos![1] as { sha256: null }).sha256).toBeNull()
    expect(estado.inseridos[0]).toMatchObject({ tabela: 'selos_blockchain', linha: { raiz_merkle: raiz, folhas, calendarios: b.calendarios } })
    const ots = Buffer.from((estado.inseridos[0]!.linha as { prova_ots: string }).prova_ots, 'base64')
    expect(ots.subarray(0, MAGIA.length).equals(MAGIA)).toBe(true)
    expect(ots[MAGIA.length]).toBe(0x01); expect(ots[MAGIA.length + 1]).toBe(0x08)
    expect(hex(ots.subarray(MAGIA.length + 2, MAGIA.length + 34))).toBe(raiz)
    expect(ots.includes(Buffer.from([0xff]))).toBe(true) // dois ramos
    expect(pedidos.filter(p => p.url.endsWith('/digest'))).toHaveLength(3)
    expect(estado.tabelas.documentos!.map(d => (d as { selo_id: unknown }).selo_id)).toEqual(['novo-1', null, 7])
    expect((estado.tabelas.contratos![0] as { selo_id: string }).selo_id).toBe('novo-1')
    expect(estado.tabelas.assinaturas_eletronicas!.map(a => (a as { selo_id: unknown }).selo_id)).toEqual(['novo-1', null])
  })

  it('selar: nenhum calendário respondeu → erro sem gravar selo', async () => {
    estado.tabelas.contratos = [{ id: 'c1', caminho_arquivo: 'c.pdf', sha256: 'aa'.repeat(32), selo_id: null }]
    calendario = () => new Response('', { status: 503 })
    const b = await (await chamar({ selar: true })).json()
    expect(b.selados).toBe(0); expect(b.erro).toContain('não responderam')
    expect(estado.inseridos).toHaveLength(0)
  })

  it('auditar: compara o hash atual do arquivo com o registrado e traz o selo com o manifesto; tabela inválida, sem acesso e sem arquivo', async () => {
    estado.arquivos['c.pdf'] = 'contrato'
    const h = await sha('contrato')
    estado.tabelas.contratos = [{ id: 'c1', caminho_arquivo: 'c.pdf', sha256: h, selo_id: 5 }, { id: 'c2', caminho_arquivo: 'c.pdf', sha256: 'bb'.repeat(32), selo_id: null }, { id: 'c3', caminho_arquivo: null, sha256: null, selo_id: null }]
    estado.tabelas.selos_blockchain = [{ id: 5, criado_em: '2026-11-01', raiz_merkle: 'r', calendarios: [], situacao: 'pendente', prova_ots: 'AA==', folhas: ['x  contratos/c1'] }]
    let b = await (await chamar({ auditar: { tabela: 'contratos', id: 'c1' } })).json()
    expect(b).toMatchObject({ integro: true, hashRegistrado: h, hashAtual: h, selo: { id: 5, manifesto: 'x  contratos/c1\n' } })
    b = await (await chamar({ auditar: { tabela: 'contratos', id: 'c2' } })).json()
    expect(b).toMatchObject({ integro: false, hashAtual: h, selo: null })
    expect((await chamar({ auditar: { tabela: 'usuarios', id: 'c1' } })).status).toBe(400)
    expect((await chamar({ auditar: { tabela: 'contratos', id: 'zzz' } })).status).toBe(404)
    expect((await chamar({ auditar: { tabela: 'contratos', id: 'c3' } })).status).toBe(400)
    // Só pessoa logada audita: o cron recebe "pedido inválido".
    expect((await chamar({ auditar: { tabela: 'contratos', id: 'c1' } }, { 'x-cron-secret': 'segredo' })).status).toBe(400)
  })

  it('verificar: lê o .ots, consulta o calendário pendente e, confirmado, busca a data do bloco e marca o selo; pendente informa; prova que não bate dá erro', async () => {
    const raiz = await sha('manifesto')
    const ots = Buffer.concat([MAGIA, Buffer.from([0x01, 0x08]), Buffer.from(raiz, 'hex'), pendente('https://alice.btc.calendar.opentimestamps.org')])
    estado.tabelas.selos_blockchain = [{ id: 9, criado_em: '2026-11-01', raiz_merkle: raiz, prova_ots: ots.toString('base64'), calendarios: [], situacao: 'pendente' }]
    calendario = u => (u.includes('/timestamp/') ? new Response('', { status: 404 }) : new Response(''))
    let b = await (await chamar({ verificar: 9 })).json()
    expect(b).toMatchObject({ confirmado: false, selo_id: 9, raiz, consultas: [{ calendario: 'https://alice.btc.calendar.opentimestamps.org', situacao: 'ainda pendente' }] })
    expect(pedidos.at(-1)!.url).toBe(`https://alice.btc.calendar.opentimestamps.org/timestamp/${raiz}`)
    // Agora o calendário devolve a atestação do Bitcoin na altura 100.
    calendario = () => new Response(bitcoin(100))
    bloco = u => (u.endsWith('/block-height/100') ? new Response('ab'.repeat(32)) : new Response(JSON.stringify({ timestamp: 1700000000 })))
    b = await (await chamar({ verificar: 9 })).json()
    expect(b).toMatchObject({ confirmado: true, altura: 100, calendario: 'https://alice.btc.calendar.opentimestamps.org', bloco_hash: 'ab'.repeat(32), data_bloco: '2023-11-14T22:13:20.000Z' })
    expect(estado.atualizados.at(-1)).toMatchObject({ tabela: 'selos_blockchain', valores: { situacao: 'confirmado', altura_bitcoin: 100, bloco_hash: 'ab'.repeat(32) }, filtros: [['id', 'eq', 9]] })
    estado.tabelas.selos_blockchain![0]!.raiz_merkle = 'outra'
    expect((await (await chamar({ verificar: 9 })).json()).erro).toContain('não corresponde')
    expect((await (await chamar({ verificar: 404 })).json()).erro).toBe('Selo não encontrado.')
    estado.tabelas.selos_blockchain = [{ id: 1, raiz_merkle: raiz, prova_ots: Buffer.from('lixo').toString('base64') }]
    const r = await chamar({ verificar: 1 })
    expect(r.status).toBe(500); expect((await r.json()).erro).toContain('não é um arquivo .ots')
  })
})

// Passo C2: ingestão do GDELT na ontologia do C1. Nenhum teste aqui toca a rede do GDELT —
// o fetch é substituído e os arquivos .zip são montados em memória.
import { describe, it, expect, beforeEach } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar } from '../_testes/supabase-js'
import { camposHash as camposHashSrc, hashConteudo as hashSrc } from '../../../src/lib/predicao/ontologia'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
const mod = await import('./index')

// --- Banco em memória -------------------------------------------------------------------------
// A função grava em SQL (a API REST do projeto não expõe o esquema instituto), então o teste
// injeta um banco em memória que obedece à MESMA unicidade do esquema do C1:
//   eventos (fonte, conteudo_hash) único; entidades (tipo, chave_natural) único;
//   lugares (codigo_ibge) único quando não é nulo; evento_entidades com chave primária tripla.
type Linha = Record<string, unknown>
const bd: { fontes: Linha[]; lugares: Linha[]; eventos: Linha[]; entidades: Linha[]; vinculos: Linha[] } =
  { fontes: [], lugares: [], eventos: [], entidades: [], vinculos: [] }
let seq = 0
function bancoMemoria(): import('./index').Banco {
  return {
    async registrarFonte(l) {
      const i = bd.fontes.findIndex(f => f.codigo === l.codigo)
      if (i >= 0) bd.fontes[i] = { ...l }; else bd.fontes.push({ ...l })
    },
    async lugaresPorIbge(ibges) {
      return bd.lugares.filter(l => l.codigo_ibge && ibges.includes(String(l.codigo_ibge)))
        .map(l => ({ id: String(l.id), codigo_ibge: String(l.codigo_ibge) }))
    },
    async porHash(tabela, hashes) {
      return (tabela === 'eventos' ? bd.eventos : bd.lugares)
        .filter(l => l.fonte === mod.FONTE && hashes.includes(String(l.conteudo_hash)))
        .map(l => ({ id: String(l.id), conteudo_hash: String(l.conteudo_hash) }))
    },
    async inserirLugares(ls) {
      const fora: { id: string; codigo_ibge: string | null; conteudo_hash: string }[] = []
      for (const l of ls) {
        if (l.codigo_ibge && bd.lugares.some(x => x.codigo_ibge === l.codigo_ibge)) continue
        const linha = { ...l, id: `lug-${++seq}` }
        bd.lugares.push(linha)
        fora.push({ id: String(linha.id), codigo_ibge: (l.codigo_ibge as string) ?? null, conteudo_hash: String(l.conteudo_hash) })
      }
      return fora
    },
    async inserirEventos(ls) {
      const fora: { id: string; conteudo_hash: string }[] = []
      for (const l of ls) {
        if (bd.eventos.some(x => x.fonte === l.fonte && x.conteudo_hash === l.conteudo_hash)) continue
        const linha = { ...l, id: `ev-${++seq}` }
        bd.eventos.push(linha)
        fora.push({ id: String(linha.id), conteudo_hash: String(l.conteudo_hash) })
      }
      return fora
    },
    async entidadesPorChave(chaves) {
      return bd.entidades.filter(e => chaves.includes(String(e.chave_natural)))
        .map(e => ({ id: String(e.id), tipo: String(e.tipo), chave_natural: String(e.chave_natural) }))
    },
    async inserirEntidades(ls) {
      const fora: { id: string; tipo: string; chave_natural: string }[] = []
      for (const l of ls) {
        if (bd.entidades.some(x => x.tipo === l.tipo && x.chave_natural === l.chave_natural)) continue
        const linha = { ...l, id: `ent-${++seq}` }
        bd.entidades.push(linha)
        fora.push({ id: String(linha.id), tipo: String(l.tipo), chave_natural: String(l.chave_natural) })
      }
      return fora
    },
    async inserirVinculos(ls) {
      let n = 0
      for (const v of ls) {
        if (bd.vinculos.some(x => x.evento_id === v.evento_id && x.entidade_id === v.entidade_id && x.papel === v.papel)) continue
        bd.vinculos.push({ ...v }); n++
      }
      return n
    },
    fechar: async () => {},
  }
}

const chamar = (segredo: string | null, corpo: unknown = {}) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/gdelt-coleta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(segredo ? { 'x-cron-secret': segredo } : {}) },
    body: JSON.stringify(corpo),
  }))

// --- ZIP de mentirinha ------------------------------------------------------------------------
const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff]
const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]

/** ZIP com um único arquivo, guardado (0) ou deflate (8), com diretório central mínimo. */
function zip(nome: string, conteudo: string, metodo: 0 | 8 = 8): Uint8Array {
  const cru = new TextEncoder().encode(conteudo)
  const dados = metodo === 8 ? new Uint8Array(deflateRawSync(cru)) : cru
  const n = new TextEncoder().encode(nome)
  const local = [...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(metodo), ...u16(0), ...u16(0),
    ...u32(0), ...u32(dados.length), ...u32(cru.length), ...u16(n.length), ...u16(0), ...n, ...dados]
  const central = [...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(metodo), ...u16(0), ...u16(0),
    ...u32(0), ...u32(dados.length), ...u32(cru.length), ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
    ...u32(0), ...u32(0), ...n]
  const fim = [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(1), ...u16(1),
    ...u32(central.length), ...u32(local.length), ...u16(0)]
  return new Uint8Array([...local, ...central, ...fim])
}

// --- Duas linhas reais em forma, uma do Brasil e uma do Chile -----------------------------------
const tab = (...c: (string | number)[]) => c.join('\t')
/** 61 colunas do Events 2.0, com as que importam preenchidas. */
function linhaEvento(opts: { id: string; dia: string; raiz: string; code: string; pais: string; adm1: string; lat: string; lon: string; nome: string }) {
  const c = new Array(61).fill('')
  c[0] = opts.id; c[1] = opts.dia; c[2] = opts.dia.slice(0, 6); c[3] = opts.dia.slice(0, 4)
  c[5] = 'BRAGOV'; c[6] = 'BRAZIL'; c[7] = 'BRA'; c[12] = 'GOV'
  c[15] = 'BRAENV'; c[16] = 'ACTIVISTS'; c[17] = 'BRA'; c[22] = 'ENV'
  c[25] = '1'; c[26] = opts.code; c[27] = opts.code; c[28] = opts.raiz; c[29] = '3'
  c[30] = '-6.5'; c[31] = '10'; c[32] = '1'; c[33] = '10'; c[34] = '-4.2'   // Goldstein, NumMentions, NumSources, NumArticles, AvgTone — descartados
  c[51] = '4'; c[52] = opts.nome; c[53] = opts.pais; c[54] = opts.adm1; c[55] = ''
  c[56] = opts.lat; c[57] = opts.lon; c[58] = '-1234567'
  c[59] = `${opts.dia}121500`; c[60] = 'https://exemplo.org/noticia'
  return tab(...c)
}
/** 16 colunas da Mentions 2.0. */
function linhaMencao(id: string, dia: string, fonte: string, tom: string, conf: string) {
  const c = new Array(16).fill('')
  c[0] = id; c[1] = `${dia}000000`; c[2] = `${dia}121500`; c[3] = '1'; c[4] = fonte
  c[5] = 'https://exemplo.org/noticia'; c[6] = '3'; c[10] = '1'; c[11] = conf; c[12] = '900'
  c[13] = `${tom},4.1,2.3,6.4,20,10,300`
  return tab(...c)
}

const DIA = '20261110'
const EXPORT = [
  linhaEvento({ id: '100001', dia: DIA, raiz: '14', code: '141', pais: 'BR', adm1: 'BR27', lat: '-23.5505', lon: '-46.6333', nome: 'Sao Paulo, Sao Paulo, Brazil' }),
  linhaEvento({ id: '100002', dia: DIA, raiz: '18', code: '180', pais: 'BR', adm1: 'BR15', lat: '-19.9167', lon: '-43.9345', nome: 'Belo Horizonte, Minas Gerais, Brazil' }),
  linhaEvento({ id: '900003', dia: DIA, raiz: '04', code: '040', pais: 'CI', adm1: 'CI12', lat: '-33.45', lon: '-70.6667', nome: 'Santiago, Chile' }),
].join('\n') + '\n'
const MENTIONS = [
  linhaMencao('100001', DIA, 'folha.uol.com.br', '-62.5', '80'),
  linhaMencao('100002', DIA, 'g1.globo.com', '10', '50'),
  linhaMencao('900003', DIA, 'latercera.com', '0', '30'),
].join('\n') + '\n'

function rede() {
  return fingirFetch((u) => {
    if (u.includes('lastupdate.txt')) return new Response(`188186 abc ${BASE}/${DIA}121500.export.CSV.zip\n`)
    if (u.includes('.export.CSV.zip')) return new Response(zip('x.export.CSV', EXPORT, 8) as unknown as BodyInit)
    if (u.includes('.mentions.CSV.zip')) return new Response(zip('x.mentions.CSV', MENTIONS, 0) as unknown as BodyInit)
    return new Response('não', { status: 404 })
  })
}
const BASE = 'http://data.gdeltproject.org/gdeltv2'

beforeEach(() => {
  zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }] })
  bd.fontes = []; bd.lugares = []; bd.eventos = []; bd.entidades = []; bd.vinculos = []
  seq = 0
  mod.abrirBanco.criar = async () => bancoMemoria()
  rede()
})

describe('gdelt-coleta: a porta', () => {
  it('ninguém dispara coleta sem o segredo do robô agendado', async () => {
    expect((await chamar(null)).status).toBe(401)
    expect((await chamar('errado')).status).toBe(401)
    expect(bd.eventos).toHaveLength(0)
  })

  it('janela e limite têm teto, e o padrão é pequeno', async () => {
    const r = await (await chamar('cron-1', { janela: 999, limite: 999999 })).json()
    expect(r.carimbos).toHaveLength(8)          // teto de 8 quartos de hora
    const r2 = await (await chamar('cron-1', {})).json()
    expect(r2.carimbos).toHaveLength(1)         // padrão: uma janela de 15 minutos
  })
})

describe('gdelt-coleta: o hash é o mesmo do C1', () => {
  it('a receita do hash bate campo a campo com src/lib/predicao/ontologia.ts', async () => {
    const lugar = { tipo: 'ponto', nome: 'Sao Paulo', uf: 'SP', codigo_ibge: null, latitude: '-23.550500', longitude: '-46.633300', geometria: null, identificadores: { gdelt_feature_id: '-1' }, fonte: 'gdelt' }
    const evento = { tipo: 'protesto', subtipo: 'cameo_141', titulo: 't', ocorrido_em: '2026-11-10T00:00:00.000Z', observado_em: '2026-11-13T10:00:00.000Z', latitude: '-23.550500', longitude: '-46.633300', valor: null, unidade: null, bruto: { a: '1' }, fonte: 'gdelt' }
    const ent = { tipo: 'orgao_publico', nome: 'BRAZIL', chave_natural: 'gdelt:BRAGOV', identificadores: { gdelt_ator: 'BRAGOV' }, atributos: {}, fonte: 'gdelt' }
    expect(mod.camposHash.lugar(lugar as never)).toEqual(camposHashSrc.lugar(lugar as never))
    expect(mod.camposHash.evento(evento as never)).toEqual(camposHashSrc.evento(evento as never))
    expect(mod.camposHash.entidade(ent as never)).toEqual(camposHashSrc.entidade(ent as never))
    for (const c of [mod.camposHash.lugar(lugar as never), mod.camposHash.evento(evento as never), mod.camposHash.entidade(ent as never)]) {
      expect(await mod.hashConteudo(c)).toBe(await hashSrc(c))
    }
  })

  it('o hash é do conteúdo: não entra id nem hora de gravação, e a mesma linha dá sempre o mesmo', async () => {
    const [a] = mod.linhasCsv(EXPORT)
    const m1 = mod.mapearEvento(a!, '2026-11-13T10:00:00.000Z')!
    const m2 = mod.mapearEvento(a!, '2026-11-13T23:59:00.000Z')!
    // observado_em muda e o hash não: é o que faz a reexecução não duplicar.
    expect(await mod.hashConteudo(mod.camposHash.evento(m1.evento))).toBe(await mod.hashConteudo(mod.camposHash.evento(m2.evento)))
  })
})

describe('gdelt-coleta: leitura dos arquivos', () => {
  it('descomprime o zip do GDELT, guardado e deflate, sem biblioteca externa', async () => {
    expect(await mod.primeiroDoZip(zip('a.CSV', 'oi\tmundo\n', 8))).toBe('oi\tmundo\n')
    expect(await mod.primeiroDoZip(zip('a.CSV', 'oi\tmundo\n', 0))).toBe('oi\tmundo\n')
    await expect(mod.primeiroDoZip(new Uint8Array(40))).rejects.toThrow(/ZIP/)
  })

  it('separa por TAB e ignora linha vazia', () => {
    expect(mod.linhasCsv('a\tb\n\nc\td\r\n')).toEqual([['a', 'b'], ['c', 'd']])
    expect(mod.linhasCsv(EXPORT)).toHaveLength(3)
  })

  it('a janela são carimbos de 15 minutos, do mais antigo ao mais novo', () => {
    expect(mod.carimbos('20261110121500', 3)).toEqual(['20261110114500', '20261110120000', '20261110121500'])
    expect(mod.carimbo(new Date('2026-11-10T12:07:33Z'))).toBe('20261110120000')
  })
})

describe('gdelt-coleta: o mapeamento', () => {
  const linhas = () => mod.linhasCsv(EXPORT)

  it('só o Brasil entra', () => {
    expect(linhas().map(mod.doBrasil)).toEqual([true, true, false])
  })

  it('a raiz CAMEO vira o tipo do evento, em português', () => {
    const m = mod.mapearEvento(linhas()[0]!, '2026-11-13T10:00:00.000Z')!
    expect(m.evento.tipo).toBe('protesto')
    expect(m.evento.subtipo).toBe('cameo_141')
    expect(mod.mapearEvento(linhas()[1]!, 'x')!.evento.tipo).toBe('agressao')
  })

  it('ocorrido_em é a data do GDELT e observado_em é a hora desta execução — nunca o contrário', () => {
    const agora = '2026-11-13T10:00:00.000Z'
    const m = mod.mapearEvento(linhas()[0]!, agora)!
    expect(m.evento.ocorrido_em).toBe('2026-11-10T00:00:00.000Z')
    expect(m.evento.observado_em).toBe(agora)
    expect(new Date(m.evento.observado_em).getTime()).toBeGreaterThan(new Date(m.evento.ocorrido_em).getTime())
    // Na menção, o que aconteceu foi a publicação do artigo (MentionTimeDate).
    const n = mod.mapearMencao(mod.linhasCsv(MENTIONS)[0]!, agora)!
    expect(n.evento.ocorrido_em).toBe('2026-11-10T12:15:00.000Z')
    expect(n.evento.observado_em).toBe(agora)
  })

  it('o lugar é um ponto com caixa envolvente e aponta para a UF; codigo_ibge do município fica vazio', () => {
    const m = mod.mapearEvento(linhas()[0]!, 'x')!
    expect(m.lugar).toMatchObject({ tipo: 'ponto', uf: 'SP', codigo_ibge: null, latitude: '-23.550500', longitude: '-46.633300', lat_min: '-23.550500', lon_max: '-46.633300' })
    expect(m.estado).toMatchObject({ tipo: 'estado', nome: 'São Paulo', uf: 'SP', codigo_ibge: '35' })
    expect(mod.ADM1_BR.BR15).toEqual({ uf: 'MG', ibge: '31', nome: 'Minas Gerais' })
  })

  it('os atores viram entidades com papel ator e alvo, pela chave gdelt:<codigo>', () => {
    const m = mod.mapearEvento(linhas()[0]!, 'x')!
    expect(m.atores.map(a => [a.papel, a.entidade.tipo, a.entidade.chave_natural])).toEqual([
      ['ator', 'orgao_publico', 'gdelt:BRAGOV'],
      ['alvo', 'pessoa_juridica_outra', 'gdelt:BRAENV'],
    ])
    expect(mod.tipoEntidade('BUS', 'BRABUS')).toBe('empresa')
    expect(mod.tipoEntidade('', 'BRA')).toBe('pais')
  })

  it('o que o C15 proibiu não entra: Goldstein, AvgTone, NumMentions/Sources/Articles, etnia, religião', () => {
    const m = mod.mapearEvento(linhas()[0]!, 'x')!
    const texto = JSON.stringify(m.evento)
    for (const proibido of ['goldstein', 'avg_tone', 'num_mentions', 'num_sources', 'num_articles', 'ethnic', 'religion']) {
      expect(texto.toLowerCase()).not.toContain(proibido)
    }
    expect(m.evento.tom).toBeNull()          // nada de AvgTone no evento
    expect(JSON.stringify(m.evento.bruto)).not.toContain('-6.5')  // o Goldstein da linha não sobreviveu
  })

  it('na menção, Confidence vira 0 a 1 e MentionDocTone vira -10 a 10', () => {
    const n = mod.mapearMencao(mod.linhasCsv(MENTIONS)[0]!, 'x')!
    expect(n.evento.confianca).toBe('0.8000')   // 80 de 100
    expect(n.evento.tom).toBe('-6.250')         // -62.5 de -100..100
    expect(n.evento.tipo).toBe('mencao_noticiosa')
  })

  it('linha sem id ou sem data não vira evento', () => {
    expect(mod.mapearEvento(['', '20261110'], 'x')).toBeNull()
    expect(mod.mapearEvento(['1', 'não-é-data'], 'x')).toBeNull()
    expect(mod.mapearMencao(['1', '', 'lixo'], 'x')).toBeNull()
  })
})

describe('gdelt-coleta: o SQL', () => {
  it('monta VALUES numerado, na ordem das colunas, com jsonb convertido', () => {
    const v = mod.valoresSql(['tipo', 'bruto', 'fonte'], [
      { tipo: 'protesto', bruto: { b: 1, a: 2 }, fonte: 'gdelt' },
      { tipo: 'ameaca', bruto: null, fonte: 'gdelt' },
    ])
    expect(v.sql).toBe('($1,$2::jsonb,$3),($4,$5::jsonb,$6)')  // nulo também vai com a conversão: null::jsonb é válido
    expect(v.params).toEqual(['protesto', '{"b":1,"a":2}', 'gdelt', 'ameaca', null, 'gdelt'])
  })

  it('coluna ausente entra como nulo, nunca como undefined', () => {
    const v = mod.valoresSql(['a', 'b'], [{ a: 1 }])
    expect(v.params).toEqual([1, null])
  })
})

describe('gdelt-coleta: idempotência', () => {
  it('a primeira execução grava; a segunda, na mesma janela, insere zero', async () => {
    const um = await (await chamar('cron-1', { ate: `${DIA}121500`, janela: 1, limite: 50 })).json()
    expect(um.ok).toBe(true)
    expect(um.linhas_lidas).toBe(3)
    expect(um.linhas_brasil).toBe(2)
    expect(um.eventos_novos).toBe(2)
    expect(um.eventos_repetidos).toBe(0)
    expect(um.entidades_novas).toBe(2)          // BRAGOV e BRAENV, compartilhados pelos dois eventos
    expect(um.lugares_novos).toBe(4)            // dois pontos e duas UFs (SP e MG)
    expect(um.vinculos_novos).toBe(4)           // dois eventos × (ator + alvo)
    expect(um.mencoes_novas).toBe(2)            // a do Chile não entra: o evento dela não entrou
    expect(um.falhas).toEqual([])

    const dois = await (await chamar('cron-1', { ate: `${DIA}121500`, janela: 1, limite: 50 })).json()
    expect(dois.eventos_novos).toBe(0)
    expect(dois.eventos_repetidos).toBe(2)
    expect(dois.entidades_novas).toBe(0)
    expect(dois.lugares_novos).toBe(0)
    expect(dois.vinculos_novos).toBe(0)
    expect(dois.mencoes_novas).toBe(0)
    expect(dois.mencoes_repetidas).toBe(2)

    // E o banco ficou com uma cópia só de cada coisa.
    expect(bd.eventos).toHaveLength(4)        // 2 eventos + 2 menções
    expect(bd.entidades).toHaveLength(2)
    expect(bd.lugares).toHaveLength(4)
    expect(bd.vinculos).toHaveLength(4)
  })

  it('o limite trava a invocação: pede 1 e grava 1', async () => {
    const r = await (await chamar('cron-1', { ate: `${DIA}121500`, janela: 1, limite: 1 })).json()
    expect(r.eventos_novos).toBe(1)
    expect(bd.eventos.filter(e => e.tipo !== 'mencao_noticiosa')).toHaveLength(1)
  })

  it('registra o GDELT em fontes com a licença e uso_comercial true', async () => {
    await chamar('cron-1', { ate: `${DIA}121500` })
    const f = bd.fontes[0]!
    expect(f.codigo).toBe('gdelt')
    expect(f.uso_comercial).toBe(true)
    expect(String(f.licenca)).toContain('citação')
    expect(String(f.url)).toBe('https://www.gdeltproject.org')
  })

  it('arquivo que o GDELT não serve entra como falha, sem derrubar a coleta', async () => {
    fingirFetch(u => u.includes('lastupdate') ? new Response(`1 a ${BASE}/${DIA}121500.export.CSV.zip`) : new Response('sumiu', { status: 404 }))
    const r = await (await chamar('cron-1', { ate: `${DIA}121500` })).json()
    expect(r.ok).toBe(true)
    expect(r.eventos_novos).toBe(0)
    expect(r.falhas[0]).toContain('HTTP 404')
  })
})

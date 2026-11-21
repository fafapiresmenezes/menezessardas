// Passo C3: água da ANA. Nenhum teste aqui toca a rede: o fetch é substituído e o XML do SAR é
// montado em memória, no formato DataSet que o serviço .asmx devolve.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { camposHash as camposHashSrc, hashConteudo as hashSrc } from '../../../src/lib/predicao/ontologia'

fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k', VITEST: '1' })
const mod = await import('./index')

const dataSet = (linhas: Record<string, string>[]) =>
  `<?xml version="1.0"?><NewDataSet>${linhas.map(l =>
    `<Table>${Object.entries(l).map(([k, v]) => `<${k}>${v}</${k}>`).join('')}</Table>`).join('')}</NewDataSet>`

const RESERVATORIOS = dataSet([
  { codigoReservatorio: '17', Reservatorio: 'Furnas', Sistema: 'Grande', uf: 'MG', Latitude: '-20,6694', Longitude: '-46,3186' },
  { codigoReservatorio: '99', Reservatorio: 'Sem coordenada', Sistema: 'Teste', uf: 'SP' },
])
const MEDICOES = dataSet([
  { Data: '01/11/2026', Cota: '762,43', VolumeUtil: '41,2', Afluencia: '1.234,5', Defluencia: '980' },
  { Data: '02/11/2026', Cota: '762,51', VolumeUtil: '41,8', Afluencia: '1.301,0', Defluencia: '975' },
])

// Banco em memória com a MESMA unicidade do esquema do C1.
type Linha = Record<string, unknown>
const bd: { fontes: Linha[]; entidades: Linha[]; lugares: Linha[]; eventos: Linha[]; vinculos: Linha[] } =
  { fontes: [], entidades: [], lugares: [], eventos: [], vinculos: [] }
let seq = 0
function banco(): import('./index').Banco {
  return {
    async registrarFonte(l) {
      const i = bd.fontes.findIndex(f => f.codigo === l.codigo)
      if (i >= 0) bd.fontes[i] = { ...l }; else bd.fontes.push({ ...l })
    },
    async entidadesPorChave(chaves) {
      return bd.entidades.filter(e => chaves.includes(String(e.chave_natural)))
        .map(e => ({ id: String(e.id), chave_natural: String(e.chave_natural) }))
    },
    async inserirEntidades(ls) {
      const fora: { id: string; chave_natural: string }[] = []
      for (const l of ls) {
        if (bd.entidades.some(e => e.tipo === l.tipo && e.chave_natural === l.chave_natural)) continue
        const linha = { ...l, id: `e${++seq}` }
        bd.entidades.push(linha)
        fora.push({ id: String(linha.id), chave_natural: String(l.chave_natural) })
      }
      return fora
    },
    async porHash(tabela, hashes) {
      return bd[tabela].filter(l => hashes.includes(String(l.conteudo_hash)))
        .map(l => ({ id: String(l.id), conteudo_hash: String(l.conteudo_hash) }))
    },
    async inserirLugares(ls) {
      return ls.map(l => { const linha = { ...l, id: `l${++seq}` }; bd.lugares.push(linha); return { id: String(linha.id), conteudo_hash: String(l.conteudo_hash) } })
    },
    async inserirEventos(ls) {
      const fora: { id: string; conteudo_hash: string }[] = []
      for (const l of ls) {
        if (bd.eventos.some(e => e.fonte === l.fonte && e.conteudo_hash === l.conteudo_hash)) continue
        const linha = { ...l, id: `v${++seq}` }
        bd.eventos.push(linha)
        fora.push({ id: String(linha.id), conteudo_hash: String(l.conteudo_hash) })
      }
      return fora
    },
    async inserirVinculos(ls) {
      let n = 0
      for (const l of ls) {
        if (bd.vinculos.some(v => v.evento_id === l.evento_id && v.entidade_id === l.entidade_id && v.papel === l.papel)) continue
        bd.vinculos.push({ ...l }); n++
      }
      return n
    },
    async serie(codigo, subtipo) {
      const alvo = bd.entidades.find(e => e.chave_natural === codigo)
      const ids = new Set(bd.vinculos.filter(v => v.entidade_id === alvo?.id).map(v => v.evento_id))
      return bd.eventos.filter(e => ids.has(e.id) && e.subtipo === subtipo)
        .map(e => ({ ocorrido_em: String(e.ocorrido_em), observado_em: String(e.observado_em), valor: Number(e.valor), unidade: String(e.unidade) }))
    },
    async reservatorios() {
      return bd.entidades.map(e => ({ chave_natural: String(e.chave_natural), nome: String(e.nome), atributos: e.atributos as Record<string, unknown> }))
    },
    async fechar() { /* memória */ },
  }
}

const rede = () => fingirFetch((url) => {
  if (url.includes('ReservatoriosSIN')) return new Response(RESERVATORIOS, { headers: { 'Content-Type': 'text/xml' } })
  if (url.includes('DadosHistoricos')) return new Response(MEDICOES, { headers: { 'Content-Type': 'text/xml' } })
  return new Response('não esperado: ' + url, { status: 404 })
})

beforeEach(() => { bd.fontes = []; bd.entidades = []; bd.lugares = []; bd.eventos = []; bd.vinculos = []; seq = 0; rede() })

describe('leitura do XML do SAR', () => {
  it('lê o cadastro, com e sem coordenada, e a vírgula decimal brasileira', () => {
    const r = mod.lerReservatorios(RESERVATORIOS)
    expect(r.map(x => x.nome)).toEqual(['Furnas', 'Sem coordenada'])
    expect(r[0].latitude).toBeCloseTo(-20.6694, 4)
    expect(r[0].uf).toBe('MG')
    expect(r[1].latitude).toBeNull()
  })

  it('uma linha diária vira uma medição por grandeza, cada uma com a sua unidade', () => {
    const m = mod.lerMedicoes(MEDICOES)
    expect(m).toHaveLength(8)
    const primeiroDia = m.filter(x => x.ocorrido_em.startsWith('2026-11-01'))
    expect(primeiroDia.map(x => x.subtipo).sort()).toEqual(['afluencia', 'cota', 'defluencia', 'volume_util'])
    expect(primeiroDia.find(x => x.subtipo === 'cota')!.valor).toBeCloseTo(762.43, 2)
    expect(primeiroDia.find(x => x.subtipo === 'afluencia')!.valor).toBeCloseTo(1234.5, 1)
    expect(primeiroDia.find(x => x.subtipo === 'volume_util')!.unidade).toBe('%')
  })

  it('a data da medição é o dia no fuso de Brasília, e não a hora da coleta', () => {
    expect(mod.dia('01/11/2026')).toBe('2026-11-01T00:00:00-03:00')
    expect(mod.dia('2026-11-01T00:00:00')).toBe('2026-11-01T00:00:00-03:00')
    expect(mod.dia('')).toBeNull()
    expect(mod.ddmmaaaa('2026-11-01')).toBe('01/11/2026')
  })
})

describe('gravação na ontologia do C1', () => {
  const agora = '2026-11-13T18:00:00.000Z'

  it('grava reservatório, lugar, medição e vínculo, e a segunda passada não insere nada', async () => {
    const r1 = await mod.coletar(banco(), { de: '2026-11-01', ate: '2026-11-02', agora, limiteReservatorios: 10 })
    expect(r1.falhas).toEqual([])
    expect(r1.reservatorios_lidos).toBe(2)
    expect(r1.reservatorios_novos).toBe(2)
    expect(r1.medicoes_lidas).toBe(16)   // 2 reservatórios x 2 dias x 4 grandezas
    expect(r1.medicoes_novas).toBe(16)   // os dois leem o mesmo XML, mas o título e o lugar do evento
                                         // são de cada reservatório, então as 16 linhas são distintas
    expect(r1.lugares_novos).toBe(1)     // só Furnas tem coordenada
    expect(bd.fontes[0].codigo).toBe('ana_snirh')
    expect(bd.fontes[0].uso_comercial).toBe(true)

    const r2 = await mod.coletar(banco(), { de: '2026-11-01', ate: '2026-11-02', agora: '2026-11-14T18:00:00.000Z', limiteReservatorios: 10 })
    expect(r2.medicoes_novas).toBe(0)
    expect(r2.reservatorios_novos).toBe(0)
    expect(bd.eventos).toHaveLength(16)
  })

  it('ocorrido_em é o dia da ANA e observado_em é a hora da coleta: as duas não se misturam', async () => {
    await mod.coletar(banco(), { de: '2026-11-01', ate: '2026-11-02', agora, limiteReservatorios: 1 })
    const e = bd.eventos[0]
    expect(String(e.ocorrido_em)).toContain('2026-11-01')
    expect(String(e.observado_em)).toBe(agora)
    expect(new Date(String(e.observado_em)).getTime()).toBeGreaterThan(new Date(String(e.ocorrido_em)).getTime())
  })

  it('o hash é o mesmo que o da biblioteca do navegador: a ingestão não cria dialeto', async () => {
    await mod.coletar(banco(), { de: '2026-11-01', ate: '2026-11-01', agora, limiteReservatorios: 1 })
    const e = bd.eventos[0] as Record<string, unknown>
    const esperado = await hashSrc(camposHashSrc.evento({
      tipo: String(e.tipo), subtipo: String(e.subtipo), titulo: String(e.titulo),
      ocorrido_em: String(e.ocorrido_em), observado_em: String(e.observado_em),
      lugar_id: (e.lugar_id ?? null) as string | null,
      valor: Number(e.valor), unidade: String(e.unidade),
      bruto: e.bruto as Record<string, never>, fonte: String(e.fonte),
    }))
    expect(e.conteudo_hash).toBe(esperado)
  })
})

describe('a série que a tela plota', () => {
  it('um ponto por dia, com a medição mais recente, e conta as revisões da ANA', () => {
    const s = mod.serieDoDia([
      { ocorrido_em: '2026-11-01T00:00:00-03:00', observado_em: '2026-11-03T12:00:00-03:00', valor: 41.2, unidade: '%' },
      { ocorrido_em: '2026-11-01T00:00:00-03:00', observado_em: '2026-11-09T12:00:00-03:00', valor: 40.9, unidade: '%' },
      { ocorrido_em: '2026-11-02T00:00:00-03:00', observado_em: '2026-11-04T12:00:00-03:00', valor: 41.8, unidade: '%' },
    ])
    expect(s).toHaveLength(2)
    expect(s[0].valor).toBeCloseTo(40.9, 2)   // a revisão vence a primeira publicação
    expect(s[0].revisoes).toBe(1)
    expect(s[0].atraso_horas).toBe(8 * 24 + 12)
    expect(s[1].revisoes).toBe(0)
  })

  it('a série sai em ordem de dia, pronta para o gráfico', async () => {
    const db = banco()
    await mod.coletar(db, { de: '2026-11-01', ate: '2026-11-02', agora: '2026-11-13T18:00:00.000Z', limiteReservatorios: 1 })
    const s = mod.serieDoDia(await db.serie(mod.chaveReservatorio('17'), 'volume_util', '', ''))
    expect(s.map(p => p.dia)).toEqual(['2026-11-01', '2026-11-02'])
    expect(s[1].valor).toBeCloseTo(41.8, 2)
  })
})

describe('porta', () => {
  it('coletar sem o segredo devolve 401 e não grava', async () => {
    const r = await mod.atender(new Request('https://f/', { method: 'POST', body: JSON.stringify({ modo: 'coletar' }) }), async () => banco())
    expect(r.status).toBe(401)
    expect(bd.eventos).toHaveLength(0)
  })

  it('conferir só alcança as operações públicas do SAR', async () => {
    const r = await mod.atender(new Request('https://f/', { method: 'POST', body: JSON.stringify({ modo: 'conferir', op: 'DropTable' }) }), async () => banco())
    expect(r.status).toBe(400)
    const ok = await mod.atender(new Request('https://f/', { method: 'POST', body: JSON.stringify({ modo: 'conferir' }) }), async () => banco())
    expect(ok.status).toBe(200)
    expect((await ok.json()).tabelas).toBe(2)
  })

  it('a série é leitura aberta: não pede segredo', async () => {
    const db = banco()
    await mod.coletar(db, { de: '2026-11-01', ate: '2026-11-02', agora: '2026-11-13T18:00:00.000Z', limiteReservatorios: 1 })
    const r = await mod.atender(new Request('https://f/', { method: 'POST', body: JSON.stringify({ modo: 'serie', codigo: mod.chaveReservatorio('17'), subtipo: 'cota' }) }), async () => db)
    expect(r.status).toBe(200)
    const c = await r.json()
    expect(c.pontos).toBe(2)
    expect(c.unidade).toBe('m')
    expect(c.fonte.codigo).toBe('ana_snirh')
  })
})

// 19/11/2026: o ServiceANA.asmx passou a dar 404. O SAR novo (sar0/MedicaoSin) é HTML.
const PAGINA_SAR0 = (linhas: string[][]) => `<!doctype html><html><body>
<select id="dropDownListReservatorios" name="dropDownListReservatorios"><option value="">Selecione</option>
<option value="19058">ITAIPU                                            </option>
<option value="19015">A. VERMELHA                                       </option>
</select>
<table class="table"><thead><tr><th>C&#243;digo</th></tr></thead><tbody class="list">
${linhas.map(l => `<tr>
  <td class="text-center coluna_1">19058</td><td class="text-center coluna_2">ITAIPU      </td>
  <td class="text-center coluna_3">${l[0]}</td><td class="text-center coluna_4">${l[1]}</td>
  <td class="text-center coluna_5">${l[2]}</td><td class="text-center coluna_6">10361,00</td>
  <td class="text-center coluna_7">9349,00</td><td class="text-center coluna_8">18782,47</td>
  <td class="text-center coluna_9">${l[3]}</td><td class="text-center coluna_11">0,00</td>
  <td class="text-center coluna_13">${l[4]}</td></tr>`).join('')}
</tbody></table></body></html>`

describe('SAR novo (MedicaoSin, HTML)', () => {
  const html = PAGINA_SAR0([['219,95', '18304,10', '19710,00', '79,51', '16/11/2026'], ['220,04', '15278,48', '15122,00', '80,02', '17/11/2026']])

  it('lê o cadastro do select e as medições da tabela', () => {
    const r = mod.lerOpcoesSar0(html)
    expect(r.map(x => [x.codigo, x.nome])).toEqual([['19058', 'ITAIPU'], ['19015', 'A. VERMELHA']])
    const m = mod.lerMedicoesSar0(html)
    expect(m).toHaveLength(8)
    expect(m.find(x => x.subtipo === 'volume_util' && x.ocorrido_em.startsWith('2026-11-17'))?.valor).toBe(80.02)
    expect(m.find(x => x.subtipo === 'afluencia')?.valor).toBe(18304.1)
  })

  it('a coleta usa o SAR novo quando ele responde, sem tocar no ServiceANA', async () => {
    const f = fingirFetch((url) => {
      if (url.includes('sar0/MedicaoSin')) return new Response(html, { headers: { 'Content-Type': 'text/html' } })
      return new Response('não esperado', { status: 404 })
    })
    const r = await mod.coletar(banco(), { de: '2026-11-16', ate: '2026-11-17', agora: '2026-11-19T03:00:00.000Z', limiteReservatorios: 1 })
    expect(r.falhas).toEqual([])
    expect(r.via).toEqual(['cadastro:MedicaoSin', 'medicoes:MedicaoSin'])
    expect(r.medicoes_novas).toBe(8)
    expect(f.mock.calls.some(c => String(c[0]).includes('ServiceANA'))).toBe(false)
    expect(String(f.mock.calls[1][0])).toContain('dataInicial=16%2F11%2F2026')
  })
})

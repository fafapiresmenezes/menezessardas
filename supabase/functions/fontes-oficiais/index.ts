// Fontes oficiais, sem intermediário: o que o Escavador faz, buscado direto na origem por API pública.
// - DataJud (CNJ): capa, assuntos e TODAS as movimentações do processo, em todos os ramos que o CNJ publica
//   (Justiça Estadual, Federal, do Trabalho, Eleitoral, Militar e tribunais superiores STJ, TST, TSE e STM).
// - Comunica PJe / DJEN (CNJ): publicações e intimações com o texto integral, por nome da parte, nome do advogado,
//   OAB ou número do processo, em janelas de até 93 dias (o cliente percorre os anos em blocos).
// - Receita Federal via BrasilAPI: razão social, situação e sócios pelo CNPJ.
// - Querido Diário: diários oficiais municipais.
// Uso restrito à equipe autenticada (finalidade: exercício regular de direitos, LGPD art. 7º, VI).
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
// Chave pública do DataJud, publicada pelo CNJ na wiki da API.
const DATAJUD_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
const COMUNICA = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
const UF_TR = ['', 'ac', 'al', 'ap', 'am', 'ba', 'ce', 'dft', 'es', 'go', 'ma', 'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'se', 'sp', 'to']
const ESPERA = () => Number(Deno.env.get('FONTES_ESPERA_MS') ?? '700')
const limpa = (s: string) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim()
const dorme = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Índices do DataJud para o número CNJ (pode haver mais de um nome possível; tenta na ordem). */
export function indicesDataJud(numero: string): string[] {
  const d = numero.replace(/\D/g, '')
  if (d.length !== 20) return []
  const j = d[13], tr = Number(d.slice(14, 16))
  if (j === '3') return ['stj']
  if (j === '4') return tr >= 1 && tr <= 6 ? [`trf${tr}`] : []
  if (j === '5') return tr === 0 ? ['tst'] : tr <= 24 ? [`trt${tr}`] : []
  if (j === '6') return tr === 0 ? ['tse'] : UF_TR[tr] ? (tr === 7 ? ['tre-dft', 'tre-df'] : [`tre-${UF_TR[tr]}`]) : []
  if (j === '7') return ['stm']
  if (j === '8') return UF_TR[tr] ? [`tj${UF_TR[tr]}`] : []
  if (j === '9') return ({ 13: ['tjmmg'], 21: ['tjmrs'], 26: ['tjmsp'] } as Record<number, string[]>)[tr] ?? []
  return [] // STF (1) e CNJ (2) não estão no DataJud
}

async function buscar(url: string, init: RequestInit = {}, tentativas = 3): Promise<Response | null> {
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) }).catch(() => null)
    if (r && r.status !== 429 && r.status < 500) return r
    if (i < tentativas - 1) await dorme(ESPERA() * (i + 1))
    else return r
  }
  return null
}

async function datajud(numero: string) {
  const indices = indicesDataJud(numero)
  if (!indices.length) return { ok: false, erro: 'Este tribunal não está no DataJud (STF e CNJ não publicam lá) ou o número é inválido.' }
  for (const indice of indices) {
    const r = await buscar(`https://api-publica.datajud.cnj.jus.br/api_publica_${indice}/_search`, {
      method: 'POST', headers: { Authorization: DATAJUD_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ size: 10, query: { match: { numeroProcesso: numero.replace(/\D/g, '') } } }),
    })
    if (r?.status === 404) continue
    if (!r?.ok) return { ok: false, erro: `DataJud ${r?.status ?? 'sem resposta'}` }
    const hits = ((await r.json().catch(() => ({})))?.hits?.hits ?? []).map((h: any) => h._source).filter(Boolean)
    if (!hits.length) return { ok: true, encontrado: false, indice }
    // Um processo pode ter um registro por grau (1º grau, 2º grau, turma recursal): juntamos os andamentos de todos.
    const movs = new Map<string, { data: string; nome: string; grau: string; complemento?: string }>()
    for (const h of hits) for (const m of h.movimentos ?? []) {
      const comp = (m.complementosTabelados ?? []).map((c: any) => c.nome || c.descricao).filter(Boolean).join('; ')
      const chave = `${m.dataHora}|${m.codigo ?? m.nome}`
      if (!movs.has(chave)) movs.set(chave, { data: m.dataHora, nome: m.nome, grau: h.grau ?? '', complemento: comp || undefined })
    }
    const h0 = hits[0]
    return {
      ok: true, encontrado: true, indice, tribunal: h0.tribunal, classe: h0.classe?.nome, orgao: h0.orgaoJulgador?.nome,
      graus: [...new Set(hits.map((h: any) => h.grau).filter(Boolean))], sistema: h0.sistema?.nome, formato: h0.formato?.nome,
      ajuizamento: h0.dataAjuizamento, sigilo: h0.nivelSigilo ?? 0, ultimaAtualizacao: h0.dataHoraUltimaAtualizacao,
      assuntos: [...new Set(hits.flatMap((h: any) => (h.assuntos ?? []).map((a: any) => a.nome)).filter(Boolean))],
      movimentos: [...movs.values()].sort((a, b) => String(b.data).localeCompare(String(a.data))),
    }
  }
  return { ok: true, encontrado: false, indice: indices[0] }
}

type Filtro = { nomeParte?: string; nomeAdvogado?: string; numeroOab?: string; ufOab?: string; numeroProcesso?: string }
export function itemComunica(i: Record<string, any>) {
  const partes = (i.destinatarios ?? []).map((d: any) => ({ nome: String(d.nome ?? '').trim(), polo: d.polo ?? null })).filter((d: any) => d.nome)
  const advogados = (i.destinatarioadvogados ?? []).map((a: any) => a.advogado ?? a).map((a: any) => ({ nome: String(a.nome ?? '').trim(), oab: a.numero_oab ? `${a.numero_oab}/${a.uf_oab ?? ''}` : null })).filter((a: any) => a.nome)
  return {
    id: String(i.id ?? `${i.numero_processo}-${i.data_disponibilizacao}`), data: String(i.data_disponibilizacao ?? '').slice(0, 10),
    tribunal: i.siglaTribunal ?? null, orgao: i.nomeOrgao ?? null, tipo: i.tipoComunicacao ?? null, documento: i.tipoDocumento ?? null,
    classe: i.nomeClasse ?? null, numero: String(i.numeroprocessocommascara ?? i.numero_processo ?? ''), texto: limpa(String(i.texto ?? '')).slice(0, 20000),
    link: i.link ?? null, partes, advogados,
  }
}

async function comunica(f: Filtro, inicio?: string, fim?: string, maxPaginas = 5) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v)
  if (inicio && fim) { p.set('dataDisponibilizacaoInicio', inicio); p.set('dataDisponibilizacaoFim', fim) }
  p.set('itensPorPagina', '100')
  const itens: ReturnType<typeof itemComunica>[] = []
  let total = 0
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    p.set('pagina', String(pagina))
    const r = await buscar(`${COMUNICA}?${p}`)
    if (!r?.ok) return { ok: false, erro: `Comunica PJe ${r?.status ?? 'sem resposta'}`, itens, total }
    const d = await r.json().catch(() => ({ items: [] }))
    total = Number(d.count ?? total)
    const lote = (d.items ?? []) as Record<string, any>[]
    itens.push(...lote.map(itemComunica))
    if (lote.length < 100) break
    if (pagina < maxPaginas) await dorme(ESPERA())
  }
  return { ok: true, itens, total, incompleto: total > itens.length }
}

async function receita(cnpj: string) {
  const r = await buscar(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
  if (r?.status === 404) return { ok: true, encontrado: false }
  if (!r?.ok) return { ok: false, erro: `Receita (BrasilAPI) ${r?.status ?? 'sem resposta'}` }
  const d = await r.json()
  return { ok: true, encontrado: true, nome: d.razao_social as string, fantasia: d.nome_fantasia || null, situacao: d.descricao_situacao_cadastral, abertura: d.data_inicio_atividade,
    municipio: d.municipio, uf: d.uf, atividade: d.cnae_fiscal_descricao, socios: (d.qsa ?? []).map((s: any) => ({ nome: s.nome_socio, qualificacao: s.qualificacao_socio })) }
}

async function queridoDiario(termo: string) {
  const r = await buscar(`https://api.queridodiario.ok.org.br/gazettes?querystring=${encodeURIComponent(`"${termo}"`)}&size=20&excerpt_size=400&number_of_excerpts=2&sort_by=descending_date`, { headers: { 'User-Agent': 'Mozilla/5.0 (THEYE plataforma)' } }, 1)
  if (!r?.ok) return { ok: false, erro: `Querido Diário ${r?.status ?? 'sem resposta'}` }
  const d = await r.json().catch(() => ({ gazettes: [] }))
  return { ok: true, total: d.total_gazettes ?? 0, itens: (d.gazettes ?? []).map((g: any) => ({ data: g.date, municipio: `${g.territory_name}/${g.state_code}`, trecho: limpa(String((g.excerpts ?? []).join(' … '))), link: g.url })) }
}

const dataOk = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const dias = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const parte = (req.headers.get('authorization') ?? '').split('.')[1]
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    if (claims.role !== 'authenticated') throw 0
  } catch {
    return json({ erro: 'Entre na plataforma para consultar.' }, 401)
  }
  const corpo = await req.json().catch(() => ({}))
  const tipo = String(corpo.tipo ?? '')
  const termo = String(corpo.termo ?? '').trim()
  const { inicio, fim } = corpo
  if ((inicio || fim) && (!dataOk(inicio) || !dataOk(fim) || dias(inicio, fim) < 0 || dias(inicio, fim) > 93))
    return json({ erro: 'Período inválido: use datas AAAA-MM-DD com no máximo 93 dias entre elas.' }, 400)
  const agora = new Date().toISOString()

  if (tipo === 'processo') {
    const n = termo.replace(/\D/g, '')
    if (n.length !== 20) return json({ erro: 'O número do processo tem 20 dígitos.' }, 400)
    const [capa, pubs] = await Promise.all([datajud(n), comunica({ numeroProcesso: n }, undefined, undefined, 10)])
    return json({ tipo, datajud: capa, comunica: pubs, consultadoEm: agora })
  }
  if (tipo === 'oab') {
    const m = termo.replace(/[.\s]/g, '').match(/^(\d{1,7})\/([A-Za-z]{2})$/)
    if (!m) return json({ erro: 'Informe a OAB como 123456/RJ.' }, 400)
    if (!inicio) return json({ erro: 'Informe o período (inicio e fim).' }, 400)
    return json({ tipo, comunica: await comunica({ numeroOab: String(Number(m[1])), ufOab: m[2].toUpperCase() }, inicio, fim), consultadoEm: agora })
  }
  if (tipo === 'advogado' || tipo === 'nome') {
    if (termo.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 4) return json({ erro: 'Digite o nome com pelo menos 4 letras.' }, 400)
    if (!inicio) return json({ erro: 'Informe o período (inicio e fim).' }, 400)
    const filtro: Filtro = tipo === 'advogado' ? { nomeAdvogado: termo } : { nomeParte: termo }
    const [c, q] = await Promise.all([comunica(filtro, inicio, fim), corpo.diarios ? queridoDiario(termo) : Promise.resolve(null)])
    return json({ tipo, comunica: c, queridoDiario: q, consultadoEm: agora })
  }
  if (tipo === 'cnpj') {
    const n = termo.replace(/\D/g, '')
    if (n.length !== 14) return json({ erro: 'O CNPJ tem 14 dígitos.' }, 400)
    return json({ tipo, receita: await receita(n), consultadoEm: agora })
  }
  return json({ erro: 'Tipo de busca desconhecido. Use processo, nome, advogado, oab ou cnpj.' }, 400)
})

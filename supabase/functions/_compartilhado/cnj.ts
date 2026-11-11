// Acesso às bases nacionais do CNJ, compartilhado pelas Edge Functions (fontes-oficiais, prazos-automaticos).
// - DataJud: todos os processos do país (exceto STF), com capa e andamentos de todos os graus.
// - Comunica PJe / DJEN: todas as publicações e intimações, com texto integral, partes e advogados.
// Chave pública do DataJud, publicada pelo CNJ na wiki da API.
export const DATAJUD_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
export const COMUNICA = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
const UF_TR = ['', 'ac', 'al', 'ap', 'am', 'ba', 'ce', 'dft', 'es', 'go', 'ma', 'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'se', 'sp', 'to']
export const ESPERA = () => Number(Deno.env.get('FONTES_ESPERA_MS') ?? '700')
export const limpa = (s: string) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim()
export const dorme = (ms: number) => new Promise(r => setTimeout(r, ms))

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

export async function buscar(url: string, init: RequestInit = {}, tentativas = 3): Promise<Response | null> {
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) }).catch(() => null)
    if (r && r.status !== 429 && r.status < 500) return r
    if (i < tentativas - 1) await dorme(ESPERA() * (i + 1))
    else return r
  }
  return null
}

export async function datajud(numero: string) {
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

export type Filtro = { nomeParte?: string; nomeAdvogado?: string; numeroOab?: string; ufOab?: string; numeroProcesso?: string }
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

export async function comunica(f: Filtro, inicio?: string, fim?: string, maxPaginas = 5) {
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


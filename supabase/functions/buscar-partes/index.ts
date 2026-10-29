// Busca gratuita de processos e publicações, com as mesmas fontes públicas que o Escavador agrega:
// - Comunica PJe (CNJ): comunicações processuais por nome da parte (só responde a IP do Brasil; o Supabase é);
// - Querido Diário (Open Knowledge Brasil): diários oficiais municipais por termo;
// - DataJud (CNJ): capa e movimentos do processo pelo número CNJ.
// Uso restrito à equipe autenticada (finalidade: exercício regular de direitos, LGPD art. 7º, VI).
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const DATAJUD_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
const UF_TR = ['', 'ac', 'al', 'ap', 'am', 'ba', 'ce', 'dft', 'es', 'go', 'ma', 'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'se', 'sp', 'to']
const limpa = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

/** Número CNJ NNNNNNN-DD.AAAA.J.TR.OOOO → índice do DataJud (tjrj, trt1, trf2…). */
function tribunalDoNumero(n: string): string | null {
  const d = n.replace(/\D/g, '')
  if (d.length !== 20) return null
  const j = d[13], tr = Number(d.slice(14, 16))
  if (j === '8') return UF_TR[tr] ? `tj${UF_TR[tr]}` : null
  if (j === '5') return `trt${tr}`
  if (j === '4') return `trf${tr}`
  return null
}

async function comunica(nome: string) {
  const fim = new Date().toISOString().slice(0, 10)
  const inicio = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
  const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?nomeParte=${encodeURIComponent(nome)}&dataDisponibilizacaoInicio=${inicio}&dataDisponibilizacaoFim=${fim}&itensPorPagina=50&pagina=1`
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) }).catch(() => null)
  if (!r?.ok) return { ok: false, erro: `Comunica PJe ${r?.status ?? 'sem resposta'}` }
  const d = await r.json().catch(() => ({ items: [] }))
  const itens = (d.items ?? []).map((i: Record<string, any>) => ({
    data: i.data_disponibilizacao, tribunal: i.siglaTribunal, orgao: i.nomeOrgao, tipo: i.tipoComunicacao, classe: i.nomeClasse,
    numero: i.numeroprocessocommascara ?? i.numero_processo, trecho: limpa(String(i.texto ?? '')).slice(0, 400), link: i.link,
  }))
  return { ok: true, total: d.count ?? itens.length, itens }
}

async function queridoDiario(termo: string) {
  const url = `https://api.queridodiario.ok.org.br/gazettes?querystring=${encodeURIComponent(`"${termo}"`)}&size=10&excerpt_size=300&number_of_excerpts=1&sort_by=descending_date`
  const r = await fetch(url, { signal: AbortSignal.timeout(40000), headers: { 'User-Agent': 'Mozilla/5.0 (LSM plataforma)' } }).catch(() => null)
  if (!r?.ok) return { ok: false, erro: `Querido Diário ${r?.status ?? 'sem resposta'}` }
  const d = await r.json().catch(() => ({ gazettes: [] }))
  return { ok: true, total: d.total_gazettes ?? 0, itens: (d.gazettes ?? []).map((g: Record<string, any>) => ({
    data: g.date, municipio: `${g.territory_name}/${g.state_code}`, trecho: limpa(String(g.excerpts?.[0] ?? '')), link: g.url,
  })) }
}

async function datajud(numero: string) {
  const indice = tribunalDoNumero(numero)
  if (!indice) return { ok: false, erro: 'Número CNJ inválido ou tribunal não coberto.' }
  const r = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${indice}/_search`, {
    method: 'POST', headers: { Authorization: DATAJUD_KEY, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(40000),
    body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: numero.replace(/\D/g, '') } } }),
  }).catch(() => null)
  if (!r?.ok) return { ok: false, erro: `DataJud ${r?.status ?? 'sem resposta'}` }
  const h = (await r.json()).hits?.hits?.[0]?._source
  if (!h) return { ok: true, encontrado: false, tribunal: indice.toUpperCase() }
  const movs = (h.movimentos ?? []).sort((a: any, b: any) => String(b.dataHora).localeCompare(String(a.dataHora))).slice(0, 15)
  return { ok: true, encontrado: true, tribunal: h.tribunal, classe: h.classe?.nome, orgao: h.orgaoJulgador?.nome, ajuizamento: h.dataAjuizamento,
    assuntos: (h.assuntos ?? []).map((a: any) => a.nome).filter(Boolean), movimentos: movs.map((m: any) => ({ data: m.dataHora, nome: m.nome })) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  // A chave anon é pública: exige sessão de usuário (papel authenticated) no token.
  try {
    const parte = (req.headers.get('authorization') ?? '').split('.')[1]
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    if (JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))).role !== 'authenticated') throw 0
  } catch { return json({ erro: 'Entre na plataforma para consultar.' }, 401) }
  const { termo = '' } = await req.json().catch(() => ({}))
  const t = String(termo).trim()
  if (t.length < 4) return json({ erro: 'Digite um nome (mínimo 4 letras) ou o número do processo.' }, 400)
  const ehNumero = t.replace(/\D/g, '').length === 20
  if (ehNumero) return json({ tipo: 'numero', datajud: await datajud(t), consultadoEm: new Date().toISOString() })
  const [c, q] = await Promise.all([comunica(t), queridoDiario(t)])
  return json({ tipo: 'nome', comunica: c, queridoDiario: q, consultadoEm: new Date().toISOString() })
})

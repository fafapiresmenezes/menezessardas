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
import { buscar, datajud, comunica, limpa, type Filtro } from '../_compartilhado/cnj.ts'
export { indicesDataJud, itemComunica } from '../_compartilhado/cnj.ts'

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
    // Sem período, traz todas as publicações do número; com período (até 93 dias), só as da janela.
    const n = termo.replace(/\D/g, '')
    if (n.length !== 20) return json({ erro: 'O número do processo tem 20 dígitos.' }, 400)
    const [capa, pubs] = await Promise.all([datajud(n), comunica({ numeroProcesso: n }, inicio, fim, 10)])
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

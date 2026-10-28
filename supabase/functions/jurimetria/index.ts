// Jurimetria com dados PÚBLICOS do DataJud (CNJ): para um tipo de ação num tribunal,
// conta processos e resultados de sentença registrados e estima a chance de êxito.
// Sem IA: os números saem direto das agregações do CNJ.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const servico = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CACHE_HORAS = 24
const DATAJUD_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
const TRIBUNAIS: Record<string, string> = { tjrj: 'TJRJ', tjsp: 'TJSP', tjmg: 'TJMG', tjes: 'TJES', stj: 'STJ', trf2: 'TRF2' }
// Classes processuais (nome na Tabela Processual Unificada do CNJ).
const ACOES: Record<string, string> = {
  despejo: 'Despejo por Falta de Pagamento',
  despejo_cumulado: 'Despejo por Falta de Pagamento Cumulado Com Cobrança',
  despejo_comum: 'Despejo',
  renovatoria: 'Renovatória de Locação',
  revisional: 'Revisional de Aluguel',
  consignacao: 'Consignação em Pagamento',
  usucapiao: 'Usucapião',
  execucao: 'Execução de Título Extrajudicial',
}
const PROCEDENCIA = 219, IMPROCEDENCIA = 220, PARCIAL = 221, SEM_MERITO = 466, ACORDO = 385

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { tribunal = 'tjrj', acao = 'despejo', orgao = '' } = await req.json().catch(() => ({}))
  if (!TRIBUNAIS[tribunal]) return json({ erro: 'Tribunal ainda não coberto.' }, 400)
  const classe = ACOES[acao]
  if (!classe) return json({ erro: 'Tipo de ação ainda não coberto.' }, 400)

  // A consulta ao CNJ leva 30 s ou mais; o resultado fica guardado por 24 h.
  const chaveCache = `${tribunal}|${acao}|${String(orgao).trim().toLowerCase()}`
  const sb = servico()
  const { data: guardado } = await sb.from('jurimetria_cache').select('resultado,criado_em').eq('chave', chaveCache).maybeSingle()
  if (guardado && !('porAno' in (guardado.resultado ?? {})) && Date.now() - new Date(guardado.criado_em).getTime() < CACHE_HORAS * 3600000) return json({ ...guardado.resultado, doCache: true })

  const filtros: unknown[] = [{ match_phrase: { 'classe.nome': classe } }]
  if (String(orgao).trim()) filtros.push({ match_phrase: { 'orgaoJulgador.nome': String(orgao).trim() } })
  const r = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`, {
    method: 'POST',
    headers: { Authorization: DATAJUD_KEY, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      size: 0,
      track_total_hits: true,
      query: { bool: { filter: filtros } },
      aggs: {
        resultados: { terms: { field: 'movimentos.codigo', include: [PROCEDENCIA, IMPROCEDENCIA, PARCIAL, SEM_MERITO, ACORDO], size: 10 } },
      },
    }),
  }).catch(() => null)
  if (!r?.ok) console.error('jurimetria datajud', r?.status, r ? (await r.text()).slice(0, 300) : 'sem resposta')
  if (!r?.ok && guardado) {
    const { porAno: _descartado, ...anterior } = guardado.resultado ?? {}
    return json({ ...anterior, doCache: true, desatualizado: true, aviso: `CNJ fora do ar agora; mostrando a consulta de ${new Date(guardado.criado_em).toLocaleDateString('pt-BR')}.` })
  }
  if (!r?.ok) return json({ erro: 'O CNJ (DataJud) não respondeu agora. Tente novamente em instantes.' }, 502)
  const d = await r.json()
  const conta = (cod: number) => (d.aggregations?.resultados?.buckets ?? []).find((b: { key: number }) => b.key === cod)?.doc_count ?? 0
  const proc = conta(PROCEDENCIA), parc = conta(PARCIAL), improc = conta(IMPROCEDENCIA), sem = conta(SEM_MERITO), acordo = conta(ACORDO)
  const julgados = proc + parc + improc
  const encerrados = julgados + sem + acordo
  const resultado = {
    tribunal: TRIBUNAIS[tribunal],
    acao: classe,
    orgao: orgao || null,
    processos: d.hits?.total?.value ?? 0,
    resultados: { procedencia: proc, parcial: parc, improcedencia: improc, semMerito: sem, acordo },
    // Êxito do autor: procedência total + metade da parcial, sobre os julgados no mérito.
    chanceExito: julgados ? Math.round(((proc + parc / 2) / julgados) * 100) : null,
    taxaAcordo: encerrados ? Math.round((acordo / encerrados) * 100) : null,
    taxaSemMerito: encerrados ? Math.round((sem / encerrados) * 100) : null,
    amostra: julgados,
    confianca: julgados >= 200 ? 'alta' : julgados >= 30 ? 'media' : 'baixa',
    fonte: 'DataJud — API Pública do CNJ',
    consultadoEm: new Date().toISOString(),
  }
  await sb.from('jurimetria_cache').upsert({ chave: chaveCache, resultado, criado_em: new Date().toISOString() })
  return json(resultado)
})

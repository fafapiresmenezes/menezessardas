// Previsão de demanda por área do direito com dados PÚBLICOS do DataJud (CNJ): conta processos novos
// por ano (2019 até o último ano fechado) numa classe processual que representa a área, ajusta uma
// tendência linear e projeta 3 anos com margem de erro de 95%. Mede DEMANDA (processos novos), não lucro.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const servico = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const DATAJUD_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
const CACHE_DIAS = 7

// Área → tribunal e classe processual usada como termômetro (Tabela Processual Unificada do CNJ).
const AREAS: Record<string, { nome: string; tribunal: string; classes: string[] }> = {
  imobiliario: { nome: 'Imobiliário (despejos e renovatórias, TJRJ)', tribunal: 'tjrj', classes: ['Despejo por Falta de Pagamento', 'Despejo por Falta de Pagamento Cumulado Com Cobrança', 'Renovatória de Locação'] },
  civel: { nome: 'Cível (procedimento comum, TJRJ)', tribunal: 'tjrj', classes: ['Procedimento Comum Cível'] },
  trabalhista: { nome: 'Trabalhista (ações ordinárias, TRT-1)', tribunal: 'trt1', classes: ['Ação Trabalhista - Rito Ordinário', 'Ação Trabalhista - Rito Sumaríssimo'] },
  familia: { nome: 'Família (divórcios e alimentos, TJRJ)', tribunal: 'tjrj', classes: ['Divórcio Litigioso', 'Divórcio Consensual', 'Alimentos - Lei Especial Nº 5.478/68'] },
  tributario: { nome: 'Tributário (execuções fiscais, TJRJ)', tribunal: 'tjrj', classes: ['Execução Fiscal'] },
  empresarial: { nome: 'Empresarial (recuperações e falências, TJRJ)', tribunal: 'tjrj', classes: ['Recuperação Judicial', 'Falência de Empresários, Sociedades Empresáriais, Microempresas e Empresas de Pequeno Porte'] },
  consumidor: { nome: 'Consumidor (juizados cíveis, TJRJ)', tribunal: 'tjrj', classes: ['Procedimento do Juizado Especial Cível'] },
  previdenciario: { nome: 'Previdenciário (juizados federais, TRF-2)', tribunal: 'trf2', classes: ['Procedimento do Juizado Especial Cível'] },
  penal: { nome: 'Penal (ações penais, TJRJ)', tribunal: 'tjrj', classes: ['Ação Penal - Procedimento Ordinário'] },
  compliance: { nome: 'Compliance (improbidade, TJRJ)', tribunal: 'tjrj', classes: ['Ação Civil de Improbidade Administrativa'] },
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Mínimos quadrados: y = a + b·x; erro padrão da previsão em x0 para margem de 95%. */
function tendencia(pontos: { ano: number; n: number }[], anoAlvo: number) {
  const k = pontos.length
  const mx = pontos.reduce((s, p) => s + p.ano, 0) / k
  const my = pontos.reduce((s, p) => s + p.n, 0) / k
  const sxx = pontos.reduce((s, p) => s + (p.ano - mx) ** 2, 0)
  const b = pontos.reduce((s, p) => s + (p.ano - mx) * (p.n - my), 0) / sxx
  const a = my - b * mx
  const res = pontos.map(p => p.n - (a + b * p.ano))
  const sse = res.reduce((s, r) => s + r * r, 0)
  const sst = pontos.reduce((s, p) => s + (p.n - my) ** 2, 0)
  const se = Math.sqrt(sse / Math.max(1, k - 2))
  const t = k <= 4 ? 4.3 : k <= 6 ? 2.78 : 2.45 // t de Student aproximado, 95%
  const prev = a + b * anoAlvo
  const margem = t * se * Math.sqrt(1 + 1 / k + (anoAlvo - mx) ** 2 / sxx)
  return { prev: Math.max(0, Math.round(prev)), margem: Math.round(margem), r2: sst ? 1 - sse / sst : 0 }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { area = 'imobiliario' } = await req.json().catch(() => ({}))
  const cfg = AREAS[area]
  if (!cfg) return json({ erro: 'Área não coberta.' }, 400)
  const sb = servico()
  const chave = `mercado2|${area}`
  const { data: guardado } = await sb.from('jurimetria_cache').select('resultado,criado_em').eq('chave', chave).maybeSingle()
  if (guardado?.resultado?.previsao && Date.now() - new Date(guardado.criado_em).getTime() < CACHE_DIAS * 86400000) return json({ ...guardado.resultado, doCache: true })

  const ultimoAno = new Date().getUTCFullYear() - 1
  const r = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${cfg.tribunal}/_search`, {
    method: 'POST',
    headers: { Authorization: DATAJUD_KEY, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(140000),
    body: JSON.stringify({
      size: 0,
      query: { bool: {
        filter: [{ range: { dataAjuizamento: { gte: '2019-01-01', lte: `${ultimoAno}-12-31` } } }],
        should: cfg.classes.map(c => ({ match_phrase: { 'classe.nome': c } })), minimum_should_match: 1,
      } },
      aggs: { ano: { date_histogram: { field: 'dataAjuizamento', calendar_interval: 'year', format: 'yyyy' } } },
    }),
  }).catch(() => null)
  if (!r?.ok) {
    console.error('mercado datajud', r?.status, r ? (await r.text()).slice(0, 300) : 'sem resposta')
    if (guardado) return json({ ...guardado.resultado, doCache: true, desatualizado: true })
    return json({ erro: 'O CNJ (DataJud) não respondeu agora. Tente novamente em instantes.' }, 502)
  }
  const d = await r.json()
  const brutos: { ano: number; n: number }[] = (d.aggregations?.ano?.buckets ?? [])
    .map((b: { key_as_string: string; doc_count: number }) => ({ ano: Number(b.key_as_string), n: b.doc_count }))
    .filter((p: { ano: number }) => p.ano >= 2019 && p.ano <= ultimoAno)
  // Tribunais demoram a enviar dados ao CNJ: anos finais com menos de 40% da mediana estão incompletos
  // e distorceriam a tendência; ficam fora do cálculo (e são informados).
  const ord = brutos.map(p => p.n).sort((a, b) => a - b)
  const mediana = ord.length ? ord[Math.floor(ord.length / 2)] : 0
  const pontos = [...brutos]
  const incompletos: number[] = []
  while (pontos.length > 3 && pontos[pontos.length - 1].n < 0.4 * mediana) incompletos.unshift(pontos.pop()!.ano)
  const total = pontos.reduce((s: number, p: { n: number }) => s + p.n, 0)
  const resultado: Record<string, unknown> = { area, nome: cfg.nome, porAno: pontos, anosIncompletos: incompletos, amostra: total, fonte: `DataJud — API Pública do CNJ (${cfg.tribunal.toUpperCase()})`, consultadoEm: new Date().toISOString() }
  if (pontos.length >= 3) {
    const alvo = ultimoAno + 3
    const t = tendencia(pontos, alvo)
    // Variação contra o valor da própria tendência no último ano usado (menos sensível a um ano atípico).
    const ultimo = pontos[pontos.length - 1].ano
    const base = tendencia(pontos, ultimo).prev
    resultado.previsao = { ano: alvo, processos: t.prev, margem: t.margem, variacao: base ? Math.round(((t.prev - base) / base) * 100) : null, r2: Math.round(t.r2 * 100) / 100 }
    resultado.confianca = total < 300 ? 'baixa' : t.r2 >= 0.7 ? 'alta' : t.r2 >= 0.4 ? 'media' : 'baixa'
  } else resultado.confianca = 'insuficiente'
  // Resultado vazio (CNJ sobrecarregado ou classe sem registros) não vai para o cache: tenta de novo na próxima visita.
  if (pontos.length >= 3) await sb.from('jurimetria_cache').upsert({ chave, resultado, criado_em: new Date().toISOString() })
  return json(resultado)
})

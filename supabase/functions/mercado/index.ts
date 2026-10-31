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
  trabalhista: { nome: 'Trabalhista (ações ordinárias, TRT-1)', tribunal: 'trt1', classes: ['Ação Trabalhista - Rito Ordinário', 'Ação Trabalhista - Rito Sumaríssimo'], codigos: [985, 1125] },
  familia: { nome: 'Família (divórcios e alimentos, TJRJ)', tribunal: 'tjrj', classes: ['Divórcio Litigioso', 'Divórcio Consensual', 'Alimentos - Lei Especial Nº 5.478/68'] },
  tributario: { nome: 'Tributário (execuções fiscais, TJRJ)', tribunal: 'tjrj', classes: ['Execução Fiscal'] },
  empresarial: { nome: 'Empresarial (recuperações e falências, TJRJ)', tribunal: 'tjrj', classes: ['Recuperação Judicial', 'Falência de Empresários, Sociedades Empresáriais, Microempresas e Empresas de Pequeno Porte'] },
  consumidor: { nome: 'Consumidor (juizados cíveis, TJRJ)', tribunal: 'tjrj', classes: ['Procedimento do Juizado Especial Cível'] },
  previdenciario: { nome: 'Previdenciário (juizados federais, TRF-2)', tribunal: 'trf2', classes: ['Procedimento do Juizado Especial Cível'] },
  penal: { nome: 'Penal (ações penais, TJRJ)', tribunal: 'tjrj', classes: ['Ação Penal - Procedimento Ordinário'] },
  compliance: { nome: 'Compliance (improbidade, TJRJ)', tribunal: 'tjrj', classes: ['Ação Civil de Improbidade Administrativa'] },
}


// Segunda fonte (Passo 01 do plano ferramenta por ferramenta): Justiça em Números 2026, base de dados aberta do CNJ
// (arquivo JN_23-Jun-2026.csv, publicado em 30/06/2026). Casos novos por ano e tribunal, já consolidados pelo CNJ,
// sem o problema de envio incompleto do DataJud. Índices: 0 conhecimento 1º grau não criminal; 1 juizados especiais
// não criminais; 2 conhecimento 1º grau criminal; 3 execução fiscal; 4 execução de título extrajudicial.
const JEN: Record<string, Record<string, number[]>> = {"TJRJ":{"2017":[470930,588599,90360,459334,30346],"2018":[468233,540554,105847,355531,25954],"2019":[483473,560827,102826,439548,24854],"2020":[365484,401295,98559,327841,23034],"2021":[474969,431719,114665,443857,27456],"2022":[572305,450826,123020,468574,32550],"2023":[591549,463995,137881,387893,34272],"2024":[615328,499205,151470,347254,32506],"2025":[607367,470320,141510,232801,30226]},"TRF2":{"2017":[43673,136464,10107,100319,7928],"2018":[45987,137483,14856,31554,18159],"2019":[64544,165780,11967,28322,7014],"2020":[43688,134893,1904,30113,4438],"2021":[55969,269958,2036,29394,4633],"2022":[55018,175016,1989,29716,6324],"2023":[62393,256440,2391,38468,6346],"2024":[53971,197122,2290,28310,8370],"2025":[59555,220338,2435,38529,7289]},"TRT1":{"2017":[276537,0,0,740,348],"2018":[178901,0,0,618,451],"2019":[177347,0,0,80,474],"2020":[134661,0,0,59,183],"2021":[141684,0,0,187,144],"2022":[143512,0,0,36,139],"2023":[160037,0,0,23,127],"2024":[190617,0,0,20,151],"2025":[216901,0,0,140,297]}}
const JEN_FONTE = 'Justiça em Números 2026 (CNJ), base de dados aberta de 23/06/2026'
const JEN_POR_AREA: Record<string, { trib: string; i: number; indicador: string }> = {
  imobiliario: { trib: 'TJRJ', i: 0, indicador: 'casos novos de conhecimento não criminais, 1º grau' },
  civel: { trib: 'TJRJ', i: 0, indicador: 'casos novos de conhecimento não criminais, 1º grau' },
  familia: { trib: 'TJRJ', i: 0, indicador: 'casos novos de conhecimento não criminais, 1º grau' },
  empresarial: { trib: 'TJRJ', i: 0, indicador: 'casos novos de conhecimento não criminais, 1º grau' },
  compliance: { trib: 'TJRJ', i: 0, indicador: 'casos novos de conhecimento não criminais, 1º grau' },
  consumidor: { trib: 'TJRJ', i: 1, indicador: 'casos novos nos juizados especiais cíveis' },
  penal: { trib: 'TJRJ', i: 2, indicador: 'casos novos de conhecimento criminais, 1º grau' },
  tributario: { trib: 'TJRJ', i: 3, indicador: 'casos novos de execução fiscal, 1º grau' },
  trabalhista: { trib: 'TRT1', i: 0, indicador: 'casos novos de conhecimento, 1º grau' },
  previdenciario: { trib: 'TRF2', i: 1, indicador: 'casos novos nos juizados especiais federais' },
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
  const chave = `mercado4|${area}`
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
        should: [...cfg.classes.map((c: string) => ({ match_phrase: { 'classe.nome': c } })), ...((cfg as { codigos?: number[] }).codigos ?? []).map(c => ({ term: { 'classe.codigo': c } }))], minimum_should_match: 1,
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
    // Poucos anos ou margem maior que metade da previsão = baixa, mesmo com R² alto.
    resultado.confianca = total < 300 || pontos.length < 5 || t.margem > 0.5 * t.prev ? 'baixa' : t.r2 >= 0.7 ? 'alta' : t.r2 >= 0.4 ? 'media' : 'baixa'
  } else resultado.confianca = 'insuficiente'
  // Segunda fonte: série consolidada do Justiça em Números para o mesmo tribunal; tendência com o mesmo método.
  const jcfg = JEN_POR_AREA[area]
  if (jcfg && JEN[jcfg.trib]) {
    const serie = Object.entries(JEN[jcfg.trib]).map(([ano, v]) => ({ ano: Number(ano), n: v[jcfg.i] })).filter(p => p.ano >= 2019 && p.n > 0)
    if (serie.length >= 4) {
      const alvo = ultimoAno + 3
      const t = tendencia(serie, alvo)
      const base = tendencia(serie, serie[serie.length - 1].ano).prev
      const variacao = base ? Math.round(((t.prev - base) / base) * 100) : null
      const conf = t.margem > 0.5 * t.prev ? 'baixa' : t.r2 >= 0.7 ? 'alta' : t.r2 >= 0.4 ? 'media' : 'baixa'
      const v1 = (resultado.previsao as { variacao: number | null } | undefined)?.variacao ?? null
      const concordam = v1 !== null && variacao !== null && Math.sign(v1) === Math.sign(variacao)
      resultado.jen = { fonte: JEN_FONTE, tribunal: jcfg.trib, indicador: jcfg.indicador, porAno: serie, previsao: { ano: alvo, processos: Math.round(t.prev), margem: Math.round(t.margem), variacao, r2: Math.round(t.r2 * 100) / 100 }, confianca: conf, concordam }
      // Duas fontes apontando a mesma direção elevam a confiança combinada; fontes divergentes a rebaixam.
      resultado.confiancaCombinada = concordam ? (conf === 'alta' || resultado.confianca === 'alta' ? 'alta' : 'media') : v1 === null ? conf : 'baixa'
    }
  }
  // Passo 67: DataJud sem registros para a classe (caso do TRT-1): a previsão principal passa a ser a do Justiça em Números, com a fonte dita.
  if (!resultado.previsao && resultado.jen) {
    const j = resultado.jen as { previsao: unknown; confianca: string; fonte: string; tribunal: string }
    resultado.previsao = j.previsao; resultado.confiancaCombinada = j.confianca; resultado.fontePrevisao = `${j.fonte} (${j.tribunal})`
  }
  // Resultado vazio (CNJ sobrecarregado ou classe sem registros) não vai para o cache: tenta de novo na próxima visita.
  if (resultado.previsao) await sb.from('jurimetria_cache').upsert({ chave, resultado, criado_em: new Date().toISOString() })
  return json(resultado)
})

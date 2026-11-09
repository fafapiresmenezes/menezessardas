/**
 * Frente 1.6 · passo A08 · Justiça em Números 2026 (CNJ), base de dados aberta de 23/06/2026
 * (arquivo JN_23-Jun-2026.csv). Mesma tabela da função "mercado" (um teste confere que as duas
 * são iguais). Dado público e agregado por tribunal, sem pessoa identificável (LGPD).
 * Índices: 0 conhecimento 1º grau não criminal (TRT: conhecimento 1º grau); 1 juizados especiais
 * não criminais; 2 conhecimento 1º grau criminal; 3 execução fiscal; 4 execução de título extrajudicial.
 */
export const JEN: Record<string, Record<string, number[]>> = {"TJRJ":{"2017":[470930,588599,90360,459334,30346],"2018":[468233,540554,105847,355531,25954],"2019":[483473,560827,102826,439548,24854],"2020":[365484,401295,98559,327841,23034],"2021":[474969,431719,114665,443857,27456],"2022":[572305,450826,123020,468574,32550],"2023":[591549,463995,137881,387893,34272],"2024":[615328,499205,151470,347254,32506],"2025":[607367,470320,141510,232801,30226]},"TRF2":{"2017":[43673,136464,10107,100319,7928],"2018":[45987,137483,14856,31554,18159],"2019":[64544,165780,11967,28322,7014],"2020":[43688,134893,1904,30113,4438],"2021":[55969,269958,2036,29394,4633],"2022":[55018,175016,1989,29716,6324],"2023":[62393,256440,2391,38468,6346],"2024":[53971,197122,2290,28310,8370],"2025":[59555,220338,2435,38529,7289]},"TRT1":{"2017":[276537,0,0,740,348],"2018":[178901,0,0,618,451],"2019":[177347,0,0,80,474],"2020":[134661,0,0,59,183],"2021":[141684,0,0,187,144],"2022":[143512,0,0,36,139],"2023":[160037,0,0,23,127],"2024":[190617,0,0,20,151],"2025":[216901,0,0,140,297]}}
export const JEN_FONTE = 'Justiça em Números 2026 (CNJ), base de dados aberta de 23/06/2026'

export type Ponto = { ano: number; n: number }
export type Previsao = { ano: number; processos: number; margem: number; variacao: number | null; r2: number }

/** Mínimos quadrados y = a + b·x, com intervalo de previsão de 95% (t de Student). Igual ao da função "mercado". */
export function tendencia(pontos: Ponto[], anoAlvo: number) {
  const k = pontos.length
  const mx = pontos.reduce((s, p) => s + p.ano, 0) / k
  const my = pontos.reduce((s, p) => s + p.n, 0) / k
  const sxx = pontos.reduce((s, p) => s + (p.ano - mx) ** 2, 0)
  const b = pontos.reduce((s, p) => s + (p.ano - mx) * (p.n - my), 0) / sxx
  const a = my - b * mx
  const sse = pontos.reduce((s, p) => s + (p.n - (a + b * p.ano)) ** 2, 0)
  const sst = pontos.reduce((s, p) => s + (p.n - my) ** 2, 0)
  const se = Math.sqrt(sse / Math.max(1, k - 2))
  const t = k <= 4 ? 4.3 : k <= 6 ? 2.78 : 2.45
  const prev = a + b * anoAlvo
  const margem = t * se * Math.sqrt(1 + 1 / k + (anoAlvo - mx) ** 2 / sxx)
  return { prev: Math.max(0, Math.round(prev)), margem: Math.round(margem), r2: sst ? 1 - sse / sst : 0 }
}

export const confiancaDe = (t: { prev: number; margem: number; r2: number }): 'alta' | 'media' | 'baixa' =>
  t.margem > 0.5 * t.prev ? 'baixa' : t.r2 >= 0.7 ? 'alta' : t.r2 >= 0.4 ? 'media' : 'baixa'

/** Série de um indicador a partir de 2019 (2017–2018 antecedem a reforma trabalhista e a mudança de base). */
export const serieJen = (trib: string, i: number): Ponto[] =>
  Object.entries(JEN[trib] ?? {}).map(([ano, v]) => ({ ano: Number(ano), n: v[i] })).filter(p => p.ano >= 2019 && p.n > 0)

export function previsaoJen(trib: string, i: number, horizonte = 3): (Previsao & { confianca: 'alta' | 'media' | 'baixa'; ultimo: Ponto; serie: Ponto[] }) | null {
  const serie = serieJen(trib, i)
  if (serie.length < 4) return null
  const ultimo = serie[serie.length - 1]
  const alvo = ultimo.ano + horizonte
  const t = tendencia(serie, alvo)
  const base = tendencia(serie, ultimo.ano).prev
  return { ano: alvo, processos: t.prev, margem: t.margem, variacao: base ? Math.round(((t.prev - base) / base) * 100) : null, r2: Math.round(t.r2 * 100) / 100, confianca: confiancaDe(t), ultimo, serie }
}

export const AREA_JEN: Record<string, { nome: string; trib: string; i: number; indicador: string }> = {
  imobiliario: { nome: 'Imobiliário (TJRJ, cível de 1º grau)', trib: 'TJRJ', i: 0, indicador: 'casos novos de conhecimento não criminais, 1º grau' },
  civel: { nome: 'Cível (TJRJ, cível de 1º grau)', trib: 'TJRJ', i: 0, indicador: 'casos novos de conhecimento não criminais, 1º grau' },
  trabalhista: { nome: 'Trabalhista (TRT-1)', trib: 'TRT1', i: 0, indicador: 'casos novos de conhecimento, 1º grau' },
  familia: { nome: 'Família (TJRJ, cível de 1º grau)', trib: 'TJRJ', i: 0, indicador: 'casos novos de conhecimento não criminais, 1º grau' },
  tributario: { nome: 'Tributário (TJRJ, execuções fiscais)', trib: 'TJRJ', i: 3, indicador: 'casos novos de execução fiscal, 1º grau' },
  empresarial: { nome: 'Empresarial (TJRJ, cível de 1º grau)', trib: 'TJRJ', i: 0, indicador: 'casos novos de conhecimento não criminais, 1º grau' },
  consumidor: { nome: 'Consumidor (TJRJ, juizados cíveis)', trib: 'TJRJ', i: 1, indicador: 'casos novos nos juizados especiais cíveis' },
  previdenciario: { nome: 'Previdenciário (TRF-2, juizados federais)', trib: 'TRF2', i: 1, indicador: 'casos novos nos juizados especiais federais' },
  penal: { nome: 'Penal (TJRJ, criminal de 1º grau)', trib: 'TJRJ', i: 2, indicador: 'casos novos de conhecimento criminais, 1º grau' },
  compliance: { nome: 'Compliance (TJRJ, cível de 1º grau)', trib: 'TJRJ', i: 0, indicador: 'casos novos de conhecimento não criminais, 1º grau' },
}

/** Painel "por tribunal": um indicador por linha, com faixa provável de 95%. */
export const INDICADORES_TRIBUNAL: { trib: string; rotulo: string; i: number; indicador: string }[] = [
  { trib: 'TJRJ', rotulo: 'TJRJ', i: 0, indicador: 'Cível, 1º grau' },
  { trib: 'TJRJ', rotulo: 'TJRJ', i: 1, indicador: 'Juizados especiais cíveis' },
  { trib: 'TJRJ', rotulo: 'TJRJ', i: 2, indicador: 'Criminal, 1º grau' },
  { trib: 'TJRJ', rotulo: 'TJRJ', i: 3, indicador: 'Execução fiscal' },
  { trib: 'TJRJ', rotulo: 'TJRJ', i: 4, indicador: 'Execução de título extrajudicial' },
  { trib: 'TRT1', rotulo: 'TRT-1', i: 0, indicador: 'Trabalhista, 1º grau' },
  { trib: 'TRF2', rotulo: 'TRF-2', i: 0, indicador: 'Federal, 1º grau' },
  { trib: 'TRF2', rotulo: 'TRF-2', i: 1, indicador: 'Juizados especiais federais' },
  { trib: 'TRF2', rotulo: 'TRF-2', i: 3, indicador: 'Execução fiscal federal' },
]

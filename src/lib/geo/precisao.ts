// R10 (dimensão 8 da régua): medir o erro REAL de posição contra um ponto de referência.
//
// O que o app já mostrava era o `accuracy` que o aparelho declara — e ninguém sabia se aquele
// número é honesto. Aqui estão as contas que respondem isso, puras: entram leituras e um ponto
// de referência, saem erro mediano, percentil 90 e a COBERTURA da margem declarada.
//
// A margem que um aparelho declara é, por definição do padrão da web (Geolocation API) e do
// Android (Location.getAccuracy), o raio de **68% de confiança**. Então o esperado NÃO é que ela
// cubra 100% das leituras: é que cubra cerca de 68%. Cobertura muito abaixo disso significa
// aparelho otimista (diz errar menos do que erra); muito acima, aparelho pessimista.
// Referência: W3C Geolocation API, coordinates.accuracy; Android Location#getAccuracy.
import { distancia } from './calculo'

export const COBERTURA_ESPERADA = 0.68

export interface Referencia {
  lat: number
  lon: number
  /** De onde veio a coordenada (marco do IBGE, estação da RBMC, medição própria). Sem fonte, não é referência. */
  fonte: string
}

export interface Leitura {
  t: number
  lat: number
  lon: number
  /** a margem de erro em metros que o aparelho declarou para esta leitura */
  precisao: number
}

export interface Erro {
  t: number
  /** distância real, em metros, entre a leitura e o ponto de referência */
  metros: number
  /** a margem declarada pelo aparelho nesta leitura */
  declarada: number
  /** a margem declarada cobriu o erro real? */
  coberta: boolean
}

export interface Resultado {
  n: number
  mediana: number
  p90: number
  pior: number
  media: number
  /** fração de leituras (0 a 1) em que a margem declarada cobriu o erro real */
  cobertura: number
  /** mediana da margem que o aparelho declarou, para comparar com a mediana do erro real */
  declaradaMediana: number
  /** o aparelho declara margem menor do que o erro que comete? */
  otimista: boolean
}

/** Percentil pelo método do menor índice que alcança a fração (sem interpolar: não inventa valor que não foi medido). */
export function percentil(valores: number[], fracao: number): number {
  if (valores.length === 0) return Number.NaN
  const ord = [...valores].sort((a, b) => a - b)
  const i = Math.min(ord.length - 1, Math.max(0, Math.ceil(fracao * ord.length) - 1))
  return ord[i]
}

export function mediana(valores: number[]): number {
  if (valores.length === 0) return Number.NaN
  const ord = [...valores].sort((a, b) => a - b)
  const m = Math.floor(ord.length / 2)
  return ord.length % 2 ? ord[m] : (ord[m - 1] + ord[m]) / 2
}

/** Distância real de cada leitura ao ponto de referência, e se a margem declarada a cobriu. */
export function errosContra(leituras: Leitura[], ref: Referencia): Erro[] {
  return leituras.map(l => {
    const metros = distancia({ lat: l.lat, lon: l.lon }, { lat: ref.lat, lon: ref.lon })
    return { t: l.t, metros, declarada: l.precisao, coberta: metros <= l.precisao }
  })
}

export function resumir(erros: Erro[]): Resultado | null {
  if (erros.length === 0) return null
  const m = erros.map(e => e.metros)
  const med = mediana(m)
  const decMed = mediana(erros.map(e => e.declarada))
  return {
    n: erros.length,
    mediana: med,
    p90: percentil(m, 0.9),
    pior: Math.max(...m),
    media: m.reduce((s, x) => s + x, 0) / m.length,
    cobertura: erros.filter(e => e.coberta).length / erros.length,
    declaradaMediana: decMed,
    otimista: decMed < med,
  }
}

/**
 * Separa as leituras por FAIXA da margem declarada. Isto é um indício do tipo de posicionamento
 * (satélite costuma declarar pouco; rede de Wi-Fi e antena costumam declarar muito), mas NÃO é o
 * tipo de fix: nem o navegador nem o plugin dizem qual foi. Por isso o nome é "faixa", e a tela
 * escreve que é um indício, não a fonte do sinal.
 */
export const FAIXAS: { id: string; nome: string; ate: number }[] = [
  { id: 'fina', nome: 'margem declarada até 10 m', ate: 10 },
  { id: 'media', nome: 'de 10 a 30 m', ate: 30 },
  { id: 'grossa', nome: 'acima de 30 m', ate: Infinity },
]

export function porFaixa(erros: Erro[]): { faixa: string; nome: string; resultado: Resultado }[] {
  const saida: { faixa: string; nome: string; resultado: Resultado }[] = []
  let piso = 0
  for (const f of FAIXAS) {
    const dentro = erros.filter(e => e.declarada > piso && e.declarada <= f.ate)
    piso = f.ate
    const r = resumir(dentro)
    if (r) saida.push({ faixa: f.id, nome: f.nome, resultado: r })
  }
  return saida
}

/**
 * A nota da dimensão 8 da régua, pelo critério escrito no R1: "erro mediano ≤10 m; margem sempre
 * à vista". A margem já está à vista desde o começo, então o que resta é o erro mediano — e a
 * honestidade da margem declarada entra como condição: um aparelho que erra pouco mas mente sobre
 * o quanto erra não merece 10.
 */
export function notaDaPrecisao(r: Resultado | null): number | null {
  if (!r || r.n < 30) return null // menos de 30 leituras não é medição, é palpite
  let nota = r.mediana <= 10 ? 10 : r.mediana <= 20 ? 8 : r.mediana <= 50 ? 6 : r.mediana <= 100 ? 4 : 2
  // Margem otimista por mais de uma vez e meia é desconto: o número mostrado na tela engana.
  if (r.declaradaMediana > 0 && r.mediana > r.declaradaMediana * 1.5) nota = Math.max(2, nota - 2)
  return nota
}

/** O texto do método, para qualquer pessoa repetir a medição. Fica junto do resultado, não num arquivo à parte. */
export const PROTOCOLO = [
  'Escolha um ponto de coordenada conhecida e anote de onde veio o número: um marco geodésico do Banco de Dados Geodésicos do IBGE, uma estação da RBMC, ou um ponto que você mesmo mediu com equipamento de boa qualidade. Sem fonte, não é referência.',
  'Fique PARADO em cima do ponto, com o celular na mão, à altura do peito e sob céu aberto.',
  'Ligue a medição e espere pelo menos 5 minutos. Menos de 30 leituras não conta: o app recusa fechar a conta.',
  'Não ande, não entre em prédio e não guarde o celular no bolso durante a medição: isso mede outra coisa.',
  'Repita em outro dia e em outro horário. O erro do GPS muda com a posição dos satélites no céu.',
  'Para comparar sinal de satélite com sinal de rede, repita uma vez com o Wi-Fi desligado e uma vez com ele ligado.',
]

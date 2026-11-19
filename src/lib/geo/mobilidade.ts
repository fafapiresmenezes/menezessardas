// Ciência da mobilidade humana (elo R4 do trilho do geomapeamento).
// Métricas do movimento do PRÓPRIO titular, calculadas aqui no aparelho a partir dos
// pontos do cofre: nada sai, nada vai para servidor. Cada número tem a fonte ao lado —
// é a regra da casa (dim. 10 da régua: nenhum número sem fonte).
//
// Fórmulas conferidas contra a biblioteca scikit-mobility (Pappalardo et al., JSS 2022),
// reescritas em TypeScript.
import { distancia, type Lugar, type Ponto } from './calculo'

export interface Fonte { autores: string; titulo: string; onde: string; url: string }

export const FONTES: Record<'giracao' | 'entropia' | 'explorador', Fonte> = {
  giracao: {
    autores: 'González, Hidalgo & Barabási',
    titulo: 'Understanding individual human mobility patterns',
    onde: 'Nature, 2008',
    url: 'https://doi.org/10.1038/nature06958',
  },
  entropia: {
    autores: 'Song, Qu, Blumm & Barabási',
    titulo: 'Limits of Predictability in Human Mobility',
    onde: 'Science, 2010',
    url: 'https://doi.org/10.1126/science.1177170',
  },
  explorador: {
    autores: 'Pappalardo, Simini, Rinzivillo, Pedreschi, Giannotti & Barabási',
    titulo: 'Returners and explorers dichotomy in human mobility',
    onde: 'Nature Communications, 2015',
    url: 'https://doi.org/10.1038/ncomms9166',
  },
}

/** O teto que Song et al. (2010) mediram: ~93% é o máximo que qualquer método alcança. */
export const TETO_PREVISIBILIDADE = 0.93

type Coord = { lat: number; lon: number }

export function centroDeMassa(ps: Coord[], pesos?: number[]): Coord {
  let sl = 0, so = 0, sp = 0
  ps.forEach((p, i) => { const w = pesos?.[i] ?? 1; sl += p.lat * w; so += p.lon * w; sp += w })
  return sp ? { lat: sl / sp, lon: so / sp } : { lat: 0, lon: 0 }
}

/**
 * Raio de giração r_g, em QUILÔMETROS (González, Hidalgo & Barabási, Nature 2008).
 * Quão longe do centro de massa a pessoa se espalha: a "largura" da vida dela no mapa.
 * r_g = raiz( média( distância(ponto, centro)² ) )
 */
export function raioDeGiracao(ps: Coord[], pesos?: number[]): number {
  if (ps.length === 0) return 0
  const cm = centroDeMassa(ps, pesos)
  let soma = 0, sp = 0
  ps.forEach((p, i) => { const w = pesos?.[i] ?? 1; soma += w * distancia(p, cm) ** 2; sp += w })
  return sp ? Math.sqrt(soma / sp) / 1000 : 0
}

/** Entropia aleatória S_rand = log2(N): o caso em que todo lugar é igualmente provável. */
export const entropiaAleatoria = (nLugares: number) => (nLugares > 0 ? Math.log2(nLugares) : 0)

/**
 * Entropia não correlacionada S_unc = -Σ p·log2(p), sobre a frequência de cada lugar.
 * Já desconta que uns lugares são mais visitados que outros, mas ignora a ORDEM.
 */
export function entropiaNaoCorrelacionada(seq: string[]): number {
  if (seq.length === 0) return 0
  const cont = new Map<string, number>()
  for (const s of seq) cont.set(s, (cont.get(s) ?? 0) + 1)
  let S = 0
  for (const n of cont.values()) { const p = n / seq.length; S -= p * Math.log2(p) }
  return S
}

const apareceAntes = (seq: string[], ate: number, alvo: string[]) => {
  for (let i = 0; i + alvo.length <= ate; i++) {
    let igual = true
    for (let j = 0; j < alvo.length; j++) if (seq[i + j] !== alvo[j]) { igual = false; break }
    if (igual) return true
  }
  return false
}

/**
 * Entropia real S_real pelo estimador de Lempel-Ziv (Song et al., Science 2010).
 * Esta é a que leva a ORDEM em conta — é dela que sai o teto de previsibilidade.
 * S = n·log2(n) / Σ Λ_i, onde Λ_i é o menor trecho que começa em i e ainda não apareceu antes.
 */
export function entropiaReal(seq: string[]): number {
  const n = seq.length
  if (n < 2) return 0
  let soma = 0
  for (let i = 0; i < n; i++) {
    let lam = n - i + 1 // convenção: nenhum trecho novo cabe até o fim
    for (let L = 1; i + L <= n; L++) {
      if (!apareceAntes(seq, i, seq.slice(i, i + L))) { lam = L; break }
    }
    soma += lam
  }
  return soma > 0 ? (n * Math.log2(n)) / soma : 0
}

/**
 * Previsibilidade máxima Π^max, resolvendo a desigualdade de Fano (Song et al., 2010):
 * S = H(Π) + (1−Π)·log2(N−1). É o TETO: nenhum método, por melhor que seja, passa disso.
 */
export function previsibilidadeMaxima(S: number, nLugares: number): number {
  if (nLugares <= 1) return 1
  if (S <= 0) return 1
  const f = (p: number) => {
    const H = p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p))
    return H + (1 - p) * Math.log2(nLugares - 1)
  }
  let lo = 1 / nLugares, hi = 1
  if (S >= f(lo)) return lo // entropia no máximo: nada é previsível além do acaso
  for (let i = 0; i < 200; i++) { // f cai conforme p sobe
    const m = (lo + hi) / 2
    if (f(m) > S) lo = m; else hi = m
  }
  return (lo + hi) / 2
}

export type Perfil = 'retornante' | 'explorador' | 'indefinido'

/**
 * Retornante ou explorador (Pappalardo et al., Nat. Commun. 2015): compara o raio de
 * giração dos k lugares mais visitados com o raio total. Se os poucos lugares de sempre
 * já explicam metade ou mais do espalhamento, a pessoa é "retornante".
 */
export function perfilDeMobilidade(lugares: Lugar[], k = 2): { perfil: Perfil; razao: number; rgTopK: number; rgTotal: number } {
  const usaveis = lugares.filter(l => l.visitas > 0)
  const rgTotal = raioDeGiracao(usaveis, usaveis.map(l => l.visitas))
  if (usaveis.length < k || rgTotal <= 0) return { perfil: 'indefinido', razao: 0, rgTopK: 0, rgTotal }
  const top = [...usaveis].sort((a, b) => b.visitas - a.visitas).slice(0, k)
  const rgTopK = raioDeGiracao(top, top.map(l => l.visitas))
  const razao = rgTopK / rgTotal
  return { perfil: razao >= 0.5 ? 'retornante' : 'explorador', razao, rgTopK, rgTotal }
}

export type Confianca = 'baixa' | 'media' | 'boa'

/**
 * Honestidade (dim. 10): com poucos dados estas contas não valem grande coisa.
 * Song et al. usaram meses de registro; aqui dizemos na cara em que pé estamos.
 */
export function confianca(nPontos: number, nLugares: number): { nivel: Confianca; motivo: string } {
  if (nPontos < 50 || nLugares < 2) return { nivel: 'baixa', motivo: 'ainda há poucos pontos gravados: estes números vão mudar bastante' }
  if (nPontos < 500 || nLugares < 5) return { nivel: 'media', motivo: 'já dá para ter uma ideia, mas ainda é pouco para firmar' }
  return { nivel: 'boa', motivo: 'já há registro suficiente para estas contas se sustentarem' }
}

export interface Metricas {
  nPontos: number
  nLugares: number
  raioGiracaoKm: number
  entropiaAleatoria: number
  entropiaNaoCorrelacionada: number
  entropiaReal: number
  previsibilidadeMaxima: number
  perfil: ReturnType<typeof perfilDeMobilidade>
  confianca: ReturnType<typeof confianca>
}

/** Junta tudo a partir do que o cofre já tem. A sequência de visitas vem das paradas. */
export function metricasDeMobilidade(pontos: Ponto[], lugares: Lugar[], sequencia: string[]): Metricas {
  const nLugares = new Set(sequencia).size || lugares.length
  const sReal = entropiaReal(sequencia)
  return {
    nPontos: pontos.length,
    nLugares,
    raioGiracaoKm: raioDeGiracao(pontos),
    entropiaAleatoria: entropiaAleatoria(nLugares),
    entropiaNaoCorrelacionada: entropiaNaoCorrelacionada(sequencia),
    entropiaReal: sReal,
    previsibilidadeMaxima: previsibilidadeMaxima(sReal, nLugares),
    perfil: perfilDeMobilidade(lugares),
    confianca: confianca(pontos.length, nLugares),
  }
}

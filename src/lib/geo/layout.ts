// R6: desenhar o grafo na tela. Cálculo puro, no próprio aparelho, sem biblioteca de fora.
//
// O método é o de Fruchterman & Reingold (1991), "Graph Drawing by Force-Directed Placement",
// Software: Practice and Experience 21(11):1129-1164 — https://doi.org/10.1002/spe.4380211102
// Em palavras simples: todo ponto empurra todo ponto (para não ficarem em cima um do outro),
// e cada ligação puxa os dois pontos que ela liga (para o que está junto aparecer junto).
// Repete isso algumas centenas de vezes e o desenho se organiza sozinho.
//
// O sorteio inicial é SEMEADO de propósito: com os mesmos dados sai sempre o mesmo desenho,
// então o titular não vê o mapa dançar a cada vez que abre a aba.

export interface NoLayout { id: string }
export interface ArestaLayout { de: string; para: string }
export interface Posicao { id: string; x: number; y: number }

export const FONTE_LAYOUT = {
  autores: 'Fruchterman & Reingold',
  titulo: 'Graph Drawing by Force-Directed Placement',
  onde: 'Software: Practice and Experience, 1991',
  url: 'https://doi.org/10.1002/spe.4380211102',
}

/** Sorteio semeado (mulberry32): mesmos dados, mesmo desenho, sempre. */
function sorteio(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Soma dos códigos do id: dá a cada nó um lugar inicial estável. */
function semeadoPor(ids: string[]): number {
  let h = 2166136261
  for (const id of ids) for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/**
 * Devolve uma posição (x, y) para cada nó, dentro da caixa pedida, com margem.
 * Função pura: não toca na tela, não lê nada de fora, e é testada.
 */
export function posicionar(
  nos: NoLayout[],
  arestas: ArestaLayout[],
  opcoes: { largura?: number; altura?: number; passos?: number; margem?: number } = {},
): Posicao[] {
  const largura = opcoes.largura ?? 800
  const altura = opcoes.altura ?? 500
  const passos = opcoes.passos ?? 250
  const margem = opcoes.margem ?? 16
  const n = nos.length
  if (n === 0) return []
  if (n === 1) return [{ id: nos[0].id, x: largura / 2, y: altura / 2 }]

  const indice = new Map(nos.map((no, i) => [no.id, i]))
  const rnd = sorteio(semeadoPor(nos.map(no => no.id)))
  const x = new Float64Array(n)
  const y = new Float64Array(n)
  // Começa num círculo, com um empurrãozinho sorteado: evita que tudo nasça no mesmo ponto.
  for (let i = 0; i < n; i++) {
    const ang = (2 * Math.PI * i) / n
    x[i] = largura / 2 + (largura / 3) * Math.cos(ang) + (rnd() - 0.5) * 10
    y[i] = altura / 2 + (altura / 3) * Math.sin(ang) + (rnd() - 0.5) * 10
  }

  // k = distância de repouso entre dois pontos, do próprio artigo: raiz da área dividida pelo nº de pontos.
  const k = Math.sqrt((largura * altura) / n)
  const ligacoes = arestas
    .map(a => [indice.get(a.de), indice.get(a.para)] as [number | undefined, number | undefined])
    .filter((p): p is [number, number] => p[0] !== undefined && p[1] !== undefined && p[0] !== p[1])

  const dx = new Float64Array(n)
  const dy = new Float64Array(n)
  let temperatura = Math.max(largura, altura) / 10

  for (let passo = 0; passo < passos; passo++) {
    dx.fill(0); dy.fill(0)
    // Empurrão de todo mundo contra todo mundo.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ex = x[i] - x[j], ey = y[i] - y[j]
        let d = Math.hypot(ex, ey)
        if (d < 0.01) { ex = (rnd() - 0.5) * 0.1; ey = (rnd() - 0.5) * 0.1; d = 0.01 }
        const f = (k * k) / d
        const ux = (ex / d) * f, uy = (ey / d) * f
        dx[i] += ux; dy[i] += uy; dx[j] -= ux; dy[j] -= uy
      }
    }
    // Puxão de cada ligação.
    for (const [i, j] of ligacoes) {
      const ex = x[i] - x[j], ey = y[i] - y[j]
      const d = Math.max(Math.hypot(ex, ey), 0.01)
      const f = (d * d) / k
      const ux = (ex / d) * f, uy = (ey / d) * f
      dx[i] -= ux; dy[i] -= uy; dx[j] += ux; dy[j] += uy
    }
    // Anda, mas nunca mais que a "temperatura", que vai esfriando: no fim o desenho assenta.
    for (let i = 0; i < n; i++) {
      const d = Math.max(Math.hypot(dx[i], dy[i]), 0.01)
      const passoMax = Math.min(d, temperatura)
      x[i] = Math.min(largura - margem, Math.max(margem, x[i] + (dx[i] / d) * passoMax))
      y[i] = Math.min(altura - margem, Math.max(margem, y[i] + (dy[i] / d) * passoMax))
    }
    temperatura *= 0.95
  }

  return nos.map((no, i) => ({ id: no.id, x: x[i], y: y[i] }))
}

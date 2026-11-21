// Motor de elementos finitos 2D (método da rigidez direta) para pórticos e treliças planas.
// Ferramenta P1 do Plano Master de Engenharia ("Motor FEA"), versão 1: análise estática linear.
// Unidades coerentes: kN, m. E em kN/m² (aço ≈ 200e6; concreto C30 ≈ 26e6), A em m², I em m⁴.
// Convenções: eixo local x do nó i para o nó j; y local a 90° anti-horário. Momento positivo anti-horário
// nas extremidades; no diagrama, momento positivo traciona a fibra de baixo (y local negativo).
// Resultado de apoio ao projeto: o engenheiro habilitado confere modelo, cargas e resultados e assina.

export interface No { id: string; x: number; y: number }
export interface Apoio { no: string; ux?: boolean; uy?: boolean; rz?: boolean }
export interface Elemento {
  id: string; i: string; j: string
  E: number; A: number; I?: number
  /** 'portico' (flexão + axial) ou 'trelica' (só axial, nós rotulados) */
  tipo?: 'portico' | 'trelica'
  /** carga distribuída uniforme na direção y LOCAL (kN/m); negativo = para baixo numa barra da esquerda para a direita */
  w?: number
}
export interface CargaNo { no: string; fx?: number; fy?: number; mz?: number }
export interface ModeloFEM { nos: No[]; elementos: Elemento[]; apoios: Apoio[]; cargas: CargaNo[] }

export interface EsforcosElemento {
  id: string; L: number
  /** esforços nas extremidades, eixos locais, agindo SOBRE a barra: [Ni, Vi, Mi, Nj, Vj, Mj] */
  extremidades: number[]
  /** esforço normal (positivo = tração) */
  N: number
  Mmax: number; Mmin: number; xMmax: number; xMmin: number
  Vmax: number
  /** pontos do diagrama de momento (x, M) para desenhar */
  diagramaM: { x: number; M: number }[]
}
export interface ResultadoFEM {
  deslocamentos: Record<string, { ux: number; uy: number; rz: number }>
  reacoes: Record<string, { fx: number; fy: number; mz: number }>
  elementos: EsforcosElemento[]
  equilibrio: { somaFx: number; somaFy: number; ok: boolean }
  avisos: string[]
}

export class ErroFEM extends Error {}

function geometria(a: No, b: No) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy)
  return { L, c: dx / L, s: dy / L }
}

/** rigidez local 6×6 do elemento de pórtico plano */
function kLocal(E: number, A: number, I: number, L: number, trelica: boolean): number[][] {
  const ea = E * A / L
  if (trelica) {
    const k = Array.from({ length: 6 }, () => Array(6).fill(0))
    k[0][0] = ea; k[0][3] = -ea; k[3][0] = -ea; k[3][3] = ea
    return k
  }
  const ei = E * I, L2 = L * L, L3 = L2 * L
  const a = 12 * ei / L3, b = 6 * ei / L2, c4 = 4 * ei / L, c2 = 2 * ei / L
  return [
    [ea, 0, 0, -ea, 0, 0],
    [0, a, b, 0, -a, b],
    [0, b, c4, 0, -b, c2],
    [-ea, 0, 0, ea, 0, 0],
    [0, -a, -b, 0, a, -b],
    [0, b, c2, 0, -b, c4],
  ]
}

function matrizT(c: number, s: number): number[][] {
  const T = Array.from({ length: 6 }, () => Array(6).fill(0))
  for (const o of [0, 3]) { T[o][o] = c; T[o][o + 1] = s; T[o + 1][o] = -s; T[o + 1][o + 1] = c; T[o + 2][o + 2] = 1 }
  return T
}
const mul = (A: number[][], B: number[][]) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)))
const mulV = (A: number[][], v: number[]) => A.map(r => r.reduce((s, x, k) => s + x * v[k], 0))
const transp = (A: number[][]) => A[0].map((_, j) => A.map(r => r[j]))

/** forças nodais equivalentes (eixos locais) de carga uniforme w na direção y local */
function equivalentesLocais(w: number, L: number, trelica: boolean): number[] {
  if (trelica) return [0, w * L / 2, 0, 0, w * L / 2, 0]
  return [0, w * L / 2, w * L * L / 12, 0, w * L / 2, -w * L * L / 12]
}

/** eliminação de Gauss com pivotamento parcial */
function resolver(K: number[][], F: number[]): number[] {
  const n = F.length
  const A = K.map((r, i) => [...r, F[i]])
  const escala = Math.max(1e-30, ...K.map((r, i) => Math.abs(r[i])))
  for (let col = 0; col < n; col++) {
    let p = col
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[p][col])) p = r
    if (Math.abs(A[p][col]) < 1e-10 * escala) throw new ErroFEM('A estrutura é instável (mecanismo): faltam apoios ou barras para travar algum movimento.')
    ;[A[col], A[p]] = [A[p], A[col]]
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / A[col][col]
      if (f === 0) continue
      for (let k = col; k <= n; k++) A[r][k] -= f * A[col][k]
    }
  }
  const x = Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = A[r][n]
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]
    x[r] = s / A[r][r]
  }
  return x
}

export function analisar(m: ModeloFEM): ResultadoFEM {
  const avisos: string[] = []
  if (m.nos.length < 2) throw new ErroFEM('O modelo precisa de pelo menos dois nós.')
  if (m.elementos.length < 1) throw new ErroFEM('O modelo precisa de pelo menos uma barra.')
  const idx = new Map(m.nos.map((n, k) => [n.id, k]))
  if (idx.size !== m.nos.length) throw new ErroFEM('Há nós com o mesmo nome.')
  const nGL = m.nos.length * 3
  const K = Array.from({ length: nGL }, () => Array(nGL).fill(0))
  const F = Array(nGL).fill(0)

  const dados = m.elementos.map(e => {
    const a = m.nos[idx.get(e.i) ?? -1], b = m.nos[idx.get(e.j) ?? -1]
    if (!a || !b) throw new ErroFEM(`A barra ${e.id} liga um nó que não existe.`)
    if (!(e.E > 0) || !(e.A > 0)) throw new ErroFEM(`A barra ${e.id} precisa de E e A positivos.`)
    const trelica = e.tipo === 'trelica'
    if (!trelica && !((e.I ?? 0) > 0)) throw new ErroFEM(`A barra de pórtico ${e.id} precisa de inércia I positiva.`)
    const { L, c, s } = geometria(a, b)
    if (!(L > 0)) throw new ErroFEM(`A barra ${e.id} tem comprimento zero.`)
    const kl = kLocal(e.E, e.A, e.I ?? 0, L, trelica)
    const T = matrizT(c, s)
    const kg = mul(mul(transp(T), kl), T)
    const gl = [idx.get(e.i)!, idx.get(e.j)!].flatMap(k => [3 * k, 3 * k + 1, 3 * k + 2])
    for (let p = 0; p < 6; p++) for (let q = 0; q < 6; q++) K[gl[p]][gl[q]] += kg[p][q]
    const qLoc = equivalentesLocais(e.w ?? 0, L, trelica)
    const qGlob = mulV(transp(T), qLoc)
    for (let p = 0; p < 6; p++) F[gl[p]] += qGlob[p]
    return { e, L, T, kl, gl, qLoc, trelica }
  })

  for (const c of m.cargas) {
    const k = idx.get(c.no)
    if (k === undefined) throw new ErroFEM(`Carga num nó que não existe: ${c.no}.`)
    F[3 * k] += c.fx ?? 0; F[3 * k + 1] += c.fy ?? 0; F[3 * k + 2] += c.mz ?? 0
  }

  const preso = Array(nGL).fill(false)
  for (const ap of m.apoios) {
    const k = idx.get(ap.no)
    if (k === undefined) throw new ErroFEM(`Apoio num nó que não existe: ${ap.no}.`)
    if (ap.ux) preso[3 * k] = true
    if (ap.uy) preso[3 * k + 1] = true
    if (ap.rz) preso[3 * k + 2] = true
  }
  // nós só com barras de treliça não têm rigidez à rotação: trava-se a rotação (não muda nada nos esforços)
  for (let k = 0; k < m.nos.length; k++) {
    const g = 3 * k + 2
    if (!preso[g] && Math.abs(K[g][g]) === 0) preso[g] = true
  }

  const livres = [...Array(nGL).keys()].filter(g => !preso[g])
  const Kff = livres.map(r => livres.map(c => K[r][c]))
  const Ff = livres.map(r => F[r])
  const uf = livres.length ? resolver(Kff, Ff) : []
  const u = Array(nGL).fill(0)
  livres.forEach((g, k) => { u[g] = uf[k] })

  // reações: R = K·u − F nos graus presos
  const Ku = mulV(K, u)
  const deslocamentos: ResultadoFEM['deslocamentos'] = {}
  const reacoes: ResultadoFEM['reacoes'] = {}
  m.nos.forEach((n, k) => {
    deslocamentos[n.id] = { ux: u[3 * k], uy: u[3 * k + 1], rz: u[3 * k + 2] }
  })
  for (const ap of m.apoios) {
    const k = idx.get(ap.no)!
    const r = (g: number) => (preso[g] ? Ku[g] - F[g] : 0)
    reacoes[ap.no] = { fx: ap.ux ? r(3 * k) : 0, fy: ap.uy ? r(3 * k + 1) : 0, mz: ap.rz ? r(3 * k + 2) : 0 }
  }

  const elementos: EsforcosElemento[] = dados.map(({ e, L, T, kl, gl, qLoc, trelica }) => {
    const ul = mulV(T, gl.map(g => u[g]))
    const f = mulV(kl, ul).map((v, p) => v - qLoc[p])
    const w = e.w ?? 0
    const N = -f[0]
    const diagramaM: { x: number; M: number }[] = []
    let Mmax = -Infinity, Mmin = Infinity, xMmax = 0, xMmin = 0, Vmax = 0
    const passos = 40
    for (let p = 0; p <= passos; p++) {
      const x = (L * p) / passos
      const M = trelica ? 0 : -f[2] + f[1] * x + (w * x * x) / 2
      const V = f[1] + w * x
      diagramaM.push({ x, M })
      if (M > Mmax) { Mmax = M; xMmax = x }
      if (M < Mmin) { Mmin = M; xMmin = x }
      Vmax = Math.max(Vmax, Math.abs(V))
    }
    return { id: e.id, L, extremidades: f, N, Mmax, Mmin, xMmax, xMmin, Vmax, diagramaM }
  })

  // conferência de equilíbrio global: cargas + reações = 0
  let somaFx = 0, somaFy = 0
  for (let k = 0; k < m.nos.length; k++) { somaFx += F[3 * k]; somaFy += F[3 * k + 1] }
  for (const r of Object.values(reacoes)) { somaFx += r.fx; somaFy += r.fy }
  const ref = Math.max(1, ...F.map(Math.abs))
  const ok = Math.abs(somaFx) < 1e-6 * ref && Math.abs(somaFy) < 1e-6 * ref
  if (!ok) avisos.push('O equilíbrio global não fechou: confira o modelo.')
  const maxU = Math.max(...Object.values(deslocamentos).map(d => Math.hypot(d.ux, d.uy)))
  const maxL = Math.max(...elementos.map(e => e.L))
  if (maxU > maxL / 50) avisos.push('Deslocamentos grandes para análise linear (mais de L/50): o resultado linear pode não valer.')
  if (dados.some(d => d.trelica)) avisos.push('Barras de treliça: flambagem das barras comprimidas não é verificada aqui.')
  return { deslocamentos, reacoes, elementos, equilibrio: { somaFx, somaFy, ok }, avisos }
}

// ---------------------------------------------------------------- treliça paramétrica (ferramenta P1 "CAD paramétrico", v1)

export type TipoTrelica = 'pratt' | 'howe' | 'warren'
export interface ParamTrelica {
  tipo: TipoTrelica; vao: number; altura: number; paineis: number
  /** carga concentrada em cada nó do banzo superior (kN, para baixo) */
  cargaNo: number
  E: number; A: number
}
export interface BarraTrelica { id: string; i: string; j: string; papel: 'banzo inferior' | 'banzo superior' | 'montante' | 'diagonal'; L: number }

export function gerarTrelica(p: ParamTrelica): { modelo: ModeloFEM; barras: BarraTrelica[] } {
  const n = Math.round(p.paineis)
  if (n < 2 || n > 40) throw new ErroFEM('Use de 2 a 40 painéis.')
  if (p.tipo !== 'warren' && n % 2 !== 0) throw new ErroFEM('Pratt e Howe pedem número par de painéis (simetria).')
  if (!(p.vao > 0) || !(p.altura > 0)) throw new ErroFEM('Vão e altura precisam ser positivos.')
  const d = p.vao / n
  const nos: No[] = []
  const barras: BarraTrelica[] = []
  let c = 0
  const add = (i: string, j: string, papel: BarraTrelica['papel']) => {
    const a = nos.find(x => x.id === i)!, b = nos.find(x => x.id === j)!
    barras.push({ id: `B${++c}`, i, j, papel, L: Math.hypot(b.x - a.x, b.y - a.y) })
  }
  for (let k = 0; k <= n; k++) nos.push({ id: `I${k}`, x: k * d, y: 0 })
  if (p.tipo === 'warren') {
    for (let k = 0; k < n; k++) nos.push({ id: `S${k}`, x: (k + 0.5) * d, y: p.altura })
    for (let k = 0; k < n; k++) add(`I${k}`, `I${k + 1}`, 'banzo inferior')
    for (let k = 0; k < n - 1; k++) add(`S${k}`, `S${k + 1}`, 'banzo superior')
    for (let k = 0; k < n; k++) { add(`I${k}`, `S${k}`, 'diagonal'); add(`S${k}`, `I${k + 1}`, 'diagonal') }
  } else {
    for (let k = 1; k < n; k++) nos.push({ id: `S${k}`, x: k * d, y: p.altura })
    for (let k = 0; k < n; k++) add(`I${k}`, `I${k + 1}`, 'banzo inferior')
    for (let k = 1; k < n - 1; k++) add(`S${k}`, `S${k + 1}`, 'banzo superior')
    add('I0', 'S1', 'banzo superior'); add(`S${n - 1}`, `I${n}`, 'banzo superior')
    for (let k = 1; k < n; k++) add(`I${k}`, `S${k}`, 'montante')
    const meio = n / 2
    for (let k = 1; k < n - 1; k++) {
      // Pratt: diagonais descem para o meio (tracionadas sob gravidade); Howe: sobem para o meio (comprimidas)
      const esquerda = k < meio
      if (p.tipo === 'pratt') { if (esquerda) add(`S${k}`, `I${k + 1}`, 'diagonal'); else add(`I${k}`, `S${k + 1}`, 'diagonal') }
      else { if (esquerda) add(`I${k}`, `S${k + 1}`, 'diagonal'); else add(`S${k}`, `I${k + 1}`, 'diagonal') }
    }
  }
  const elementos: Elemento[] = barras.map(b => ({ id: b.id, i: b.i, j: b.j, E: p.E, A: p.A, tipo: 'trelica' }))
  const topo = nos.filter(x => x.id.startsWith('S'))
  const cargas: CargaNo[] = topo.map(t => ({ no: t.id, fy: -Math.abs(p.cargaNo) }))
  const apoios: Apoio[] = [{ no: 'I0', ux: true, uy: true }, { no: `I${n}`, uy: true }]
  return { modelo: { nos, elementos, apoios, cargas }, barras }
}

/** lista de materiais da treliça: comprimento por papel e massa de aço (densidade 7850 kg/m³) */
export function listaMateriaisTrelica(barras: BarraTrelica[], A: number, perdaPct = 5) {
  const grupos = new Map<string, { papel: string; qtd: number; comprimento: number }>()
  for (const b of barras) {
    const g = grupos.get(b.papel) ?? { papel: b.papel, qtd: 0, comprimento: 0 }
    g.qtd += 1; g.comprimento += b.L
    grupos.set(b.papel, g)
  }
  const linhas = [...grupos.values()].map(g => ({ ...g, massaKg: g.comprimento * A * 7850 * (1 + perdaPct / 100) }))
  const total = linhas.reduce((s, l) => ({ comprimento: s.comprimento + l.comprimento, massaKg: s.massaKg + l.massaKg }), { comprimento: 0, massaKg: 0 })
  return { linhas, total }
}

// ---------------------------------------------------------------- memória/relatório (ferramenta P2 "Gerador de relatórios", v1)

const f2 = (v: number, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

export function relatorioFEM(titulo: string, m: ModeloFEM, r: ResultadoFEM, data = new Date()): string {
  const L: string[] = []
  L.push(`MEMÓRIA DE CÁLCULO: ${titulo}`)
  L.push(`Emitida em ${data.toISOString().slice(0, 10)} pela plataforma THEYE Engenharia (análise estática linear, método da rigidez direta).`)
  L.push('Situação: rascunho de apoio. O engenheiro habilitado do país da obra confere e assina (ART no Brasil).')
  L.push('')
  L.push('1. MODELO')
  L.push(`Nós: ${m.nos.length}. Barras: ${m.elementos.length}. Apoios: ${m.apoios.length}. Cargas nodais: ${m.cargas.length}.`)
  for (const n of m.nos) L.push(`  Nó ${n.id}: x = ${f2(n.x, 3)} m, y = ${f2(n.y, 3)} m`)
  for (const e of m.elementos) L.push(`  Barra ${e.id} (${e.tipo === 'trelica' ? 'treliça' : 'pórtico'}): ${e.i} → ${e.j}; E = ${e.E.toExponential(3)} kN/m²; A = ${e.A} m²${e.tipo === 'trelica' ? '' : `; I = ${e.I} m⁴`}${e.w ? `; w = ${f2(e.w)} kN/m` : ''}`)
  for (const a of m.apoios) L.push(`  Apoio em ${a.no}: ${[a.ux && 'ux', a.uy && 'uy', a.rz && 'rz'].filter(Boolean).join(', ')} travados`)
  for (const c of m.cargas) L.push(`  Carga em ${c.no}: Fx = ${f2(c.fx ?? 0)} kN, Fy = ${f2(c.fy ?? 0)} kN, Mz = ${f2(c.mz ?? 0)} kN·m`)
  L.push('')
  L.push('2. REAÇÕES DE APOIO')
  for (const [no, v] of Object.entries(r.reacoes)) L.push(`  ${no}: Rx = ${f2(v.fx)} kN, Ry = ${f2(v.fy)} kN, Mz = ${f2(v.mz)} kN·m`)
  L.push(`  Conferência de equilíbrio: ΣFx = ${f2(r.equilibrio.somaFx, 6)}, ΣFy = ${f2(r.equilibrio.somaFy, 6)} → ${r.equilibrio.ok ? 'fecha' : 'NÃO FECHA'}`)
  L.push('')
  L.push('3. DESLOCAMENTOS')
  for (const [no, d] of Object.entries(r.deslocamentos)) L.push(`  ${no}: ux = ${f2(d.ux * 1000, 3)} mm, uy = ${f2(d.uy * 1000, 3)} mm, rz = ${f2(d.rz * 1000, 4)} mrad`)
  L.push('')
  L.push('4. ESFORÇOS NAS BARRAS')
  for (const e of r.elementos) L.push(`  ${e.id} (L = ${f2(e.L, 3)} m): N = ${f2(e.N)} kN (${e.N >= 0 ? 'tração' : 'compressão'}); Mmáx = ${f2(e.Mmax)} kN·m em x = ${f2(e.xMmax)} m; Mmín = ${f2(e.Mmin)} kN·m em x = ${f2(e.xMmin)} m; |V|máx = ${f2(e.Vmax)} kN`)
  if (r.avisos.length) { L.push(''); L.push('5. AVISOS'); for (const a of r.avisos) L.push(`  - ${a}`) }
  L.push('')
  L.push('Não verificado aqui: combinações de ações da norma do país, efeitos de 2.ª ordem, flambagem, ligações, fundações e deslocamentos-limite. Esses itens ficam com o engenheiro responsável.')
  return L.join('\n')
}

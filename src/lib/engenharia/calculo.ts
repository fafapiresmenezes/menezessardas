// Passo E4 do plano mestre THEYE v4: cálculo estrutural que pode ser conferido à mão, com memória de cálculo.
// Primeira fatia: combinação de ações (NBR 8681), esforços de viga biapoiada, flexão simples de seção retangular
// e cortante pelo modelo de cálculo I (NBR 6118). Unidades internas: kN e cm; tensões de entrada em MPa.
// É apoio ao engenheiro: o profissional habilitado confere e assina (ART).

export interface Passo {
  titulo: string
  formula: string
  conta: string
  resultado: number
  unidade: string
  referencia?: string
}

export interface Resultado<T> {
  valores: T
  passos: Passo[]
  avisos: string[]
}

const r = (v: number, casas = 2) => Number(v.toFixed(casas))
const fmt = (v: number, casas = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export const AVISO_ENGENHARIA =
  'Cálculo de apoio. O engenheiro habilitado confere os dados, as hipóteses e o resultado, e assina com ART.'

// ---------------------------------------------------------------- ações e combinações (NBR 8681 / NBR 6118 Tabelas 11.1 e 11.2)
export interface AcaoVariavel { nome: string; valor: number; psi0: number }

export function combinacaoUltimaNormal(
  permanente: number,
  variaveis: AcaoVariavel[],
  gamaG = 1.4,
  gamaQ = 1.4,
): Resultado<{ fd: number; principal: string }> {
  const passos: Passo[] = []
  if (variaveis.length === 0) {
    const fd = gamaG * permanente
    passos.push({ titulo: 'Combinação última só com ações permanentes', formula: 'Fd = γg · Fgk', conta: `${fmt(gamaG, 1)} · ${fmt(permanente)}`, resultado: r(fd), unidade: 'kN/m', referencia: 'NBR 8681, combinações últimas normais' })
    return { valores: { fd: r(fd), principal: '-' }, passos, avisos: [] }
  }
  let melhor = { fd: -Infinity, principal: '', conta: '' }
  for (const p of variaveis) {
    const secundarias = variaveis.filter(v => v !== p)
    const soma = secundarias.reduce((s, v) => s + v.psi0 * v.valor, 0)
    const fd = gamaG * permanente + gamaQ * (p.valor + soma)
    const conta = `${fmt(gamaG, 1)} · ${fmt(permanente)} + ${fmt(gamaQ, 1)} · (${fmt(p.valor)}${secundarias.map(v => ` + ${fmt(v.psi0, 1)} · ${fmt(v.valor)}`).join('')})`
    if (fd > melhor.fd) melhor = { fd, principal: p.nome, conta }
  }
  passos.push({
    titulo: `Combinação última normal (ação variável principal: ${melhor.principal})`,
    formula: 'Fd = γg · Fgk + γq · (Fq1k + Σ ψ0j · Fqjk)',
    conta: melhor.conta,
    resultado: r(melhor.fd),
    unidade: 'kN/m',
    referencia: 'NBR 8681; NBR 6118, Tabelas 11.1 (γf) e 11.2 (ψ0)',
  })
  return { valores: { fd: r(melhor.fd), principal: melhor.principal }, passos, avisos: [] }
}

// ---------------------------------------------------------------- viga biapoiada com carga uniforme
export function vigaBiapoiada(q: number, vao: number): Resultado<{ mMax: number; vMax: number }> {
  const m = (q * vao * vao) / 8
  const v = (q * vao) / 2
  return {
    valores: { mMax: r(m), vMax: r(v) },
    passos: [
      { titulo: 'Momento fletor máximo (meio do vão)', formula: 'M = q · L² / 8', conta: `${fmt(q)} · ${fmt(vao)}² / 8`, resultado: r(m), unidade: 'kN·m' },
      { titulo: 'Esforço cortante máximo (apoio)', formula: 'V = q · L / 2', conta: `${fmt(q)} · ${fmt(vao)} / 2`, resultado: r(v), unidade: 'kN' },
    ],
    avisos: [],
  }
}

// ---------------------------------------------------------------- concreto armado: flexão simples, seção retangular
// Taxa mínima de armadura de flexão para CA-50 (NBR 6118, Tabela 17.3), em %.
const RHO_MIN: [number, number][] = [[20, 0.15], [25, 0.15], [30, 0.15], [35, 0.164], [40, 0.179], [45, 0.194], [50, 0.208]]

export function taxaMinima(fck: number): number {
  if (fck <= 30) return 0.15
  for (let i = 1; i < RHO_MIN.length; i++) {
    const [f0, p0] = RHO_MIN[i - 1]
    const [f1, p1] = RHO_MIN[i]
    if (fck <= f1) return p0 + ((p1 - p0) * (fck - f0)) / (f1 - f0)
  }
  return RHO_MIN[RHO_MIN.length - 1][1]
}

export interface DadosFlexao {
  bw: number // cm
  h: number // cm
  d: number // cm (altura útil)
  fck: number // MPa
  fyk: number // MPa
  md: number // kN·m (momento de cálculo)
  gamaC?: number
  gamaS?: number
}

export function flexaoSimples(dados: DadosFlexao): Resultado<{ x: number; xd: number; as: number; asMin: number; asAdotar: number; z: number }> {
  const { bw, h, d, fck, fyk, md, gamaC = 1.4, gamaS = 1.15 } = dados
  const avisos: string[] = []
  if (fck > 50) avisos.push('Esta versão usa λ = 0,8 e αc = 0,85, válidos para concretos até C50. Para C55 a C90 o cálculo precisa dos parâmetros do item 17.2.2 da NBR 6118.')
  if (d >= h) avisos.push('A altura útil d deve ser menor que a altura h da seção.')
  const fcd = fck / 10 / gamaC // kN/cm²
  const fyd = fyk / 10 / gamaS // kN/cm²
  const mdCm = md * 100 // kN·cm
  // Md = 0,85·fcd·bw·0,8x·(d − 0,4x)  →  0,272·bw·fcd·x² − 0,68·bw·fcd·d·x + Md = 0
  const a = 0.272 * bw * fcd
  const b = -0.68 * bw * fcd * d
  const disc = b * b - 4 * a * mdCm
  const passos: Passo[] = [
    { titulo: 'Resistência de cálculo do concreto', formula: 'fcd = fck / γc', conta: `${fmt(fck, 0)} MPa / ${fmt(gamaC, 2)}`, resultado: r(fcd * 10), unidade: 'MPa', referencia: 'NBR 6118, item 12.3.3' },
    { titulo: 'Resistência de cálculo do aço', formula: 'fyd = fyk / γs', conta: `${fmt(fyk, 0)} MPa / ${fmt(gamaS, 2)}`, resultado: r(fyd * 10), unidade: 'MPa', referencia: 'NBR 6118, item 12.3.1' },
  ]
  if (disc < 0) {
    avisos.push('A seção não resiste a este momento nem com toda a altura comprimida. Aumente a seção ou a classe do concreto.')
    return { valores: { x: NaN, xd: NaN, as: NaN, asMin: NaN, asAdotar: NaN, z: NaN }, passos, avisos }
  }
  const x = (-b - Math.sqrt(disc)) / (2 * a)
  const xd = x / d
  const z = d - 0.4 * x
  const as = mdCm / (fyd * z)
  const rho = taxaMinima(fck)
  const asMin = (rho / 100) * bw * h
  passos.push(
    { titulo: 'Posição da linha neutra', formula: 'Md = 0,68 · bw · fcd · x · (d − 0,4 x)  →  x', conta: `${fmt(mdCm, 0)} kN·cm = 0,68 · ${fmt(bw, 0)} · ${fmt(fcd, 4)} · x · (${fmt(d, 1)} − 0,4 x)`, resultado: r(x), unidade: 'cm', referencia: 'NBR 6118, item 17.2.2 (diagrama retangular, λ = 0,8, αc = 0,85)' },
    { titulo: 'Ductilidade', formula: 'x / d ≤ 0,45 (até C50)', conta: `${fmt(x)} / ${fmt(d, 1)}`, resultado: r(xd, 3), unidade: '', referencia: 'NBR 6118, item 14.6.4.3' },
    { titulo: 'Braço de alavanca', formula: 'z = d − 0,4 x', conta: `${fmt(d, 1)} − 0,4 · ${fmt(x)}`, resultado: r(z), unidade: 'cm' },
    { titulo: 'Armadura longitudinal de tração', formula: 'As = Md / (fyd · z)', conta: `${fmt(mdCm, 0)} / (${fmt(fyd, 3)} · ${fmt(z)})`, resultado: r(as), unidade: 'cm²' },
    { titulo: 'Armadura mínima', formula: 'As,mín = ρmín · bw · h', conta: `${fmt(rho, 3)}% · ${fmt(bw, 0)} · ${fmt(h, 0)}`, resultado: r(asMin), unidade: 'cm²', referencia: 'NBR 6118, item 17.3.5.2.1 e Tabela 17.3' },
  )
  if (xd > 0.45) avisos.push('x/d passou de 0,45: a seção não tem a ductilidade exigida. Aumente a altura, a largura ou a classe do concreto, ou use armadura dupla (fora desta versão).')
  const asAdotar = Math.max(as, asMin)
  return { valores: { x: r(x), xd: r(xd, 3), as: r(as), asMin: r(asMin), asAdotar: r(asAdotar), z: r(z) }, passos, avisos }
}

// ---------------------------------------------------------------- concreto armado: cortante, modelo de cálculo I, estribos a 90°
export interface DadosCortante {
  bw: number // cm
  d: number // cm
  fck: number // MPa
  fywk: number // MPa
  vd: number // kN
  gamaC?: number
  gamaS?: number
}

export function cortanteModeloI(dados: DadosCortante): Resultado<{ vrd2: number; vc: number; aswS: number; aswSMin: number; aswSAdotar: number }> {
  const { bw, d, fck, fywk, vd, gamaC = 1.4, gamaS = 1.15 } = dados
  const avisos: string[] = []
  const fcd = fck / 10 / gamaC
  const alfaV2 = 1 - fck / 250
  const vrd2 = 0.27 * alfaV2 * fcd * bw * d
  const fctm = 0.3 * Math.pow(fck, 2 / 3) // MPa (até C50)
  const fctd = (0.7 * fctm) / gamaC // MPa
  const vc = 0.6 * (fctd / 10) * bw * d
  const fywd = Math.min(fywk / gamaS, 435) / 10 // kN/cm²
  const vsw = Math.max(vd - vc, 0)
  const aswS = (vsw / (0.9 * d * fywd)) * 100 // cm²/m
  const aswSMin = ((0.2 * fctm) / fywk) * bw * 100 // cm²/m
  if (vd > vrd2) avisos.push('Vd passou de VRd2: as bielas de concreto esmagam. Aumente a seção ou a classe do concreto.')
  const passos: Passo[] = [
    { titulo: 'Coeficiente de efetividade do concreto', formula: 'αv2 = 1 − fck / 250', conta: `1 − ${fmt(fck, 0)} / 250`, resultado: r(alfaV2, 3), unidade: '', referencia: 'NBR 6118, item 17.4.2.2' },
    { titulo: 'Resistência das bielas comprimidas', formula: 'VRd2 = 0,27 · αv2 · fcd · bw · d', conta: `0,27 · ${fmt(alfaV2, 3)} · ${fmt(fcd, 4)} · ${fmt(bw, 0)} · ${fmt(d, 1)}`, resultado: r(vrd2), unidade: 'kN', referencia: 'NBR 6118, item 17.4.2.2' },
    { titulo: 'Resistência média à tração do concreto', formula: 'fctm = 0,3 · fck^(2/3)', conta: `0,3 · ${fmt(fck, 0)}^(2/3)`, resultado: r(fctm, 3), unidade: 'MPa', referencia: 'NBR 6118, item 8.2.5' },
    { titulo: 'Parcela resistida pelo concreto', formula: 'Vc = 0,6 · fctd · bw · d, com fctd = 0,7 · fctm / γc', conta: `0,6 · ${fmt(fctd / 10, 4)} · ${fmt(bw, 0)} · ${fmt(d, 1)}`, resultado: r(vc), unidade: 'kN', referencia: 'NBR 6118, item 17.4.2.2 (flexão simples)' },
    { titulo: 'Armadura transversal (estribos a 90°)', formula: 'Asw/s = (Vd − Vc) / (0,9 · d · fywd)', conta: `(${fmt(vd)} − ${fmt(vc)}) / (0,9 · ${fmt(d, 1)} · ${fmt(fywd, 3)}) · 100`, resultado: r(aswS), unidade: 'cm²/m' },
    { titulo: 'Armadura transversal mínima', formula: 'Asw/s,mín = 0,2 · fctm / fywk · bw', conta: `0,2 · ${fmt(fctm, 3)} / ${fmt(fywk, 0)} · ${fmt(bw, 0)} · 100`, resultado: r(aswSMin), unidade: 'cm²/m', referencia: 'NBR 6118, item 17.4.1.1.1' },
  ]
  return { valores: { vrd2: r(vrd2), vc: r(vc), aswS: r(aswS), aswSMin: r(aswSMin), aswSAdotar: r(Math.max(aswS, aswSMin)) }, passos, avisos }
}

// ---------------------------------------------------------------- viga de concreto completa (tudo encadeado)
export interface DadosViga {
  vao: number // m
  g: number // kN/m (permanente característica, já com peso próprio)
  q: number // kN/m (variável característica)
  bw: number // cm
  h: number // cm
  cobrimentoUtil: number // cm (h − d)
  fck: number // MPa
  fyk: number // MPa
}

export function vigaConcreto(dados: DadosViga) {
  const comb = combinacaoUltimaNormal(dados.g, dados.q > 0 ? [{ nome: 'sobrecarga de uso', valor: dados.q, psi0: 0.5 }] : [])
  const esf = vigaBiapoiada(comb.valores.fd, dados.vao)
  const d = dados.h - dados.cobrimentoUtil
  const flex = flexaoSimples({ bw: dados.bw, h: dados.h, d, fck: dados.fck, fyk: dados.fyk, md: esf.valores.mMax })
  const cort = cortanteModeloI({ bw: dados.bw, d, fck: dados.fck, fywk: dados.fyk, vd: esf.valores.vMax })
  return {
    combinacao: comb,
    esforcos: esf,
    flexao: flex,
    cortante: cort,
    passos: [...comb.passos, ...esf.passos, ...flex.passos, ...cort.passos],
    avisos: [...flex.avisos, ...cort.avisos],
  }
}

export function memoriaDeCalculo(titulo: string, entrada: Record<string, string | number>, passos: Passo[], avisos: string[]): string {
  const linhas = [
    `MEMÓRIA DE CÁLCULO — ${titulo}`,
    'THEYE Institute · plataforma de engenharia',
    '',
    'DADOS DE ENTRADA',
    ...Object.entries(entrada).map(([k, v]) => `  ${k}: ${v}`),
    '',
    'CÁLCULO',
  ]
  passos.forEach((p, i) => {
    linhas.push(`${i + 1}. ${p.titulo}`)
    linhas.push(`   ${p.formula}`)
    linhas.push(`   ${p.conta} = ${fmt(p.resultado, p.unidade === '' ? 3 : 2)} ${p.unidade}`.trimEnd())
    if (p.referencia) linhas.push(`   Referência: ${p.referencia}`)
  })
  if (avisos.length) {
    linhas.push('', 'ATENÇÃO')
    avisos.forEach(a => linhas.push(`  - ${a}`))
  }
  linhas.push('', AVISO_ENGENHARIA, '', 'Responsável técnico: ______________________  Crea: __________  ART: __________')
  return linhas.join('\n')
}

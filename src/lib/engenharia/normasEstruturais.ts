// Viga de concreto armado em três normas: NBR 6118 (Brasil), EN 1992-1-1 (Eurocódigo 2: Europa, Angola, Portugal)
// e ACI 318-19 (EUA, Golfo, Egito em obras com padrão americano). Mais quantitativos e CAPEX da peça.
// Pedido de M (20/11/2026): plataforma internacional, obras em Angola, Namíbia, Egito, Europa e Dubai.
// Unidades internas: N, mm, MPa. Saídas de armadura em cm² e cm²/m para comparar as três normas lado a lado.
// Cálculo de apoio: o engenheiro habilitado no país da obra confere e assina.
import { vigaConcreto, type Passo } from './calculo'

export type NormaViga = 'NBR6118' | 'EC2' | 'ACI318'

export const NORMAS_VIGA: { id: NormaViga; nome: string; paises: string; dica: string }[] = [
  { id: 'NBR6118', nome: 'NBR 6118 (Brasil)', paises: 'Brasil', dica: 'Norma brasileira de concreto. Cargas majoradas por 1,4.' },
  { id: 'EC2', nome: 'Eurocódigo 2 (EN 1992-1-1)', paises: 'Europa, Portugal, Angola e obras com padrão europeu', dica: 'Norma europeia. Cargas: 1,35 na permanente e 1,5 na variável. Confira o anexo nacional do país.' },
  { id: 'ACI318', nome: 'ACI 318-19 (padrão americano)', paises: 'EUA, Dubai e obras com padrão americano', dica: 'Norma americana. Cargas: 1,2 na permanente e 1,6 na variável (ou 1,4 só na permanente).' },
]

export interface DadosVigaIntl {
  vao: number // m
  g: number // kN/m, permanente característica (inclui peso próprio)
  q: number // kN/m, variável característica
  bw: number // cm
  h: number // cm
  cobrimentoUtil: number // cm (h − d)
  fck: number // MPa (no ACI, f'c de cilindro)
  fyk: number // MPa (no ACI, fy)
}

export interface ResultadoVigaIntl {
  norma: NormaViga
  md: number // kN·m
  vd: number // kN
  as: number // cm²
  asMin: number // cm²
  asAdotar: number // cm²
  aswS: number // cm²/m
  aswSMin: number // cm²/m
  aswSAdotar: number // cm²/m
  passos: Passo[]
  avisos: string[]
}

const r = (v: number, c = 2) => Number(v.toFixed(c))
const f = (v: number, c = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c })

// ---------------------------------------------------------------- Eurocódigo 2
export function vigaEC2(dd: DadosVigaIntl, alfaCC = 1.0): ResultadoVigaIntl {
  const avisos: string[] = []
  const passos: Passo[] = []
  const b = dd.bw * 10, d = (dd.h - dd.cobrimentoUtil) * 10, fck = dd.fck, fyk = dd.fyk
  if (fck > 50) avisos.push('Esta versão usa λ = 0,8 e η = 1,0, válidos até C50/60 (EN 1992-1-1, 3.1.7).')
  const ed = 1.35 * dd.g + 1.5 * dd.q
  passos.push({ titulo: 'Combinação fundamental', formula: 'Ed = 1,35 · Gk + 1,5 · Qk', conta: `1,35 · ${f(dd.g)} + 1,5 · ${f(dd.q)}`, resultado: r(ed), unidade: 'kN/m', referencia: 'EN 1990, expressão 6.10 (valores recomendados; conferir o anexo nacional)' })
  const md = ed * dd.vao ** 2 / 8, vd = ed * dd.vao / 2
  passos.push({ titulo: 'Momento e cortante de cálculo (viga biapoiada)', formula: 'MEd = Ed·L²/8 ; VEd = Ed·L/2', conta: `${f(ed)} · ${f(dd.vao)}² / 8 ; ${f(ed)} · ${f(dd.vao)} / 2`, resultado: r(md), unidade: 'kN·m', referencia: `VEd = ${f(vd)} kN` })
  const fcd = alfaCC * fck / 1.5, fyd = fyk / 1.15
  passos.push({ titulo: 'Resistências de cálculo', formula: 'fcd = αcc · fck / 1,5 ; fyd = fyk / 1,15', conta: `${f(alfaCC, 2)} · ${f(fck, 0)} / 1,5`, resultado: r(fcd), unidade: 'MPa', referencia: `EN 1992-1-1, 3.1.6 e 3.2.7 ; fyd = ${f(fyd)} MPa` })
  const M = md * 1e6
  const a = 0.32 * b * fcd, bb = -0.8 * b * fcd * d
  const disc = bb * bb - 4 * a * M
  if (disc < 0) {
    avisos.push('A seção não resiste a este momento. Aumente a seção ou a classe do concreto.')
    return { norma: 'EC2', md: r(md), vd: r(vd), as: NaN, asMin: NaN, asAdotar: NaN, aswS: NaN, aswSMin: NaN, aswSAdotar: NaN, passos, avisos }
  }
  const x = (-bb - Math.sqrt(disc)) / (2 * a)
  const z = d - 0.4 * x
  const as = M / (fyd * z) / 100
  passos.push({ titulo: 'Linha neutra (diagrama retangular, λ = 0,8, η = 1,0)', formula: 'MEd = fcd · b · 0,8x · (d − 0,4x)', conta: `${f(M / 1e6)} kN·m = ${f(fcd)} · ${f(b, 0)} · 0,8x · (${f(d, 0)} − 0,4x)`, resultado: r(x, 1), unidade: 'mm', referencia: `EN 1992-1-1, 3.1.7 ; x/d = ${f(x / d, 3)}` })
  if (x / d > 0.45) avisos.push('x/d passou de 0,45: sem redistribuição, a seção perde ductilidade (EN 1992-1-1, 5.5). Aumente a seção ou use armadura de compressão.')
  passos.push({ titulo: 'Armadura de tração', formula: 'As = MEd / (fyd · z), z = d − 0,4x', conta: `${f(M / 1e6)}·10⁶ / (${f(fyd)} · ${f(z, 1)})`, resultado: r(as), unidade: 'cm²' })
  const fctm = 0.3 * Math.pow(fck, 2 / 3)
  const asMin = Math.max(0.26 * fctm / fyk * b * d, 0.0013 * b * d) / 100
  passos.push({ titulo: 'Armadura mínima', formula: 'As,min = máx(0,26 · fctm/fyk · b · d ; 0,0013 · b · d)', conta: `fctm = ${f(fctm, 3)} MPa`, resultado: r(asMin), unidade: 'cm²', referencia: 'EN 1992-1-1, 9.2.1.1(1) e Tabela 3.1' })
  const asAdotar = Math.max(as, asMin)
  // cortante
  const k = Math.min(1 + Math.sqrt(200 / d), 2)
  const rhoL = Math.min(asAdotar * 100 / (b * d), 0.02)
  const vrdc0 = (0.18 / 1.5) * k * Math.pow(100 * rhoL * fck, 1 / 3) * b * d
  const vmin = 0.035 * Math.pow(k, 1.5) * Math.sqrt(fck) * b * d
  const vrdc = Math.max(vrdc0, vmin) / 1000
  passos.push({ titulo: 'Resistência ao cortante sem estribos', formula: 'VRd,c = 0,18/γc · k · (100 · ρl · fck)^(1/3) · b · d ≥ vmin · b · d', conta: `k = ${f(k, 3)} ; ρl = ${f(rhoL, 4)}`, resultado: r(vrdc), unidade: 'kN', referencia: 'EN 1992-1-1, 6.2.2(1)' })
  const z2 = 0.9 * d, nu1 = 0.6 * (1 - fck / 250), fywd = fyk / 1.15
  let cot = 2.5
  const vrdmax25 = b * z2 * nu1 * fcd / (cot + 1 / cot) / 1000
  if (vd > vrdmax25) {
    const s2 = 2 * vd * 1000 / (b * z2 * nu1 * fcd)
    if (s2 > 1) { avisos.push('VEd passou de VRd,max: as bielas esmagam. Aumente a seção ou a classe do concreto.'); cot = 1 } else { cot = 1 / Math.tan(0.5 * Math.asin(s2)) }
  }
  const aswS = vd > vrdc ? vd * 1000 / (z2 * fywd * cot) * 10 : 0 // mm²/mm → cm²/m (×10)
  passos.push({ titulo: 'Estribos verticais (treliça de ângulo variável)', formula: 'Asw/s = VEd / (z · fywd · cotθ), z = 0,9d, 1 ≤ cotθ ≤ 2,5', conta: `cotθ = ${f(cot, 2)} ; ν1 = ${f(nu1, 3)}`, resultado: r(aswS), unidade: 'cm²/m', referencia: 'EN 1992-1-1, 6.2.3 (expressões 6.8 e 6.9)' })
  const aswSMin = 0.08 * Math.sqrt(fck) / fyk * b * 10
  passos.push({ titulo: 'Estribos mínimos', formula: 'ρw,min = 0,08 · √fck / fyk', conta: `0,08 · √${f(fck, 0)} / ${f(fyk, 0)} · ${f(b, 0)}`, resultado: r(aswSMin), unidade: 'cm²/m', referencia: 'EN 1992-1-1, 9.2.2 (expressão 9.5N)' })
  return { norma: 'EC2', md: r(md), vd: r(vd), as: r(as), asMin: r(asMin), asAdotar: r(asAdotar), aswS: r(aswS), aswSMin: r(aswSMin), aswSAdotar: r(Math.max(aswS, aswSMin)), passos, avisos }
}

// ---------------------------------------------------------------- ACI 318-19 (unidades SI)
export function beta1(fc: number): number {
  if (fc <= 28) return 0.85
  if (fc >= 55) return 0.65
  return 0.85 - (0.05 * (fc - 28)) / 7
}

export function vigaACI(dd: DadosVigaIntl): ResultadoVigaIntl {
  const avisos: string[] = []
  const passos: Passo[] = []
  const b = dd.bw * 10, d = (dd.h - dd.cobrimentoUtil) * 10, fc = dd.fck, fy = dd.fyk
  const wu = Math.max(1.4 * dd.g, 1.2 * dd.g + 1.6 * dd.q)
  passos.push({ titulo: 'Combinação de cálculo', formula: 'U = máx(1,4D ; 1,2D + 1,6L)', conta: `1,2 · ${f(dd.g)} + 1,6 · ${f(dd.q)}`, resultado: r(wu), unidade: 'kN/m', referencia: 'ACI 318-19, 5.3.1 (ASCE 7)' })
  const mu = wu * dd.vao ** 2 / 8, vu = wu * dd.vao / 2
  passos.push({ titulo: 'Momento e cortante de cálculo (viga biapoiada)', formula: 'Mu = wu·L²/8 ; Vu = wu·L/2', conta: `${f(wu)} · ${f(dd.vao)}² / 8`, resultado: r(mu), unidade: 'kN·m', referencia: `Vu = ${f(vu)} kN` })
  const phi = 0.9
  const Mn = mu * 1e6 / phi
  const A = fy * fy / (1.7 * fc * b), B = -fy * d
  const disc = B * B - 4 * A * Mn
  if (disc < 0) {
    avisos.push('A seção não resiste a este momento. Aumente a seção ou f\'c.')
    return { norma: 'ACI318', md: r(mu), vd: r(vu), as: NaN, asMin: NaN, asAdotar: NaN, aswS: NaN, aswSMin: NaN, aswSAdotar: NaN, passos, avisos }
  }
  const As = (-B - Math.sqrt(disc)) / (2 * A) // mm²
  const a = As * fy / (0.85 * fc * b)
  const b1 = beta1(fc)
  const c = a / b1
  const et = 0.003 * (d - c) / c
  const ety = fy / 200000
  passos.push({ titulo: 'Armadura de tração (bloco de Whitney)', formula: 'Mu/φ = As · fy · (d − a/2), a = As · fy / (0,85 · f\'c · b), φ = 0,90', conta: `${f(mu)}·10⁶ / 0,9 = As · ${f(fy, 0)} · (${f(d, 0)} − a/2)`, resultado: r(As / 100), unidade: 'cm²', referencia: 'ACI 318-19, 22.2.2 e 21.2.2' })
  passos.push({ titulo: 'Deformação do aço tracionado', formula: 'εt = 0,003 · (d − c) / c, c = a / β1', conta: `β1 = ${f(b1, 3)} ; c = ${f(c, 1)} mm`, resultado: r(et, 4), unidade: '', referencia: `ACI 318-19, 21.2.2: controlada pela tração se εt ≥ εty + 0,003 = ${f(ety + 0.003, 4)}` })
  if (et < ety + 0.003) avisos.push('A seção não é controlada pela tração: φ seria menor que 0,90 e a ruptura menos dúctil. Aumente a altura ou f\'c (ACI 318-19, 21.2.2).')
  const asMin = Math.max(0.25 * Math.sqrt(fc) / fy, 1.4 / fy) * b * d / 100
  passos.push({ titulo: 'Armadura mínima', formula: 'As,min = máx(0,25·√f\'c / fy ; 1,4 / fy) · bw · d', conta: `máx(${f(0.25 * Math.sqrt(fc) / fy, 5)} ; ${f(1.4 / fy, 5)}) · ${f(b, 0)} · ${f(d, 0)}`, resultado: r(asMin), unidade: 'cm²', referencia: 'ACI 318-19, 9.6.1.2' })
  const asAdotar = Math.max(As / 100, asMin)
  const phiV = 0.75
  const Vc = 0.17 * Math.sqrt(fc) * b * d / 1000
  passos.push({ titulo: 'Parcela do concreto no cortante', formula: 'Vc = 0,17 · λ · √f\'c · bw · d (λ = 1)', conta: `0,17 · √${f(fc, 0)} · ${f(b, 0)} · ${f(d, 0)}`, resultado: r(Vc), unidade: 'kN', referencia: 'ACI 318-19, 22.5.5.1 (expressão simplificada)' })
  const fyt = Math.min(fy, 420)
  const Vs = Math.max(vu / phiV - Vc, 0)
  const VsMax = 0.66 * Math.sqrt(fc) * b * d / 1000
  if (Vs > VsMax) avisos.push('Vs passou do máximo 0,66·√f\'c·bw·d: aumente a seção (ACI 318-19, 22.5.1.2).')
  const aswS = Vs * 1000 / (fyt * d) * 10
  passos.push({ titulo: 'Estribos verticais', formula: 'Av/s = (Vu/φ − Vc) / (fyt · d), φ = 0,75', conta: `(${f(vu)} / 0,75 − ${f(Vc)}) / (${f(fyt, 0)} · ${f(d, 0)})`, resultado: r(aswS), unidade: 'cm²/m', referencia: 'ACI 318-19, 22.5.8.5.3 e 21.2.1' })
  const aswSMin = Math.max(0.062 * Math.sqrt(fc), 0.35) * b / fyt * 10
  passos.push({ titulo: 'Estribos mínimos', formula: 'Av,min/s = máx(0,062·√f\'c ; 0,35) · bw / fyt', conta: `máx(${f(0.062 * Math.sqrt(fc), 3)} ; 0,35) · ${f(b, 0)} / ${f(fyt, 0)}`, resultado: r(aswSMin), unidade: 'cm²/m', referencia: 'ACI 318-19, 9.6.3.4' })
  return { norma: 'ACI318', md: r(mu), vd: r(vu), as: r(As / 100), asMin: r(asMin), asAdotar: r(asAdotar), aswS: r(aswS), aswSMin: r(aswSMin), aswSAdotar: r(Math.max(aswS, aswSMin)), passos, avisos }
}

export function vigaNBR(dd: DadosVigaIntl): ResultadoVigaIntl {
  const v = vigaConcreto(dd)
  return {
    norma: 'NBR6118', md: v.esforcos.valores.mMax, vd: v.esforcos.valores.vMax,
    as: v.flexao.valores.as, asMin: v.flexao.valores.asMin, asAdotar: v.flexao.valores.asAdotar,
    aswS: v.cortante.valores.aswS, aswSMin: v.cortante.valores.aswSMin, aswSAdotar: v.cortante.valores.aswSAdotar,
    passos: v.passos, avisos: v.avisos,
  }
}

export function vigaPorNorma(norma: NormaViga, dd: DadosVigaIntl): ResultadoVigaIntl {
  return norma === 'EC2' ? vigaEC2(dd) : norma === 'ACI318' ? vigaACI(dd) : vigaNBR(dd)
}

export function compararNormas(dd: DadosVigaIntl): ResultadoVigaIntl[] {
  return NORMAS_VIGA.map(n => vigaPorNorma(n.id, dd))
}

// ---------------------------------------------------------------- quantitativos e CAPEX da viga
export interface PrecosUnitarios {
  moeda: string
  concretoM3: number // por m³, lançado
  acoKg: number // por kg, cortado, dobrado e colocado
  formaM2: number // por m²
  indiretosPct: number // custos indiretos e margem (BDI) em %
}

export const PRECOS_EXEMPLO: PrecosUnitarios = { moeda: 'BRL', concretoM3: 750, acoKg: 11, formaM2: 120, indiretosPct: 25 }

// Faixas típicas de exatidão por classe de estimativa (AACE 18R-97), usadas no meio de cada intervalo.
export const CLASSES_AACE: Record<1 | 2 | 3 | 4 | 5, { definicao: string; baixo: number; alto: number }> = {
  5: { definicao: '0% a 2% do projeto definido (ideia)', baixo: -35, alto: 65 },
  4: { definicao: '1% a 15% (estudo de viabilidade)', baixo: -22.5, alto: 35 },
  3: { definicao: '10% a 40% (projeto básico)', baixo: -15, alto: 20 },
  2: { definicao: '30% a 75% (projeto detalhado em curso)', baixo: -10, alto: 12.5 },
  1: { definicao: '65% a 100% (projeto executivo completo)', baixo: -6.5, alto: 9 },
}

export interface Quantitativos {
  concretoM3: number
  formaM2: number
  acoLongKg: number
  acoEstriboKg: number
  acoTotalKg: number
  taxaAcoKgM3: number
  passos: Passo[]
}

const KG_POR_CM2_M = 0.785 // 1 cm² × 1 m de aço = 0,785 kg (massa específica 7850 kg/m³)

export function quantitativosViga(dd: DadosVigaIntl, res: ResultadoVigaIntl, perdaAcoPct = 10, perdaConcretoPct = 5, cobrimento = 3): Quantitativos {
  const b = dd.bw / 100, h = dd.h / 100, L = dd.vao
  const concreto = b * h * L * (1 + perdaConcretoPct / 100)
  const forma = (b + 2 * h) * L
  const acoLong = res.asAdotar * L * 1.1 * KG_POR_CM2_M * (1 + perdaAcoPct / 100) // +10% de comprimento para ancoragem
  const perimEstribo = 2 * ((dd.bw - 2 * cobrimento) + (dd.h - 2 * cobrimento)) / 100 + 0.2 // m, com ganchos
  const acoEstr = (res.aswSAdotar / 2) * perimEstribo * L * KG_POR_CM2_M * (1 + perdaAcoPct / 100)
  const total = acoLong + acoEstr
  const passos: Passo[] = [
    { titulo: 'Concreto', formula: 'V = b · h · L · (1 + perda)', conta: `${f(b)} · ${f(h)} · ${f(L)} · ${f(1 + perdaConcretoPct / 100)}`, resultado: r(concreto, 3), unidade: 'm³', referencia: 'critério de medição: volume geométrico; perda declarada à parte' },
    { titulo: 'Fôrma (fundo e duas laterais)', formula: 'A = (b + 2h) · L', conta: `(${f(b)} + 2 · ${f(h)}) · ${f(L)}`, resultado: r(forma), unidade: 'm²' },
    { titulo: 'Aço longitudinal', formula: 'm = As · L · 1,10 (ancoragem) · 0,785 · (1 + perda)', conta: `${f(res.asAdotar)} · ${f(L)} · 1,10 · 0,785 · ${f(1 + perdaAcoPct / 100)}`, resultado: r(acoLong, 1), unidade: 'kg' },
    { titulo: 'Aço dos estribos (2 ramos)', formula: 'm = (Asw/s ÷ 2) · perímetro · L · 0,785 · (1 + perda)', conta: `(${f(res.aswSAdotar)} ÷ 2) · ${f(perimEstribo)} · ${f(L)} · 0,785 · ${f(1 + perdaAcoPct / 100)}`, resultado: r(acoEstr, 1), unidade: 'kg' },
    { titulo: 'Taxa de aço', formula: 'taxa = aço total / concreto', conta: `${f(total, 1)} / ${f(concreto, 3)}`, resultado: r(total / concreto, 1), unidade: 'kg/m³' },
  ]
  return { concretoM3: r(concreto, 3), formaM2: r(forma), acoLongKg: r(acoLong, 1), acoEstriboKg: r(acoEstr, 1), acoTotalKg: r(total, 1), taxaAcoKgM3: r(total / concreto, 1), passos }
}

export interface Capex { direto: number; indiretos: number; base: number; baixo: number; alto: number; classe: number; moeda: string; passos: Passo[] }

export function capexViga(qt: Quantitativos, p: PrecosUnitarios, classe: 1 | 2 | 3 | 4 | 5 = 3): Capex {
  const direto = qt.concretoM3 * p.concretoM3 + qt.acoTotalKg * p.acoKg + qt.formaM2 * p.formaM2
  const indiretos = direto * p.indiretosPct / 100
  const base = direto + indiretos
  const c = CLASSES_AACE[classe]
  const baixo = base * (1 + c.baixo / 100), alto = base * (1 + c.alto / 100)
  return {
    direto: r(direto), indiretos: r(indiretos), base: r(base), baixo: r(baixo), alto: r(alto), classe, moeda: p.moeda,
    passos: [
      { titulo: 'Custo direto', formula: 'Σ quantidade × preço unitário', conta: `${f(qt.concretoM3, 3)}·${f(p.concretoM3)} + ${f(qt.acoTotalKg, 1)}·${f(p.acoKg)} + ${f(qt.formaM2)}·${f(p.formaM2)}`, resultado: r(direto), unidade: p.moeda },
      { titulo: 'Indiretos e margem', formula: 'direto × BDI', conta: `${f(direto)} × ${f(p.indiretosPct, 1)}%`, resultado: r(indiretos), unidade: p.moeda },
      { titulo: `Faixa da estimativa (classe ${classe} da AACE: ${c.definicao})`, formula: `base × (1 ${c.baixo}%) a base × (1 + ${c.alto}%)`, conta: `${f(base)} → ${f(baixo)} a ${f(alto)}`, resultado: r(base), unidade: p.moeda, referencia: 'AACE 18R-97 (faixas típicas; a faixa real sai da análise de risco)' },
    ],
  }
}

import { describe, it, expect } from 'vitest'
import { vigaEC2, vigaACI, vigaNBR, compararNormas, beta1, quantitativosViga, capexViga, PRECOS_EXEMPLO, type DadosVigaIntl } from './normasEstruturais'
import normas from './normas-paises.json'
import agentes from './agentes-producao.json'

// Referências calculadas por outro caminho (μ/ξ no Eurocódigo; Rn/ρ no ACI), tolerância < 1%.
const perto = (o: number, e: number) => expect(Math.abs(o - e) / Math.max(Math.abs(e), 0.05)).toBeLessThan(0.01)
const viga = (vao: number, g: number, q: number, bw: number, h: number, cobrimentoUtil: number, fck: number, fyk: number): DadosVigaIntl => ({ vao, g, q, bw, h, cobrimentoUtil, fck, fyk })

const EC2: [DadosVigaIntl, number[]][] = [
  [viga(6, 15, 5, 20, 50, 5, 25, 500), [124.88, 7.12, 1.2, 1.89, 1.6]],
  [viga(5, 10, 8, 15, 40, 4, 30, 500), [79.69, 5.76, 0.81, 1.81, 1.31]],
  [viga(7, 20, 10, 25, 60, 6, 30, 500), [257.25, 12.14, 2.03, 2.78, 2.19]],
  [viga(4, 8, 4, 15, 35, 4, 25, 500), [33.6, 2.7, 0.62, 1.11, 1.2]],
  [viga(8, 25, 12, 30, 70, 6, 35, 500), [414.0, 16.14, 3.2, 3.31, 2.84]],
]
const ACI: [DadosVigaIntl, number[]][] = [
  [viga(6, 15, 5, 20, 50, 5, 28, 420), [117.0, 7.42, 3.0, 1.22, 1.67]],
  [viga(5, 10, 8, 15, 40, 4, 35, 420), [77.5, 6.2, 1.9, 1.88, 1.31]],
  [viga(7, 20, 10, 25, 60, 6, 30, 420), [245.0, 13.04, 4.5, 2.69, 2.08]],
  [viga(4, 8, 4, 15, 35, 4, 25, 420), [32.0, 2.91, 1.55, 0.24, 1.25]],
  [viga(8, 25, 12, 30, 70, 6, 40, 420), [393.6, 17.22, 7.23, 2.08, 2.8]],
]

describe('Eurocódigo 2 (EN 1992-1-1)', () => {
  it.each(EC2)('viga %#', (d, [md, as, asMin, asw, aswMin]) => {
    const r = vigaEC2(d)
    perto(r.md, md); perto(r.as, as); perto(r.asMin, asMin); perto(r.aswS, asw); perto(r.aswSMin, aswMin)
    expect(r.passos.every(p => p.formula.length > 0)).toBe(true)
  })
})

describe('ACI 318-19', () => {
  it.each(ACI)('viga %#', (d, [mu, as, asMin, asw, aswMin]) => {
    const r = vigaACI(d)
    perto(r.md, mu); perto(r.as, as); perto(r.asMin, asMin); perto(r.aswS, asw); perto(r.aswSMin, aswMin)
  })
  it('β1 segue a tabela 22.2.2.4.3', () => {
    expect(beta1(25)).toBe(0.85); expect(beta1(35)).toBeCloseTo(0.80, 3); expect(beta1(60)).toBe(0.65)
  })
  it('avisa quando a seção não é controlada pela tração', () => {
    expect(vigaACI(viga(8, 40, 30, 15, 40, 4, 25, 420)).avisos.join(' ')).toMatch(/tração|resiste/)
  })
})

describe('comparação e quantitativos', () => {
  it('as três normas dão momentos na ordem esperada para a mesma viga (fatores de carga diferentes)', () => {
    const [nbr, ec2, aci] = compararNormas(viga(6, 15, 5, 20, 50, 5, 25, 500))
    expect(nbr.md).toBeCloseTo(126, 1) // 1,4·20·36/8
    expect(ec2.md).toBeCloseTo(124.88, 1) // (1,35·15 + 1,5·5)·36/8
    expect(aci.md).toBeCloseTo(117, 1) // (1,2·15 + 1,6·5)·36/8
  })
  it('quantitativos e CAPEX conferem com a conta à mão', () => {
    const d = viga(6, 15, 5, 20, 50, 5, 25, 500)
    const r = vigaNBR(d)
    const q = quantitativosViga(d, r)
    expect(q.concretoM3).toBeCloseTo(0.2 * 0.5 * 6 * 1.05, 3)
    expect(q.formaM2).toBeCloseTo((0.2 + 1.0) * 6, 2)
    expect(q.acoLongKg).toBeCloseTo(r.asAdotar * 6 * 1.1 * 0.785 * 1.1, 0)
    const c = capexViga(q, PRECOS_EXEMPLO, 3)
    const direto = q.concretoM3 * 750 + q.acoTotalKg * 11 + q.formaM2 * 120
    expect(c.direto).toBeCloseTo(direto, 0)
    expect(c.base).toBeCloseTo(direto * 1.25, 0)
    expect(c.baixo).toBeLessThan(c.base); expect(c.alto).toBeGreaterThan(c.base)
  })
})

describe('normas por país e 500 agentes', () => {
  it('cobre os países onde há obra', () => {
    for (const p of ['BR', 'AO', 'NA', 'EG', 'EU', 'AE', 'US', 'INT']) expect(Object.keys(normas.paises)).toContain(p)
    const concreto = normas.categorias.concreto.normas as Record<string, { codigo: string }[]>
    expect(concreto.EU[0].codigo).toBe('EN 1992-1-1')
    expect(concreto.US[0].codigo).toBe('ACI 318-19')
  })
  it('tem exatamente 500 agentes, 25 disciplinas × 20 funções, sem repetir', () => {
    expect(agentes.agentes).toHaveLength(500)
    expect(agentes.disciplinas).toHaveLength(25)
    expect(agentes.funcoes).toHaveLength(20)
    expect(new Set(agentes.agentes.map(a => a.disciplina + a.funcao)).size).toBe(500)
    for (const f of ['projeto-detalhado', 'modelagem-bim', 'dimensionamento', 'quantitativos', 'orcamento-capex', 'otimizacao-de-obra', 'indicadores-medicao']) {
      expect(agentes.funcoes.map(x => x.id)).toContain(f)
    }
  })
})

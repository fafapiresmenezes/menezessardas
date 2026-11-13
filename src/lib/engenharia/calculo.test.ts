import { describe, it, expect } from 'vitest'
import { combinacaoUltimaNormal, vigaBiapoiada, flexaoSimples, cortanteModeloI, taxaMinima, vigaConcreto, memoriaDeCalculo } from './calculo'
import catalogo from './catalogo.json'
import { ESTUDOS_ENGENHARIA, EQUIVALENCIAS } from './plataforma'

// Valores de referência conferidos à mão (fórmulas fechadas da NBR 6118, calculadas por outro caminho: kmd/kx/kz).
// Diferença tolerada: menos de 1% (critério do passo E4).
const perto = (obtido: number, esperado: number) => expect(Math.abs(obtido - esperado) / Math.max(Math.abs(esperado), 0.05)).toBeLessThan(0.01)

const FLEXAO: [number, number, number, number, number, number, number, number][] = [
  // bw, h, d, fck, fyk, Md (kN·m) → x (cm), As (cm²)
  [20, 50, 45, 25, 500, 140, 14.74, 8.23],
  [15, 40, 36, 20, 500, 40, 8.41, 2.82],
  [20, 60, 55, 30, 500, 200, 13.88, 9.3],
  [25, 70, 64, 35, 500, 350, 14.11, 13.79],
  [12, 30, 27, 25, 500, 20, 5.54, 1.86],
  [20, 45, 41, 40, 500, 160, 11.29, 10.09],
  [30, 80, 74, 30, 500, 500, 17.02, 17.12],
  [20, 50, 46, 50, 500, 250, 12.56, 14.03],
  [14, 40, 36, 25, 600, 50, 9.09, 2.96],
  [20, 40, 36, 25, 500, 100, 13.45, 7.51],
]

const CORTANTE: [number, number, number, number, number, number, number, number, number][] = [
  // bw, d, fck, fywk, Vd (kN) → VRd2, Vc, Asw/s, Asw/s mín
  [20, 45, 25, 500, 140, 390.54, 69.25, 4.02, 2.05],
  [15, 36, 20, 500, 60, 191.62, 35.81, 1.72, 1.33],
  [20, 55, 30, 500, 200, 560.06, 95.58, 4.85, 2.32],
  [25, 64, 35, 500, 350, 928.8, 154.08, 7.82, 3.21],
  [12, 27, 25, 500, 25, 140.59, 24.93, 0.01, 1.23],
  [20, 41, 40, 500, 160, 531.36, 86.32, 4.59, 2.81],
  [30, 74, 30, 500, 500, 1130.3, 192.9, 10.61, 3.48],
  [20, 46, 50, 500, 250, 709.71, 112.38, 7.65, 3.26],
  [14, 36, 25, 600, 80, 218.7, 38.78, 2.92, 1.2],
  [20, 36, 25, 500, 100, 312.43, 55.4, 3.17, 2.05],
]

describe('E4 · flexão simples (NBR 6118)', () => {
  it.each(FLEXAO)('bw=%s h=%s d=%s C%s fyk=%s Md=%s', (bw, h, d, fck, fyk, md, x, as) => {
    const res = flexaoSimples({ bw, h, d, fck, fyk, md })
    perto(res.valores.x, x)
    perto(res.valores.as, as)
    expect(res.passos.length).toBeGreaterThanOrEqual(6)
  })
  it('acusa falta de ductilidade quando x/d > 0,45', () => {
    const res = flexaoSimples({ bw: 15, h: 40, d: 36, fck: 20, fyk: 500, md: 95 })
    expect(res.valores.xd).toBeGreaterThan(0.45)
    expect(res.avisos.join(' ')).toMatch(/ductilidade/)
  })
  it('usa a armadura mínima quando o cálculo dá menos', () => {
    const res = flexaoSimples({ bw: 20, h: 60, d: 55, fck: 25, fyk: 500, md: 10 })
    expect(res.valores.asAdotar).toBe(res.valores.asMin)
    expect(res.valores.asMin).toBeCloseTo(1.8, 2)
  })
  it('taxa mínima segue a Tabela 17.3', () => {
    expect(taxaMinima(25)).toBe(0.15)
    expect(taxaMinima(40)).toBeCloseTo(0.179, 3)
    expect(taxaMinima(50)).toBeCloseTo(0.208, 3)
  })
})

describe('E4 · cortante, modelo I (NBR 6118)', () => {
  it.each(CORTANTE)('bw=%s d=%s C%s fywk=%s Vd=%s', (bw, d, fck, fywk, vd, vrd2, vc, aswS, aswSMin) => {
    const res = cortanteModeloI({ bw, d, fck, fywk, vd })
    perto(res.valores.vrd2, vrd2)
    perto(res.valores.vc, vc)
    perto(res.valores.aswS, aswS)
    perto(res.valores.aswSMin, aswSMin)
  })
  it('avisa quando a biela esmaga', () => {
    expect(cortanteModeloI({ bw: 12, d: 27, fck: 20, fywk: 500, vd: 300 }).avisos.join(' ')).toMatch(/VRd2/)
  })
})

describe('E4 · ações e esforços', () => {
  it('combinação última escolhe a ação variável principal que dá o maior valor', () => {
    const c = combinacaoUltimaNormal(10, [{ nome: 'uso', valor: 5, psi0: 0.5 }, { nome: 'vento', valor: 8, psi0: 0.6 }])
    // uso principal: 1,4·10 + 1,4·(5 + 0,6·8) = 27,72 ; vento principal: 1,4·10 + 1,4·(8 + 0,5·5) = 28,70
    expect(c.valores.fd).toBeCloseTo(28.7, 2)
    expect(c.valores.principal).toBe('vento')
  })
  it('viga biapoiada: M = qL²/8 e V = qL/2', () => {
    const v = vigaBiapoiada(20, 6)
    expect(v.valores.mMax).toBe(90)
    expect(v.valores.vMax).toBe(60)
  })
  it('viga completa gera memória com dados, passos, referência e campo de ART', () => {
    const v = vigaConcreto({ vao: 6, g: 15, q: 5, bw: 20, h: 50, cobrimentoUtil: 5, fck: 25, fyk: 500 })
    expect(v.esforcos.valores.mMax).toBeCloseTo(126, 1) // (1,4·15 + 1,4·5)·36/8
    const texto = memoriaDeCalculo('Viga V1', { vão: '6 m' }, v.passos, v.avisos)
    expect(texto).toContain('MEMÓRIA DE CÁLCULO')
    expect(texto).toContain('NBR 6118')
    expect(texto).toContain('ART')
  })
})

describe('E1 · catálogo e E7 · estudos', () => {
  it('catálogo tem pelo menos 300 matérias, todas com ementa, ramo, escola e norma', () => {
    expect(catalogo.materias.length).toBeGreaterThanOrEqual(300)
    for (const m of catalogo.materias) {
      expect(m.ementa.length).toBeGreaterThan(0)
      expect(m.escolas.length).toBeGreaterThan(0)
      expect(m.normas.length).toBeGreaterThan(0)
      expect(Object.keys(catalogo.ramos)).toContain(m.ramo)
    }
  })
  it('o ramo do Instituto cobre IA, cibersegurança, nuvem e superinteligência', () => {
    const nomes = catalogo.materias.filter(m => m.ramo === 'instituto').map(m => m.nome).join(' | ')
    for (const t of ['Inteligência artificial', 'Cibersegurança', 'Computação em nuvem', 'Superinteligência']) expect(nomes).toContain(t)
  })
  it('há pelo menos 12 estudos para órgãos públicos e o mapa de equivalências cobre as 6 telas', () => {
    expect(ESTUDOS_ENGENHARIA.length).toBeGreaterThanOrEqual(12)
    expect(EQUIVALENCIAS.length).toBeGreaterThanOrEqual(6)
  })
})

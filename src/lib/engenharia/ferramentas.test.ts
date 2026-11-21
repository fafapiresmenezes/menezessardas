import { describe, it, expect } from 'vitest'
import { lerIFC, separarArgs, bomParaCSV, IFC_EXEMPLO } from './ifc'
import { lerCaixas, detectarConflitos, resumoConflitos, CAIXAS_EXEMPLO, ErroCaixas, type Caixa } from './conflitos'
import { calcularEstimativa, estimativaParaCSV, LINHAS_EXEMPLO } from './estimativa'

describe('leitor IFC', () => {
  it('separa argumentos respeitando strings com vírgula, aspas escapadas e listas', () => {
    expect(separarArgs("'a,b',$,'it''s',(#1,#2),.T.")).toEqual(["'a,b'", '$', "'it''s'", '(#1,#2)', '.T.'])
  })

  it('lê o exemplo: esquema, elementos, quantidades e lista de materiais', () => {
    const r = lerIFC(IFC_EXEMPLO)
    expect(r.esquema).toBe('IFC4')
    expect(r.elementos).toHaveLength(6)
    const p1 = r.elementos.find(e => e.nome === 'Pilar P1 30x30')!
    expect(p1.quantidades.volume).toBeCloseTo(0.27)
    const pilares = r.bom.filter(l => l.tipo === 'IFCCOLUMN')
    expect(pilares.reduce((s, l) => s + l.volume, 0)).toBeCloseTo(0.54)
    expect(r.bom.find(l => l.tipo === 'IFCSLAB')!.area).toBeCloseTo(36)
    expect(r.bom.find(l => l.tipo === 'IFCPIPESEGMENT')!.comprimento).toBeCloseTo(12.5)
    expect(bomParaCSV(r.bom).split('\n')[0]).toContain('Volume')
  })

  it('aponta os defeitos plantados no exemplo: referência quebrada e parede sem andar', () => {
    const r = lerIFC(IFC_EXEMPLO)
    const codigos = r.problemas.map(p => p.codigo)
    expect(codigos).toContain('ref-quebrada')
    expect(r.problemas.find(p => p.codigo === 'ref-quebrada')!.ids).toContain(44)
    expect(r.problemas.find(p => p.codigo === 'sem-local')!.ids).toEqual([15])
    expect(codigos).not.toContain('guid-duplicado')
  })

  it('pega GlobalId repetido, falta de IfcProject e arquivo que não é IFC', () => {
    const dup = IFC_EXEMPLO.replace("#11=IFCCOLUMN('1kTvXnbbzCWw8lcMd1dR4o'", "#11=IFCCOLUMN('2O2Fr$t4X7Zf8NOew3FLOH'")
    expect(lerIFC(dup).problemas.map(p => p.codigo)).toContain('guid-duplicado')
    const semProj = IFC_EXEMPLO.replace(/#1=IFCPROJECT[^\n]*\n/, '')
    expect(lerIFC(semProj).problemas.map(p => p.codigo)).toContain('sem-projeto')
    const lixo = lerIFC('isto não é ifc')
    expect(lixo.problemas.filter(p => p.gravidade === 'erro').length).toBeGreaterThanOrEqual(2)
  })

  it('texto hostil com muitas aspas não trava o leitor (sem retrocesso exponencial)', () => {
    const t0 = Date.now()
    lerIFC(`ISO-10303-21;\nDATA;\n#0=0('${"''".repeat(20000)}`)
    expect(Date.now() - t0).toBeLessThan(1000)
  })

  it('não confunde ponto e vírgula dentro de string com fim de instância', () => {
    const t = IFC_EXEMPLO.replace("'Parede bloco 14'", "'Parede; bloco 14 (fachada)'")
    const r = lerIFC(t)
    expect(r.elementos.find(e => e.id === 15)!.nome).toBe('Parede; bloco 14 (fachada)')
  })
})

describe('detector de conflitos', () => {
  const cx = (id: string, d: string, min: number[], max: number[]): Caixa => ({ id, disciplina: d, nome: id, min: min as [number, number, number], max: max as [number, number, number] })

  it('cruzamento: volume e penetração exatos', () => {
    const r = detectarConflitos([cx('A', 'E', [0, 0, 0], [2, 2, 2]), cx('B', 'H', [1, 1.5, 1.9], [3, 3, 3])])
    expect(r).toHaveLength(1)
    expect(r[0].tipo).toBe('duro')
    expect(r[0].volume).toBeCloseTo(1 * 0.5 * 0.1)
    expect(r[0].medida).toBeCloseTo(0.1)
  })

  it('folga: distância diagonal entre cantos', () => {
    const r = detectarConflitos([cx('A', 'E', [0, 0, 0], [1, 1, 1]), cx('B', 'H', [1.03, 1.04, 0], [2, 2, 1])], { folga: 0.1 })
    expect(r[0].tipo).toBe('folga')
    expect(r[0].medida).toBeCloseTo(0.05)
    expect(detectarConflitos([cx('A', 'E', [0, 0, 0], [1, 1, 1]), cx('B', 'H', [1.03, 1.04, 0], [2, 2, 1])], { folga: 0.04 })).toHaveLength(0)
  })

  it('mesma disciplina fica de fora por padrão', () => {
    const cs = [cx('A', 'E', [0, 0, 0], [2, 2, 2]), cx('B', 'E', [1, 1, 1], [3, 3, 3])]
    expect(detectarConflitos(cs)).toHaveLength(0)
    expect(detectarConflitos(cs, { mesmaDisciplina: true })).toHaveLength(1)
  })

  it('confere com força bruta em 200 caixas aleatórias', () => {
    let s = 7
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const cs: Caixa[] = Array.from({ length: 200 }, (_, k) => { const x = rnd() * 50, y = rnd() * 50, z = rnd() * 10; return cx(`C${k}`, ['E', 'H', 'L'][k % 3], [x, y, z], [x + rnd() * 3, y + rnd() * 3, z + rnd()]) })
    let bruto = 0
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      if (cs[i].disciplina === cs[j].disciplina) continue
      if ([0, 1, 2].every(e => Math.min(cs[i].max[e], cs[j].max[e]) - Math.max(cs[i].min[e], cs[j].min[e]) > 0)) bruto++
    }
    expect(detectarConflitos(cs).filter(c => c.tipo === 'duro')).toHaveLength(bruto)
  })

  it('lê o exemplo e encontra conflitos entre disciplinas', () => {
    const cs = lerCaixas(CAIXAS_EXEMPLO)
    expect(cs).toHaveLength(7)
    const r = detectarConflitos(cs, { folga: 0.05 })
    expect(r.some(c => c.tipo === 'duro' && [c.a, c.b].includes('T1') && [c.a, c.b].includes('V1'))).toBe(true)
    expect(resumoConflitos(r).length).toBeGreaterThan(0)
  })

  it('recusa linha incompleta e id repetido', () => {
    expect(() => lerCaixas('A;E;x;0;0;0')).toThrow(ErroCaixas)
    expect(() => lerCaixas('A;E;x;0;0;0;1;1;1\nA;H;y;0;0;0;1;1;1')).toThrow(ErroCaixas)
  })
})

describe('estimativa de custo', () => {
  const p = { moeda: 'BRL', bdiPct: 25, contingenciaPct: 5, classe: 3 as const, dataBase: '2026-11' }
  it('direto, BDI, contingência e faixa AACE classe 3', () => {
    const r = calcularEstimativa([{ codigo: '1', servico: 'a', unidade: 'm³', quantidade: 10, precoUnitario: 100 }], p)
    expect(r.direto).toBe(1000)
    expect(r.bdi).toBe(250)
    expect(r.contingencia).toBeCloseTo(62.5)
    expect(r.base).toBeCloseTo(1312.5)
    expect(r.baixo).toBeCloseTo(1312.5 * 0.85)
    expect(r.alto).toBeCloseTo(1312.5 * 1.2)
  })

  it('curva ABC: o primeiro item é A e a soma bate', () => {
    const r = calcularEstimativa(LINHAS_EXEMPLO, p)
    expect(r.abc[0].classe).toBe('A')
    expect(r.abc[r.abc.length - 1].acumuladoPct).toBeCloseTo(100)
    expect(r.grupos.reduce((s, g) => s + g.total, 0)).toBeCloseTo(r.direto)
    expect(estimativaParaCSV(r, p)).toContain('Faixa (classe 3)')
  })

  it('descarta linha com número inválido em vez de somar NaN', () => {
    const r = calcularEstimativa([{ codigo: '1', servico: 'a', unidade: 'un', quantidade: NaN, precoUnitario: 1 }, { codigo: '2', servico: 'b', unidade: 'un', quantidade: 2, precoUnitario: 3 }], p)
    expect(r.direto).toBe(6)
    expect(r.descartadas).toBe(1)
  })
})

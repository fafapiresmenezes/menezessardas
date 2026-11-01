// Passo 428: alertas da carteira — vencimento, reajuste anual, renovatória (art. 51) e documentos, em ordem de urgência.
import { describe, it, expect } from 'vitest'

const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
  removeItem: (k: string) => { mem.delete(k) },
}
const { calcularAlertas } = await import('./repositorio')
type Imovel = import('./repositorio').Imovel
type Contrato = import('./repositorio').Contrato
const { emDias } = await import('./datas')

const imovel = (id: string, docs: string[] = []): Imovel => ({
  id, endereco: `Rua ${id}`, cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'loja', uso: 'locado', proprietario: 'P', matricula: '1', notas: '',
  documentos: docs.map((v, i) => ({ id: `${id}-d${i}`, tipo: 'iptu', nome: `IPTU ${i}`, enviadoEm: emDias(-30), dataVencimento: v })),
})
const contrato = (id: string, extra: Partial<Contrato> = {}): Contrato => ({
  id, imovelId: '1', tipo: 'locacao_residencial', parte: 'Locatário', dataInicio: emDias(-200), dataVencimento: emDias(100), valor: 1000, periodicidade: 'mensal',
  indice: 'igpm', garantia: 'caucao', dataUltimoReajuste: null, notas: '', criadoEm: emDias(-200), documentos: [], ...extra,
} as Contrato)

describe('calcularAlertas', () => {
  it('vencimento e reajuste anual pelo IGP-M, ordenados por dias restantes, com nome do imóvel', () => {
    const a = calcularAlertas([imovel('1')], [contrato('c1', { dataInicio: emDias(-300), dataVencimento: emDias(100) })])
    expect(a.map(x => x.tipo)).toEqual(['reajuste', 'vencimento'])
    expect(a[0]).toMatchObject({ id: 'reaj-c1', imovel: 'Rua 1, Rio de Janeiro', titulo: 'Reajuste anual (IGP-M)', diasRestantes: 65 })
    expect(a[1]).toMatchObject({ id: 'venc-c1', diasRestantes: 100 })
  })
  it('sem reajuste/fixo não gera reajuste; reajuste depois do fim do contrato também não', () => {
    expect(calcularAlertas([], [contrato('a', { indice: 'fixo' })]).map(x => x.tipo)).toEqual(['vencimento'])
    expect(calcularAlertas([], [contrato('b', { dataInicio: emDias(-100), dataVencimento: emDias(100) })]).map(x => x.tipo)).toEqual(['vencimento'])
  })
  it('contrato encerrado não gera vencimento nem reajuste, mas seus documentos continuam valendo', () => {
    const c = contrato('c', { encerradoEm: emDias(-1), documentos: [{ id: 'd1', tipo: 'contrato', nome: 'Aditivo', enviadoEm: emDias(-10), dataVencimento: emDias(20) }] })
    const a = calcularAlertas([imovel('1')], [c])
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ id: 'doc-d1', tipo: 'documento', contratoId: 'c', titulo: 'Vencimento de documento: Aditivo' })
  })
  it('locação comercial de 5 anos ou mais gera prazo da renovatória 6 meses antes do fim', () => {
    const c = contrato('r', { tipo: 'locacao_comercial', dataInicio: '2022-01-01', dataVencimento: emDias(300), indice: 'sem_reajuste' })
    const a = calcularAlertas([], [c])
    const renov = a.find(x => x.tipo === 'renovatoria')!
    expect(renov).toBeTruthy()
    expect(renov.diasRestantes).toBeGreaterThan(100)
    expect(renov.diasRestantes).toBeLessThan(130)
    const curto = contrato('s', { tipo: 'locacao_comercial', dataInicio: emDias(-100), dataVencimento: emDias(300), indice: 'sem_reajuste' })
    expect(calcularAlertas([], [curto]).some(x => x.tipo === 'renovatoria')).toBe(false)
  })
  it('documentos do imóvel entram só dentro da janela de 400 dias e vencidos vêm primeiro', () => {
    const a = calcularAlertas([imovel('1', [emDias(500), emDias(-3), emDias(10)])], [])
    expect(a.map(x => x.diasRestantes)).toEqual([-3, 10])
    expect(a[0].imovelId).toBe('1')
  })
})

import { describe, it, expect } from 'vitest'
import { diffPalavras, resumoRedline, diffCampos, redlineEmTexto, pdfRedline } from './redline'
import type { Contrato } from './repositorio'

const base: Contrato = { id: 'c1', imovelId: 'i1', tipo: 'locacao_residencial', parte: 'Ana Souza', dataInicio: '2025-01-01', dataVencimento: '2027-12-31', valor: 3000, periodicidade: 'mensal', indice: 'igpm', garantia: 'caucao', dataUltimoReajuste: null, notas: '', criadoEm: '2025-01-01', documentos: [] }

describe('redline (D17)', () => {
  it('marca o que saiu e o que entrou por palavra', () => {
    const s = diffPalavras('O aluguel mensal é de R$ 3.000,00 com reajuste pelo IGP-M', 'O aluguel mensal é de R$ 3.300,00 com reajuste anual pelo IPCA')
    expect(s).toEqual([
      { tipo: 'igual', texto: 'O aluguel mensal é de R$' }, { tipo: 'removido', texto: '3.000,00' }, { tipo: 'inserido', texto: '3.300,00' },
      { tipo: 'igual', texto: 'com reajuste' }, { tipo: 'inserido', texto: 'anual' }, { tipo: 'igual', texto: 'pelo' }, { tipo: 'removido', texto: 'IGP-M' }, { tipo: 'inserido', texto: 'IPCA' },
    ])
    expect(resumoRedline(s)).toEqual({ iguais: 9, removidas: 2, inseridas: 3, trechosAlterados: 5, pctAlterado: 36 })
    expect(redlineEmTexto(s)).toBe('O aluguel mensal é de R$ [- 3.000,00 -] {+ 3.300,00 +} com reajuste {+ anual +} pelo [- IGP-M -] {+ IPCA +}')
  })
  it('texto igual, vazio e marcadores de página', () => {
    expect(diffPalavras('', '')).toEqual([])
    expect(diffPalavras('[Página 1] a b', '[Página 1] a b')).toEqual([{ tipo: 'igual', texto: 'a b' }])
    expect(diffPalavras('', 'novo texto')).toEqual([{ tipo: 'inserido', texto: 'novo texto' }])
  })
  it('contexto encurtado em trechos iguais longos', () => {
    const longo = Array.from({ length: 30 }, (_, i) => `p${i}`).join(' ')
    const t = redlineEmTexto(diffPalavras(`${longo} fim`, `${longo} final`), 3)
    expect(t).toBe('(…) p27 p28 p29 [- fim -] {+ final +}')
  })
  it('compara os campos do cadastro e gera o PDF', () => {
    const campos = diffCampos(base, { ...base, id: 'c2', valor: 3300, indice: 'ipca', dataVencimento: null })
    const n = (t: string) => t.replace(/\u00a0/g, ' ')
    expect(campos.filter(c => c.mudou).map(c => [c.campo, n(c.antes), n(c.depois)])).toEqual([
      ['Valor combinado', 'R$ 3.000,00', 'R$ 3.300,00'], ['Vencimento', '31/12/2027', 'indeterminado'], ['Índice de reajuste', 'IGP-M', 'IPCA'],
    ])
    const pdf = pdfRedline('Comparação', campos, diffPalavras('a b c', 'a x c'), 'PDF das duas versões')
    expect(new TextDecoder().decode(pdf.slice(0, 8))).toBe('%PDF-1.4')
    expect(pdf.length).toBeGreaterThan(800)
  })
})

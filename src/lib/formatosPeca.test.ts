import { describe, it, expect } from 'vitest'
import { FORMATOS, sortearFormato, pecaEmHtml } from './formatarPeca'

const PECA = 'EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 3ª VARA CÍVEL\n\nCONTRARRAZÕES DE APELAÇÃO\n\nI – DOS FATOS\n\nO réu não pagou.\n\nSegundo parágrafo.\n\n2. DO DIREITO\n\nA lei é clara.\n\nDOS PEDIDOS\n\na) a manutenção da sentença;\nb) honorários.'

describe('rodízio de formatação', () => {
  it('tem 10 modelos diferentes, todos dentro do aceito em peça forense', () => {
    expect(FORMATOS).toHaveLength(10)
    expect(new Set(FORMATOS.map(f => f.id)).size).toBe(10)
    expect(new Set(FORMATOS.map(f => `${f.base.fonte}|${f.base.corpo}|${f.base.entrelinhas}|${f.numeracaoTitulos}|${f.paragrafosNumerados}|${f.tituloAlinhado}`)).size).toBe(10)
    for (const f of FORMATOS) {
      expect(f.base.corpo).toBeGreaterThanOrEqual(11.5); expect(f.base.corpo).toBeLessThanOrEqual(13)
      expect(f.base.entrelinhas).toBeGreaterThanOrEqual(1.15); expect(f.base.entrelinhas).toBeLessThanOrEqual(1.5)
      for (const v of Object.values(f.base.margens)) { expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThanOrEqual(3) }
    }
  })
  it('não repete os modelos recentes enquanto houver outro', () => {
    const usados: string[] = []
    for (let i = 0; i < 10; i++) usados.unshift(sortearFormato(i * 7919, usados).id)
    expect(new Set(usados).size).toBe(10)
  })
  it('numera as seções no padrão do modelo, sem numerar endereçamento nem nome da peça', () => {
    const romano = FORMATOS.find(f => f.numeracaoTitulos === 'romano' && !f.paragrafosNumerados)!
    const h = pecaEmHtml(PECA, 'P', null, romano)
    expect(h).toContain('<h2>I – DOS FATOS</h2>')
    expect(h).toContain('<h2>II – DO DIREITO</h2>')
    expect(h).toContain('<h2>III – DOS PEDIDOS</h2>')
    expect(h).toContain('<p class="cx"><b>EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 3ª VARA CÍVEL</b></p>')
    expect(h).toContain(`font-family: '${romano.base.fonte}'`)
    const num = FORMATOS.find(f => f.numeracaoTitulos === 'arabico' && f.paragrafosNumerados)!
    const h2 = pecaEmHtml(PECA, 'P', null, num)
    expect(h2).toContain('<h2>1. DOS FATOS</h2>')
    expect(h2).toContain('<span class="n">1.</span> O réu não pagou.')
    expect(h2).toContain('<span class="n">3.</span> A lei é clara.')
    expect(h2).toContain('<li>a) a manutenção da sentença;</li>')
  })
  it('a formatação da própria pessoa vale por cima do modelo', () => {
    const h = pecaEmHtml('Texto.', 'P', { fonte: 'Verdana' }, FORMATOS[1])
    expect(h).toContain("font-family: 'Verdana'")
  })
  it('sem modelo, continua igual ao padrão de antes', () => {
    expect(pecaEmHtml('I – DOS FATOS\n\nTexto.', 'P')).toContain('<h2>I – DOS FATOS</h2>')
  })
})

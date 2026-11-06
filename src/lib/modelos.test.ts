import { describe, expect, it } from 'vitest'
import { preencherComContrato, preencherModelo } from '@/lib/modelos'

describe('preencherModelo', () => {
  it('troca variáveis entre chaves e o primeiro rótulo com colchetes vazios', () => {
    const r = preencherModelo('Redija contrato para {{cliente}} no processo {{processo}}. Locador: [ ]. Locatário: [ ]. Imóvel: [ ]. Prazo: [ ] meses.', { titulo: 'Locação Lagoa', cliente: 'Maria Silva', numero_processo: '0001234-56.2026.8.19.0001', imovel: 'Av. Epitácio Pessoa, 100', area: 'Imobiliário' })
    expect(r.texto).toContain('para Maria Silva no processo 0001234-56.2026.8.19.0001')
    expect(r.texto).toContain('Locador: Maria Silva. Locatário: [ ]')
    expect(r.texto).toContain('Imóvel: Av. Epitácio Pessoa, 100')
    expect(r.texto).toContain('Prazo: [ ] meses')
    expect(r.texto).toContain('Dados do caso "Locação Lagoa"')
    expect(r.preenchidas.sort()).toEqual(['cliente', 'imovel', 'processo'])
  })
  it('mantém a variável quando o caso não tem o dado', () => {
    expect(preencherModelo('Para {{cliente}} em {{hoje}}', { titulo: 'X' }).texto).toMatch(/^Para \{\{cliente\}\} em \d{2}\/\d{2}\/\d{4}/)
  })

  it('D06: dados do contrato preenchem locador, locatário, imóvel, aluguel, prazo, índice e data; junto com o caso não repete', () => {
    const pedido = 'Redija contrato de locação. Locador: [ ]. Locatário: [ ]. Imóvel: [ ]. Aluguel: R$ [ ]. Prazo: [ ] meses. Reajuste pelo [índice] a partir de [data].'
    const c = preencherComContrato(pedido, { locador: 'João Silva', locatario: 'Loja XYZ Ltda', imovel: 'Av. Paulista 1000', valor: 25000, prazoMeses: 60, garantia: 'Seguro-fiança', indice: 'IPCA', inicio: '2026-01-01', vencimento: '2030-12-31' })
    expect(c.texto).toBe('Redija contrato de locação. Locador: João Silva. Locatário: Loja XYZ Ltda. Imóvel: Av. Paulista 1000. Aluguel: R$ 25.000,00. Prazo: 60 meses. Reajuste pelo IPCA a partir de 31/12/2030. Dados do contrato: garantia Seguro-fiança, início 01/01/2026.')
    expect(c.preenchidas).toEqual(['locador', 'locatário', 'imóvel', 'valor', 'prazo', 'índice', 'data'])
    const r = preencherModelo('Cliente: [ ]. Imóvel: [ ]. Aluguel: R$ [ ].', { titulo: 'Caso 1', cliente: 'Ana' }, { imovel: 'Rua B, 2', valor: 1500 })
    expect(r.texto).toContain('Cliente: Ana. Imóvel: Rua B, 2. Aluguel: R$ 1.500,00.')
    expect(r.preenchidas).toEqual(['imóvel', 'valor', 'cliente'])
  })
})

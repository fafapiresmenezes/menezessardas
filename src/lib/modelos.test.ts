import { describe, expect, it } from 'vitest'
import { preencherModelo } from '@/lib/modelos'

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
})

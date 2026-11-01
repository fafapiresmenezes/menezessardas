// Passo 426: rótulos — nenhum valor cru de banco chega à tela; todo vocabulário tem rótulo em português.
import { describe, it, expect } from 'vitest'
import { rotulosUso, rotulosTipoImovel, rotulosTipoContrato, rotulosGarantia, rotulosIndice, rotulosPeriodicidade, rotulosTipoDocumento, rotulosTipoAlerta, siglaDocumento } from './rotulos'
import { USOS_IMOVEL, TIPOS_IMOVEL, TIPOS_CONTRATO, GARANTIAS, INDICES_REAJUSTE, PERIODICIDADES, TIPOS_DOCUMENTO } from './dominio'

const pares: [string, Record<string, string>, { valor: string }[]][] = [
  ['uso', rotulosUso, USOS_IMOVEL], ['tipo de imóvel', rotulosTipoImovel, TIPOS_IMOVEL], ['tipo de contrato', rotulosTipoContrato, TIPOS_CONTRATO],
  ['garantia', rotulosGarantia, GARANTIAS], ['índice', rotulosIndice, INDICES_REAJUSTE], ['periodicidade', rotulosPeriodicidade, PERIODICIDADES], ['tipo de documento', rotulosTipoDocumento, TIPOS_DOCUMENTO],
]

describe('rótulos', () => {
  it.each(pares)('%s: todo valor do vocabulário tem rótulo legível (sem sublinhado)', (_n, rotulos, opcoes) => {
    for (const o of opcoes) {
      expect(rotulos[o.valor]).toBeTruthy()
      expect(rotulos[o.valor]).not.toMatch(/_/)
    }
    expect(Object.keys(rotulos)).toHaveLength(opcoes.length)
  })
  it('alertas e siglas cobrem todos os tipos', () => {
    expect(Object.keys(rotulosTipoAlerta).sort()).toEqual(['compromisso', 'documento', 'reajuste', 'renovatoria', 'vencimento'])
    for (const d of TIPOS_DOCUMENTO) expect(siglaDocumento[d.valor]).toBeTruthy()
  })
})

// Passo 409: PIX estático (BR Code) — CRC16 e montagem do código "copia e cola".
import { describe, it, expect } from 'vitest'
import { crc16, codigoPix } from './pix'

describe('crc16', () => {
  it('bate com o vetor de teste CCITT-FALSE ("123456789" → 29B1)', () => {
    expect(crc16('123456789')).toBe('29B1')
  })
  it('sempre devolve 4 hexadecimais maiúsculos', () => {
    expect(crc16('')).toMatch(/^[0-9A-F]{4}$/)
    expect(crc16('a')).toMatch(/^[0-9A-F]{4}$/)
  })
})

describe('codigoPix', () => {
  const base = { chave: '10945994000172', nome: 'GMenezes Advogados', cidade: 'Rio de Janeiro' }
  it('começa pelo formato 000201 e termina em 6304 + CRC válido', () => {
    const s = codigoPix(base)
    expect(s.startsWith('000201')).toBe(true)
    const corpo = s.slice(0, -4)
    expect(corpo.endsWith('6304')).toBe(true)
    expect(s.slice(-4)).toBe(crc16(corpo))
  })
  it('inclui a chave, moeda BRL (986), país BR e referência *** quando não há referência', () => {
    const s = codigoPix(base)
    expect(s).toContain('0014br.gov.bcb.pix')
    expect(s).toContain('011410945994000172')
    expect(s).toContain('5303986')
    expect(s).toContain('5802BR')
    expect(s).toContain('62070503***')
  })
  it('inclui o valor com 2 casas só quando positivo', () => {
    expect(codigoPix({ ...base, valor: 1500 })).toContain('54071500.00')
    expect(codigoPix({ ...base, valor: 0 })).not.toContain('54')
    expect(codigoPix(base)).not.toMatch(/54\d{2}\d+\.\d{2}/)
  })
  it('remove acentos e limita nome a 25 e cidade a 15 caracteres', () => {
    const s = codigoPix({ chave: 'x', nome: 'Escritório Jurídico Fátima Menezes Associados', cidade: 'São João de Meriti RJ' })
    expect(s).toContain('5925Escritorio Juridico Fatim')
    expect(s).toContain('6015Sao Joao de Mer')
  })
  it('referência perde espaços e fica em até 25 caracteres', () => {
    const s = codigoPix({ ...base, referencia: 'Honorarios contrato 2026 11 02 extra longo' })
    const m = s.match(/6229(05\d{2}[^]*?)6304/)
    expect(m).toBeTruthy()
    expect(s).toContain('0525Honorarioscontrato2026110')
  })
})

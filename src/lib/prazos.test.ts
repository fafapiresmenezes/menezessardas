import { describe, expect, it } from 'vitest'
import { calcularPrazo, diaUtil, feriados, feriadosDoRio } from './prazos'

// Passo 28: feriados do Rio de Janeiro e datas de expediente suspenso na contagem de prazos.
describe('feriados do Rio de Janeiro', () => {
  it('inclui São Sebastião (20/01) e São Jorge (23/04)', () => {
    expect(feriados(2026).get('2026-01-20')).toMatch(/São Sebastião/) // 20/01 cai no recesso; o feriado continua cadastrado
    expect(diaUtil(new Date('2026-04-23T00:00:00Z'))).toMatch(/São Jorge/)
  })
  it('inclui Dia do Servidor Público (28/10) e N. Sra. da Conceição (08/12)', () => {
    expect(diaUtil(new Date('2026-10-28T00:00:00Z'))).toMatch(/Servidor/)
    expect(diaUtil(new Date('2026-12-08T00:00:00Z'))).toMatch(/Conceição/)
  })
  it('calcula Carnaval e Corpus Christi de 2026 pela Páscoa (05/04/2026)', () => {
    const f = feriados(2026)
    expect(f.get('2026-02-16')).toBe('Carnaval'); expect(f.get('2026-02-17')).toBe('Carnaval')
    expect(f.get('2026-06-04')).toBe('Corpus Christi')
  })
  it('lista os feriados do Rio em ordem', () => {
    const lista = feriadosDoRio(2026)
    expect(lista[0].data).toBe('2026-01-20')
    expect(lista.some(x => x.nome.includes('São Jorge'))).toBe(true)
  })
})

describe('calcularPrazo', () => {
  it('pula o feriado de 28/10 e o fim de semana', () => {
    // Intimação na terça 27/10/2026: 28/10 (feriado), 29 (1), 30 (2), 31 e 01/11 fim de semana, 02/11 Finados, 03/11 (3)
    const r = calcularPrazo('2026-10-27', 3)
    expect(r.final).toBe('2026-11-03')
    expect(r.pulados.map(p => p.data)).toEqual(['2026-10-28', '2026-11-02'])
  })
  it('suspende no recesso forense e retoma em 21/01 pulando São Sebastião', () => {
    const r = calcularPrazo('2026-12-18', 2)
    expect(r.final).toBe('2027-01-22')
  })
  it('prazo em dobro conta o dobro de dias úteis', () => {
    expect(calcularPrazo('2026-03-02', 5, true).diasContados).toBe(10)
  })
})

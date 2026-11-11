import { describe, it, expect } from 'vitest'
import { ATOS_POR_CODIGO, CODIGOS, calcularPrazoPorCodigo, rotuloPrazo, resumoPrazo, type AtoPrazo } from './codigos'
import { ATOS, prazoDoAto } from '@/lib/ferramentas/calculos'

const ato = (id: string) => ATOS_POR_CODIGO.find(a => a.id === id) as AtoPrazo

describe('catálogo de prazos por código', () => {
  it('tem identificadores únicos, base legal e todos os códigos usados existem', () => {
    const ids = ATOS_POR_CODIGO.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of ATOS_POR_CODIGO) { expect(a.base.length).toBeGreaterThan(5); expect(CODIGOS[a.codigo]).toBeTruthy(); expect(a.quantidade).toBeGreaterThan(0) }
    expect(ATOS_POR_CODIGO.length).toBeGreaterThanOrEqual(90)
  })
  it('cada código do menu tem pelo menos um ato', () => {
    for (const c of Object.keys(CODIGOS)) expect(ATOS_POR_CODIGO.some(a => a.codigo === c)).toBe(true)
  })
  it('os prazos do CPC, dos Juizados e da CLT batem com a calculadora antiga (mesmos dias)', () => {
    const mapa: Record<string, string> = { contestacao: 'cpc-contestacao', apelacao: 'cpc-apelacao', 'embargos-declaracao': 'cpc-ed', 'recurso-inominado': 'jec-recurso', 'recurso-ordinario': 'clt-ro', 'ed-clt': 'clt-ed', impugnacao: 'cpc-impugnacao' }
    for (const [velho, novo] of Object.entries(mapa)) {
      const a = ATOS.find(x => x.id === velho)!
      expect(ato(novo).quantidade).toBe(a.dias)
      expect(calcularPrazoPorCodigo(ato(novo), '2026-11-11').final).toBe(prazoDoAto(velho, '2026-11-11').final)
    }
  })
  it('rótulo em português com a unidade certa', () => {
    expect(rotuloPrazo(ato('cpc-apelacao'))).toBe('15 dias úteis')
    expect(rotuloPrazo(ato('cpp-apelacao'))).toBe('5 dias corridos')
    expect(rotuloPrazo(ato('cpp-queixa'))).toBe('6 meses')
    expect(rotuloPrazo(ato('cpc-rescisoria'))).toBe('2 anos')
  })
})

describe('contagem por regime', () => {
  it('CPC: contestação em 15 dias úteis, pulando fim de semana e o feriado de 20/11 (Consciência Negra)', () => {
    const r = calcularPrazoPorCodigo(ato('cpc-contestacao'), '2026-11-11')
    expect(r.final).toBe('2026-12-03')
    expect(r.pulados.some(p => p.data === '2026-11-20')).toBe(true)
  })
  it('CPC: Fazenda tem o dobro (30 dias úteis) e o prazo que já é da Fazenda não dobra de novo', () => {
    expect(calcularPrazoPorCodigo(ato('cpc-apelacao'), '2026-11-11', 'fazenda').quantidade).toBe(30)
    const r = calcularPrazoPorCodigo(ato('cpc-embargos-fazenda'), '2026-11-11', 'fazenda')
    expect(r.quantidade).toBe(30)
    expect(r.avisos.some(a => /não admite prazo em dobro/.test(a))).toBe(true)
  })
  it('CPP: dias corridos; apelação em 5 dias e vencimento em domingo passa para a segunda', () => {
    expect(calcularPrazoPorCodigo(ato('cpp-apelacao'), '2026-11-11').final).toBe('2026-11-16')
    // 10/11 + 5 = 15/11 (domingo e Proclamação da República) -> segunda 16/11
    const r = calcularPrazoPorCodigo(ato('cpp-apelacao'), '2026-11-10')
    expect(r.final).toBe('2026-11-16'); expect(r.prorrogado).toBe(true); expect(r.diaSemana).toBe('segunda-feira')
  })
  it('CPP: o prazo penal não admite prazo em dobro', () => {
    const r = calcularPrazoPorCodigo(ato('cpp-apelacao'), '2026-11-11', 'fazenda')
    expect(r.quantidade).toBe(5)
  })
  it('ECA: 10 dias corridos de uma quarta caem no sábado e passam para a segunda, sem dobro', () => {
    const r = calcularPrazoPorCodigo(ato('eca-apelacao'), '2026-11-11', 'mp')
    expect(r.quantidade).toBe(10); expect(r.final).toBe('2026-11-23')
  })
  it('mandado de segurança: 120 dias corridos de decadência', () => {
    expect(calcularPrazoPorCodigo(ato('ms-impetracao'), '2026-06-01').final).toBe('2026-09-29')
  })
  it('meses e anos de data a data, com prorrogação para o dia útil', () => {
    expect(calcularPrazoPorCodigo(ato('cpp-queixa'), '2026-05-10').final).toBe('2026-11-10')
    const r = calcularPrazoPorCodigo(ato('cpc-rescisoria'), '2026-11-11')
    expect(r.final).toBe('2028-11-13'); expect(r.prorrogado).toBe(true)
  })
  it('prazo impróprio e nota do ato aparecem como aviso', () => {
    expect(calcularPrazoPorCodigo(ato('cpc-juiz-sentenca'), '2026-11-11').avisos.join(' ')).toMatch(/impróprio/)
    expect(calcularPrazoPorCodigo(ato('clt-prescricao-bienal'), '2026-11-11').avisos.join(' ')).toMatch(/5 anos/)
  })
  it('CLT com Fazenda avisa do Decreto-Lei 779/69', () => {
    expect(calcularPrazoPorCodigo(ato('clt-ro'), '2026-11-11', 'fazenda').avisos.join(' ')).toMatch(/779/)
  })
  it('resumo para copiar', () => {
    const a = ato('cpc-apelacao'); const r = calcularPrazoPorCodigo(a, '2026-11-11')
    expect(resumoPrazo(a, '2026-11-11', r)).toContain('Apelação (CPC)')
    expect(resumoPrazo(a, '2026-11-11', r)).toContain('Base: CPC, art. 1.003, § 5º')
  })
})

// Habilidade 4 do replanejamento de mercado (14/11/2026): funil de vendas do Instituto.
import { describe, it, expect } from 'vitest'
import { FAMILIAS } from '@/data/caderno-familias'
import {
  ETAPAS_FUNIL_INSTITUTO,
  conversaoPorFamilia,
  etapaComMaisAtrito,
  type RegistroDeFunil,
} from '@/data/funil-instituto'

const registros: RegistroDeFunil[] = [
  { familia: 'dados-seguranca', etapa: 'contato', quando: '2026-11-01' },
  { familia: 'dados-seguranca', etapa: 'contato', quando: '2026-11-01' },
  { familia: 'dados-seguranca', etapa: 'diagnostico_de_entrada', quando: '2026-11-03' },
  { familia: 'dados-seguranca', etapa: 'proposta_enviada', quando: '2026-11-05' },
  { familia: 'bancos', etapa: 'contato', quando: '2026-11-02' },
]

describe('funil de vendas do Instituto (habilidade 4)', () => {
  it('a ordem do funil vai do contato ao contrato anual, sem repetir etapa', () => {
    expect(new Set(ETAPAS_FUNIL_INSTITUTO).size).toBe(ETAPAS_FUNIL_INSTITUTO.length)
    expect(ETAPAS_FUNIL_INSTITUTO[0]).toBe('contato')
    expect(ETAPAS_FUNIL_INSTITUTO[ETAPAS_FUNIL_INSTITUTO.length - 1]).toBe('contrato_anual')
  })

  it('calcula conversão por família sem misturar uma família com outra', () => {
    const resultado = conversaoPorFamilia(registros)
    expect(resultado.length).toBe(FAMILIAS.length)
    const dadosSeguranca = resultado.find(r => r.familia === 'dados-seguranca')!
    const contato = dadosSeguranca.etapas.find(e => e.etapa === 'contato')!
    expect(contato.chegou).toBe(4) // funil acumulado: os 4 registros chegaram pelo menos ao contato
    const bancos = resultado.find(r => r.familia === 'bancos')!
    expect(bancos.etapas.find(e => e.etapa === 'contato')!.chegou).toBe(1)
    expect(bancos.etapas.find(e => e.etapa === 'proposta_enviada')!.chegou).toBe(0)
  })

  it('toda conversão fica entre 0 e 1, ou null quando não há base de comparação', () => {
    const resultado = conversaoPorFamilia(registros)
    for (const familia of resultado) {
      for (const etapa of familia.etapas) {
        if (etapa.conversaoDaEtapaAnterior !== null) {
          expect(etapa.conversaoDaEtapaAnterior).toBeGreaterThanOrEqual(0)
          expect(etapa.conversaoDaEtapaAnterior).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('aponta a etapa de mais atrito só quando há dados, nunca inventa um número sem base', () => {
    expect(etapaComMaisAtrito('dados-seguranca', registros)).not.toBeNull()
    expect(etapaComMaisAtrito('cursos-estudos', registros)).toBeNull()
  })
})

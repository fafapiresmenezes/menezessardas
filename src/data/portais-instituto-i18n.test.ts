// Passo V6: cada uma das oito portas do Instituto existe inteira nas quatro línguas. Este teste
// conta as chaves e garante que nenhuma porta fique só em português (o que apareceria como texto
// português na tela em chinês). Falha se alguém acrescentar uma porta sem traduzir.
import { describe, it, expect } from 'vitest'
import { PORTAIS_INSTITUTO, type EstadoPortal } from '@/data/portais-instituto'
import {
  PORTAIS_I18N,
  ROTULO_ESTADO_I18N,
  EXPLICACAO_ESTADO_I18N,
} from '@/data/portais-instituto-i18n'

const LINGUAS = ['pt', 'en', 'zh', 'es'] as const
const ESTADOS: EstadoPortal[] = ['estudo', 'prototipo', 'piloto']

describe('portais do Instituto nas quatro línguas (V6)', () => {
  it('toda porta de PORTAIS_INSTITUTO tem tradução, e não sobra tradução órfã', () => {
    const rotasDados = PORTAIS_INSTITUTO.map(p => p.rota).sort()
    const rotasI18n = Object.keys(PORTAIS_I18N).sort()
    expect(rotasI18n).toEqual(rotasDados)
    expect(rotasDados.length).toBe(8)
  })

  it('cada porta abre inteira nas quatro línguas, sem campo vazio', () => {
    for (const p of PORTAIS_INSTITUTO) {
      const porRota = PORTAIS_I18N[p.rota as keyof typeof PORTAIS_I18N]
      expect(porRota, `faltou tradução de ${p.rota}`).toBeTruthy()
      expect(Object.keys(porRota).sort()).toEqual([...LINGUAS].sort())
      for (const lingua of LINGUAS) {
        const t = porRota[lingua]
        expect(t.nome.trim().length, `${p.rota} ${lingua} nome`).toBeGreaterThan(0)
        expect(t.resumo.trim().length, `${p.rota} ${lingua} resumo`).toBeGreaterThan(0)
        expect(t.comoEsta.trim().length, `${p.rota} ${lingua} comoEsta`).toBeGreaterThan(0)
        expect(t.escopo.length, `${p.rota} ${lingua} escopo`).toBeGreaterThan(0)
        for (const item of t.escopo) expect(item.trim().length).toBeGreaterThan(0)
      }
      // O escopo tem o mesmo número de itens em todas as línguas (espelho do português).
      const nPt = porRota.pt.escopo.length
      for (const lingua of LINGUAS) {
        expect(porRota[lingua].escopo.length, `${p.rota} ${lingua} tamanho do escopo`).toBe(nPt)
      }
    }
  })

  it('o rótulo e a explicação de cada estado existem nas quatro línguas', () => {
    for (const lingua of LINGUAS) {
      for (const estado of ESTADOS) {
        expect(ROTULO_ESTADO_I18N[lingua][estado].trim().length).toBeGreaterThan(0)
        expect(EXPLICACAO_ESTADO_I18N[lingua][estado].trim().length).toBeGreaterThan(0)
      }
    }
  })
})

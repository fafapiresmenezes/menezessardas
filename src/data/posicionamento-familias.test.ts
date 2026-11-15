// Habilidade 2 do replanejamento de mercado (14/11/2026): posicionamento de marca por família.
import { describe, it, expect } from 'vitest'
import { FAMILIAS } from '@/data/caderno-familias'
import {
  POSICIONAMENTO_FAMILIAS,
  posicionamentoDaFamilia,
  familiaTemFichaDeProva,
} from '@/data/posicionamento-familias'

describe('posicionamento de marca das 6 famílias (habilidade 2)', () => {
  it('toda família tem mensagem central, diferencial, prova exigida e o que nunca dizer', () => {
    expect(POSICIONAMENTO_FAMILIAS.length).toBe(FAMILIAS.length)
    for (const f of FAMILIAS) {
      const p = posicionamentoDaFamilia(f.id)
      expect(p.mensagemCentral.length, f.nome).toBeGreaterThan(0)
      expect(p.diferencial.length, f.nome).toBeGreaterThan(0)
      expect(p.provaExigida.length, f.nome).toBeGreaterThan(0)
      expect(p.nuncaDizer.length, f.nome).toBeGreaterThan(0)
    }
  })

  it('nenhuma mensagem central é repetida entre famílias (sinal de texto genérico)', () => {
    const mensagens = POSICIONAMENTO_FAMILIAS.map(p => p.mensagemCentral)
    expect(new Set(mensagens).size).toBe(mensagens.length)
  })

  it('nenhuma mensagem central promete número, garantia ou urgência inventada', () => {
    const proibidas = /garant|zero risco|aprovação garantida|última chance|só hoje/i
    for (const p of POSICIONAMENTO_FAMILIAS) {
      expect(p.mensagemCentral, p.familia).not.toMatch(proibidas)
      expect(p.diferencial, p.familia).not.toMatch(proibidas)
    }
  })

  it('toda família com posicionamento tem ao menos uma ficha real do caderno como prova possível', () => {
    for (const f of FAMILIAS) {
      expect(familiaTemFichaDeProva(f.id), f.nome).toBe(true)
    }
  })
})

// Erro #9 do planejamento: os preços dos serviços viajavam no JS público inicial. A correção tirou
// o campo "preco" de produtos.ts (módulo que a vitrine pública importa) e levou os valores para
// precos-caderno.ts, que só a tela do caderno (atrás de senha, sob demanda) importa.
// Este teste trava a volta: nenhum preço pode reaparecer no módulo público.
import { describe, it, expect } from 'vitest'
import { PRODUTOS } from '@/data/produtos'
import { PRECOS_CADERNO } from '@/data/precos-caderno'

describe('preço fora do módulo público (erro #9)', () => {
  it('nenhum produto do catálogo público tem campo de preço', () => {
    for (const p of PRODUTOS) {
      expect(p, `produto ${p.numero}`).not.toHaveProperty('preco')
    }
  })

  it('o módulo público não contém nenhum valor em reais', () => {
    expect(JSON.stringify(PRODUTOS)).not.toMatch(/R\$/)
  })

  it('há um preço para cada um dos 21 produtos, só no módulo do caderno', () => {
    expect(PRODUTOS.length).toBe(21)
    for (const p of PRODUTOS) {
      expect(PRECOS_CADERNO[p.numero], `preço do produto ${p.numero}`).toMatch(/R\$/)
    }
  })
})
